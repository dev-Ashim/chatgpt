// Vite falls back to 5174, 5175, ... when 5173 is busy, so allow any localhost port.
// Add deployed frontend URLs via CLIENT_URL (comma-separated).
const extraOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

function allowedOrigin(origin, callback) {
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
    if (!origin || isLocalhost || extraOrigins.includes(origin)) {
        return callback(null, true)
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`))
}

module.exports = allowedOrigin
