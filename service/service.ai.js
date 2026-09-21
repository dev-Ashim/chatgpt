const  { GoogleGenAI }=require('@google/genai')

const ai = new GoogleGenAI({});

async function generateResponse(content) {
    const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: content
    });

    return interaction.output_text;
}

async function createEmbedding(content) {
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: content, 
        config: { outputDimensionality: 768 },
    });
    
    return response.embeddings[0].values;
}

module.exports = {generateResponse,createEmbedding};