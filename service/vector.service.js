const { Pinecone } = require('@pinecone-database/pinecone')

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const chatGptIndex=pc.Index('chat-gpt')
async function createMemory({vectors,metadata,messageId}) {

    await chatGptIndex.upsert([{
        id: messageId,
        values: vectors,
        metadata
    }])   
}

async function queryMemory({quervector,limit=5,metadata}){
    const data=await chatGptIndex.query({
        vector: quervector,
        topK: limit,
        filter: metadata?{metadata}:undefined,
        includeValues: true,
    })
    return data.matches

}


module.exports = {createMemory,queryMemory}