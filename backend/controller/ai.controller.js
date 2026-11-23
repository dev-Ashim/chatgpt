const { toFile } = require('openai')
const { clients, MODELS, DEFAULT_MODEL } = require('../service/providers')

const EXTENSIONS = { 'audio/webm': 'webm', 'video/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }

function listModels(req, res) {
    return res.status(200).json({
        defaultModel: DEFAULT_MODEL,
        models: MODELS.map(({ id, label, vision }) => ({ id, label, vision })),
    })
}

// Speech-to-text with Groq Whisper
async function transcribe(req, res) {
    if (!clients.groq) {
        return res.status(503).json({ message: 'Voice input is not configured (GROQ_API_KEY missing).' })
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: 'No audio received.' })
    }

    const mimeType = (req.headers['content-type'] || 'audio/webm').split(';')[0]
    const extension = EXTENSIONS[mimeType] || 'webm'

    try {
        const result = await clients.groq.audio.transcriptions.create({
            file: await toFile(req.body, `voice.${extension}`, { type: mimeType }),
            model: 'whisper-large-v3-turbo',
            response_format: 'json',
            // Vocabulary hint so Whisper spells app-specific words right
            prompt: 'Azreal, AZREAL',
        })
        return res.status(200).json({ text: (result.text || '').trim() })
    } catch (err) {
        console.error('transcription failed:', err.status || '', err.message)
        const status = err.status === 429 ? 429 : 502
        return res.status(status).json({
            message: status === 429 ? 'Voice limit reached. Try again in a minute.' : "Couldn't transcribe that. Please try again.",
        })
    }
}

module.exports = { listModels, transcribe }
