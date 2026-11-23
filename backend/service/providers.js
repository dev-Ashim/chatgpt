const { OpenAI } = require('openai')

// Groq and OpenRouter both speak the OpenAI API, so one SDK covers both
const groq = process.env.GROQ_API_KEY
    ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
    : null

const openrouter = process.env.OPENROUTER_API_KEY
    ? new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: { 'X-Title': 'AZREAL' },
    })
    : null

const clients = { groq, openrouter }

// Models shown in the picker. `vision` = can read images sent with a message.
// Only Gemini reads PDFs directly.
const MODELS = [
    { id: 'gemini', label: 'Gemini 3.5 Flash Lite', provider: 'gemini', model: 'gemini-3.5-flash-lite', vision: true },
    { id: 'groq-gpt-oss', label: 'GPT-OSS 120B (Groq)', provider: 'groq', model: 'openai/gpt-oss-120b', vision: false },
    { id: 'groq-qwen', label: 'Qwen 3.8 27B (Groq)', provider: 'groq', model: 'qwen/qwen3.8-27b', vision: false },
    { id: 'or-nemotron', label: 'Nemotron 3.5 VL (OpenRouter)', provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free', vision: true },
    { id: 'or-gemma', label: 'Gemma 4 31B (OpenRouter)', provider: 'openrouter', model: 'google/gemma-4-31b-it:free', vision: true },
].filter((m) => m.provider === 'gemini' || clients[m.provider])

const DEFAULT_MODEL = 'gemini'

// Tried in this order after the chosen model fails
const FALLBACK_ORDER = ['gemini', 'groq-gpt-oss', 'or-nemotron', 'groq-qwen']

function findModel(id) {
    return MODELS.find((m) => m.id === id) || MODELS.find((m) => m.id === DEFAULT_MODEL)
}

// Chosen model first, then the fallbacks, without repeats
function modelChain(id) {
    const first = findModel(id)
    const rest = FALLBACK_ORDER.map((fid) => MODELS.find((m) => m.id === fid)).filter(Boolean)
    return [first, ...rest.filter((m) => m.id !== first.id)]
}

module.exports = { clients, MODELS, DEFAULT_MODEL, findModel, modelChain }
