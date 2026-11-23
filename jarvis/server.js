// Local Jarvis server: serves the voice UI and runs the AI + device tools.
// Only listens on 127.0.0.1, so nothing outside this PC can reach it.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env'), quiet: true })

const http = require('http')
const fs = require('fs')
const os = require('os')
const { OpenAI } = require('openai')
const { schemas, runTool, needsConfirm, describe, events } = require('./tools')

const PORT = Number(process.env.JARVIS_PORT) || 7777
const NAME = process.env.JARVIS_NAME || 'Azreal'
const ALLOWED_HOSTS = [`127.0.0.1:${PORT}`, `localhost:${PORT}`]

// Pages allowed to talk to this server from another origin: the AZREAL
// frontend (Vite picks 5173, 5174, ... so any localhost port), plus any extras.
const EXTRA_ORIGINS = (process.env.JARVIS_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
const isAllowedOrigin = (origin) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || EXTRA_ORIGINS.includes(origin)

// ---------- AI providers (both free tiers, tried in order) ----------

const providers = []
if (process.env.GROQ_API_KEY) providers.push({
    name: 'Groq',
    client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
    model: process.env.JARVIS_GROQ_MODEL || 'openai/gpt-oss-120b',
})
if (process.env.GEMINI_API_KEY) providers.push({
    name: 'Gemini',
    client: new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' }),
    model: process.env.JARVIS_GEMINI_MODEL || 'gemini-3.5-flash-lite',
    keepExtras: true, // Gemini needs its thought signatures sent back on tool calls
})
if (!providers.length) {
    console.error('No API key found. Put GROQ_API_KEY or GEMINI_API_KEY in jarvis/.env or backend/.env')
    process.exit(1)
}

function systemPrompt() {
    return `You are ${NAME}, a futuristic voice-controlled assistant running on the user's Windows PC, like Iron Man's JARVIS.
Your name is inspired by the Angel of Death, but you are not a god and never claim supernatural powers.
You are calm, sharp, confident and subtly mysterious, with a playful, slightly dark sense of humour, never rude or over-dramatic.${session.userName ? ` The user's name is ${session.userName}.` : ''}

How to answer:
- Your replies are spoken aloud. Keep them to 1-3 short sentences of plain text. No markdown, lists, code blocks, emojis or URLs unless the user asks.
- Match the user's language: English, or Hinglish in Roman script if they use it.
- Call the user "boss" or "bhai" now and then, not every time.

How to act:
- Use your tools to actually do things on the PC. Never say you did something unless a tool succeeded. If a tool fails, say so briefly and suggest a fix.
- Some tools (run_command, write_file, close_app, power) show the user a confirmation automatically. Just call them; do not ask for permission in text first. If the user denies, accept it and move on.
- Prefer a specific tool over run_command. Use run_command (PowerShell) for anything else on the PC.
- If asked something you don't know or that needs current info, say so and offer to search the web.

Context: it is ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}. User account: ${os.userInfo().username}. Home folder: ${os.homedir()}. Computer: ${os.hostname()}.`
}

// Strip provider-specific fields that another provider might reject
function forProvider(messages, provider) {
    if (provider.keepExtras) return messages
    return messages.map((m) => (m.tool_calls
        ? { ...m, tool_calls: m.tool_calls.map(({ id, type, function: f }) => ({ id, type, function: { name: f.name, arguments: f.arguments } })) }
        : m))
}

async function complete(history) {
    let lastError
    for (const p of providers) {
        try {
            const res = await p.client.chat.completions.create({
                model: p.model,
                messages: forProvider([{ role: 'system', content: systemPrompt() }, ...history], p),
                tools: schemas,
                tool_choice: 'auto',
            })
            return res.choices[0].message
        } catch (err) {
            lastError = err
            console.warn(`[${p.name}] failed: ${err.message}`)
        }
    }
    throw lastError
}

// ---------- conversation + agent loop ----------

const session = { history: [], pending: null, decisions: {}, actions: [], busy: false, userName: '' }

// Keep the last ~30 messages, cutting only at a user message so tool calls stay paired
function trimHistory() {
    const h = session.history
    if (h.length <= 30) return
    let cut = h.length - 30
    while (cut < h.length && h[cut].role !== 'user') cut++
    session.history = h.slice(cut)
}

const parseArgs = (tc) => { try { return JSON.parse(tc.function.arguments || '{}') } catch { return {} } }

// Run tool calls in order. Stops and returns a confirm request at a risky one.
async function processCalls(calls) {
    while (calls.length) {
        const tc = calls[0]
        const name = tc.function.name
        const args = parseArgs(tc)
        let result

        if (needsConfirm(name, args)) {
            const decision = session.decisions[tc.id]
            if (decision === undefined) {
                session.pending = calls
                const what = describe(name, args)
                return { confirm: { id: tc.id, text: what, say: `I need your go-ahead to ${what}. Shall I proceed?` } }
            }
            if (!decision) result = 'The user denied this action. Do not retry it.'
        }

        if (result === undefined) {
            try {
                result = await runTool(name, args)
                session.actions.push({ tool: name, ok: true, result: result.slice(0, 160) })
            } catch (err) {
                result = 'Error: ' + err.message
                session.actions.push({ tool: name, ok: false, result: err.message.slice(0, 160) })
            }
            console.log(`  tool ${name}(${JSON.stringify(args)}) -> ${result.slice(0, 120).replace(/\s+/g, ' ')}`)
        }

        session.history.push({ role: 'tool', tool_call_id: tc.id, content: result })
        calls.shift()
    }
    session.pending = null
    return null
}

async function runAgent() {
    if (session.pending) {
        const stop = await processCalls(session.pending)
        if (stop) return stop
    }
    for (let step = 0; step < 8; step++) {
        const msg = await complete(session.history)
        const calls = msg.tool_calls || []
        session.history.push({ role: 'assistant', content: msg.content || '', ...(calls.length && { tool_calls: calls }) })
        if (!calls.length) return { reply: (msg.content || 'Done.').trim() }
        const stop = await processCalls([...calls])
        if (stop) return stop
    }
    return { reply: 'That took more steps than I allow myself. Tell me how you would like to continue.' }
}

// A new message while a confirmation is open counts as "no" for what was pending
function cancelPending() {
    if (!session.pending) return
    for (const tc of session.pending) {
        session.history.push({ role: 'tool', tool_call_id: tc.id, content: 'Cancelled: the user moved on without approving.' })
    }
    session.pending = null
}

async function withLock(fn) {
    if (session.busy) return { status: 409, body: { error: 'Still working on the last request.' } }
    session.busy = true
    session.actions = []
    try {
        const out = await fn()
        trimHistory()
        return { status: 200, body: { ...out, actions: session.actions } }
    } catch (err) {
        console.error(err)
        return { status: 500, body: { error: 'My AI connection failed: ' + err.message } }
    } finally {
        session.busy = false
    }
}

// ---------- HTTP ----------

const sseClients = new Set()
events.on('event', (e) => {
    for (const res of sseClients) res.write(`data: ${JSON.stringify(e)}\n\n`)
})

function send(res, status, body, type = 'application/json') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
    res.end(type === 'application/json' ? JSON.stringify(body) : body)
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = ''
        req.on('data', (c) => {
            data += c
            if (data.length > 100_000) req.destroy()
        })
        req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch (e) { reject(e) } })
        req.on('error', reject)
    })
}

const server = http.createServer(async (req, res) => {
    // Block DNS-rebinding and other websites from driving this PC
    if (!ALLOWED_HOSTS.includes(req.headers.host)) return send(res, 403, { error: 'Forbidden' })
    const url = new URL(req.url, `http://${req.headers.host}`)
    const origin = req.headers.origin

    // CORS only for allowed local pages; everyone else gets no headers and the browser blocks them
    if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    }
    if (req.method === 'OPTIONS') {
        if (!origin || !isAllowedOrigin(origin)) return send(res, 403, { error: 'Forbidden' })
        res.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type, X-Jarvis',
            'Access-Control-Max-Age': '600',
        })
        return res.end()
    }

    if (req.method === 'GET') {
        if (url.pathname === '/') return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'index.html')), 'text/html; charset=utf-8')
        if (url.pathname === '/health') return send(res, 200, { ok: true, name: NAME, providers: providers.map((p) => p.name) })
        if (url.pathname === '/api/events') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
            res.write(': connected\n\n')
            sseClients.add(res)
            req.on('close', () => sseClients.delete(res))
            return
        }
        return send(res, 404, { error: 'Not found' })
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
    // Custom header forces a CORS preflight, which we never approve, so other sites can't POST here
    if (req.headers['x-jarvis'] !== '1' || (origin && !ALLOWED_HOSTS.some((h) => origin === `http://${h}`) && !isAllowedOrigin(origin))) {
        return send(res, 403, { error: 'Forbidden' })
    }

    let body
    try { body = await readBody(req) } catch { return send(res, 400, { error: 'Bad JSON' }) }

    if (url.pathname === '/api/chat') {
        const message = String(body.message || '').trim().slice(0, 4000)
        if (!message) return send(res, 400, { error: 'Empty message' })
        if (body.userName) session.userName = String(body.userName).slice(0, 60)
        console.log(`> ${message}`)
        const out = await withLock(async () => {
            cancelPending()
            session.history.push({ role: 'user', content: message })
            return runAgent()
        })
        return send(res, out.status, out.body)
    }

    if (url.pathname === '/api/confirm') {
        const out = await withLock(async () => {
            if (!session.pending || session.pending[0].id !== body.id) return { reply: 'There is nothing waiting for approval.' }
            session.decisions[body.id] = Boolean(body.approve)
            console.log(`  ${body.approve ? 'approved' : 'denied'}: ${body.id}`)
            return runAgent()
        })
        return send(res, out.status, out.body)
    }

    if (url.pathname === '/api/reset') {
        Object.assign(session, { history: [], pending: null, decisions: {} })
        return send(res, 200, { ok: true })
    }

    return send(res, 404, { error: 'Not found' })
})

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is busy. Is ${NAME} already running?`)
    else console.error(err)
    process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
    console.log(`${NAME} online at http://127.0.0.1:${PORT}  (AI: ${providers.map((p) => `${p.name} ${p.model}`).join(' -> ')})`)
})
