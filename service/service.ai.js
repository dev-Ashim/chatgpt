const  { GoogleGenAI }=require('@google/genai')

const ai = new GoogleGenAI({});

async function generateResponse(content) {
    const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: content
    });

    return interaction.output_text;
}

module.exports = {generateResponse};