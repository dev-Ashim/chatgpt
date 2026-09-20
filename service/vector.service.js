const { Pinecone } = require('@pinecone-database/pinecone')

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const assistant = await pc.createAssistant({
  name: 'example-assistant',
  instructions: 'Use American English for spelling and grammar.', // Description or directive for the assistant to apply to all responses.
  region: 'us'
});