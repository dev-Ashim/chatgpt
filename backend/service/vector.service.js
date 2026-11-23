const { Pinecone } = require('@pinecone-database/pinecone')

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const chatGptIndex = pc.Index('chat-gpt')

async function createMemory({ vectors, metadata, messageId }) {
    await chatGptIndex.upsert({
        records: [{
            id: String(messageId),
            values: vectors,
            metadata
        }]
    })
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
    const data = await chatGptIndex.query({
        vector: queryVector,
        topK: limit,
        filter: metadata,
        includeValues: false,
        includeMetadata: true
    })
    return data.matches
}

// Pinecone accepts at most 1000 ids per delete request
async function deleteMemories(ids) {
    const stringIds = ids.map(String)
    for (let i = 0; i < stringIds.length; i += 1000) {
        await chatGptIndex.deleteMany({ ids: stringIds.slice(i, i + 1000) })
    }
}

module.exports = { createMemory, queryMemory, deleteMemories }
