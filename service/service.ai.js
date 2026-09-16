const OpenAI = require("openai");

const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY
});

 async function generateResponse(content) {
    console.log("Service received:", content);

    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            {
                role: "user",
                content: content
            }
        ],
        model: "deepseek-chat",
        stream: false
    });

    return completion.choices[0].message.content;
}

module.exports = generateResponse;