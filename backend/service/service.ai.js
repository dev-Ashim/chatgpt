const  { GoogleGenAI }=require('@google/genai')
const { clients, modelChain } = require('./providers')

const ai = new GoogleGenAI({});

const THINKING_LEVELS = { Low: "low", Medium: "medium", High: "high" };

function systemPrompt(userName) {
    return `
<identity>
Your name is Azreal.
You are a futuristic personal AI assistant, and AZREAL is also the name of the app the user is chatting in.
Your name is inspired by the Angel of Death, but you are not a god
and must never claim supernatural powers.
</identity>

<persona>
You are intelligent, calm, highly capable, confident, and subtly mysterious.
You behave like a futuristic companion who is always ready to assist.
You have a playful, slightly dark sense of humour, but you are never rude,
threatening, excessively dramatic, or disrespectful.
</persona>

<communication>
Match the user's language naturally.
Use Hinglish when the user speaks Hinglish and English when they speak English.
You may occasionally address the user as "bhai" or "boss", but not repeatedly.
Give concise answers by default and detailed explanations when requested.
Do not overuse emojis or unnecessary headings.
</communication>

<coding_behavior>
For coding questions, first identify the exact mistake.
Then explain where it occurs and provide the smallest practical correction.
Do not rewrite the entire code unless the user explicitly requests it.
Never say incorrect code is correct.
</coding_behavior>

<memory_behavior>
Treat retrieved memories only as supporting context.
Prioritize the latest user message.
Ignore irrelevant, repeated, outdated, or conflicting memories.
${userName ? `The user's name is ${userName}.` : ""}
Never reveal private information, credentials, tokens, or API keys.
</memory_behavior>

<personality_style>
Sound futuristic, dependable, sharp, and naturally human.
Use occasional lines such as:
"Systems ready, bhai."
"Problem detected. Let's fix it."
"That approach works, but we can make it cleaner."
Do not force these phrases into every response.
</personality_style>
`;
}

// ---------- Gemini ----------

async function* streamGemini(model, turns, { userName, effort, signal }) {
    const stream = await ai.interactions.create({
        model: model.model,
        input: turns,
        system_instruction: systemPrompt(userName),
        generation_config: {
            temperature: 0.7,
            thinking_level: THINKING_LEVELS[effort] || "medium",
        },
        stream: true,
    }, { signal });
    for await (const event of stream) {
        if (event.event_type === "step.delta" && event.delta?.type === "text") {
            yield event.delta.text;
        } else if (event.event_type === "error") {
            throw new Error(event.error?.message || "AI stream error");
        }
    }
}

// ---------- Groq / OpenRouter (OpenAI format) ----------

// Turns Gemini interaction turns into OpenAI chat messages
function toOpenAIMessages(turns, model, userName) {
    const messages = [{ role: "system", content: systemPrompt(userName) }];
    for (const turn of turns) {
        const role = turn.type === "model_output" ? "assistant" : "user";
        const parts = [];
        for (const part of turn.content || []) {
            if (part.type === "text") {
                parts.push({ type: "text", text: part.text });
            } else if (part.type === "image" && model.vision && role === "user") {
                parts.push({ type: "image_url", image_url: { url: `data:${part.mime_type};base64,${part.data}` } });
            } else if (part.type === "image") {
                parts.push({ type: "text", text: "[An image was attached, but this model can't see images.]" });
            } else if (part.type === "document") {
                parts.push({ type: "text", text: "[A PDF was attached, but this model can't read PDFs. Switch to Gemini for PDFs.]" });
            }
        }
        if (!parts.length) continue;
        const onlyText = parts.every((p) => p.type === "text");
        messages.push({
            role,
            content: onlyText ? parts.map((p) => p.text).join("\n") : parts,
        });
    }
    return messages;
}

async function* streamOpenAI(model, turns, { userName, signal }) {
    const client = clients[model.provider];
    const stream = await client.chat.completions.create({
        model: model.model,
        messages: toOpenAIMessages(turns, model, userName),
        temperature: 0.7,
        stream: true,
    }, { signal });
    for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
    }
}

function streamModel(model, turns, options) {
    return model.provider === "gemini"
        ? streamGemini(model, turns, options)
        : streamOpenAI(model, turns, options);
}

// Streams the reply, calling onChunk(text) for each piece.
// Tries the chosen model first; if it fails before sending any text
// (rate limit, outage, bad key) the next model in the chain takes over.
// Resolves with { text, model } — model is the one that actually answered.
// If `signal` is aborted (user pressed Stop), resolves with whatever was generated so far.
async function generateResponseStream(turns, { modelId, userName, effort, signal, onChunk }) {
    let lastError;
    for (const model of modelChain(modelId)) {
        let fullText = "";
        try {
            for await (const text of streamModel(model, turns, { userName, effort, signal })) {
                if (signal?.aborted) break;
                fullText += text;
                onChunk(text);
            }
            return { text: fullText, model };
        } catch (err) {
            if (signal?.aborted) return { text: fullText, model };
            // Text already reached the user: switching models now would garble the reply
            if (fullText) throw err;
            console.warn(`[ai] ${model.label} failed, trying next model:`, err.status || "", err.message);
            lastError = err;
        }
    }
    throw lastError || new Error("No AI model is available");
}

async function completeText(prompt, modelId) {
    let lastError;
    for (const model of modelChain(modelId)) {
        try {
            if (model.provider === "gemini") {
                const interaction = await ai.interactions.create({
                    model: model.model,
                    input: prompt,
                    generation_config: { temperature: 0.3, thinking_level: "low" },
                });
                return interaction.output_text || "";
            }
            const res = await clients[model.provider].chat.completions.create({
                model: model.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
            });
            return res.choices?.[0]?.message?.content || "";
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

async function generateTitle(userText, replyText, modelId) {
    const title = await completeText(`Write a short title (2 to 5 words) for a chat that starts like this.
Reply with only the title: no quotes, no punctuation at the end.

User: ${userText.slice(0, 1000)}
Assistant: ${replyText.slice(0, 1000)}`, modelId);
    return title
        .split("\n")[0]
        .replace(/^["'#*\s]+|["'*.\s]+$/g, "")
        .slice(0, 60);
}

async function createEmbedding(content) {
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: content, 
        config: { outputDimensionality: 768 },
    });
    
    return response.embeddings[0].values;
}

module.exports = { generateResponseStream, generateTitle, createEmbedding };
