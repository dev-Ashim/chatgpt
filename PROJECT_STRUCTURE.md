# Project Structure

```
chatgpt/
├── backend/    → Express + Socket.IO API (auth, chats, AI replies, memory)
├── frontend/   → React + Vite chat UI (AZREAL)
└── jarvis/     → Local voice desktop assistant that controls this PC
```

---

## 1. `backend/` — Node.js API server

**Stack:** Express 5, Socket.IO, MongoDB (Mongoose), Pinecone (vector memory), Gemini / Groq / OpenRouter, JWT + bcrypt.
**Run:** `npm run dev` → `http://localhost:3000`

```
backend/
├── server.js                    # Entry: creates HTTP server, starts Socket.IO, connects DB, listens on :3000
├── package.json
├── .env / .env.example          # MONGODB_URL, JWT_SECRET_KEY, API keys
├── src/
│   ├── app.js                   # Express app: JSON, cookies, CORS, mounts all routes
│   └── allowedOrigin.js         # CORS origin list (shared with sockets)
├── db/
│   └── db.js                    # MongoDB connection
├── middleware/
│   └── auth.middelware.js       # authUser – verifies JWT cookie, attaches req.user
├── models/
│   ├── user.model.js            # User schema
│   ├── chat.model.js            # Chat (title, owner)
│   └── message.model.js         # Message (chat, role, content, attachments, forgotten flag)
├── router/
│   ├── auth.routes.js           # /api/auth
│   ├── chat.routes.js           # /api/chat
│   ├── memory.routes.js         # /api/memories
│   └── ai.routes.js             # /api/ai
├── controller/
│   ├── auth.controller.js       # register / login
│   ├── chat.controller.js       # create, list, fetch messages, delete chat
│   ├── memory.controller.js     # list / forget one / forget all memories
│   └── ai.controller.js         # list models, speech-to-text (Groq Whisper)
├── service/
│   ├── service.ai.js            # Gemini generation, embeddings, streaming
│   ├── providers.js             # Groq + OpenRouter clients, model list, fallback order
│   └── vector.service.js        # Pinecone: createMemory / queryMemory / deleteMemories
└── Sockets/
    └── sokets.server.js         # Real-time chat: auth via cookie, attachments, streaming replies
```

### REST endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in (sets JWT cookie) |
| POST | `/api/chat` | Create chat |
| GET | `/api/chat` | List user's chats |
| GET | `/api/chat/:chatId/messages` | Messages of a chat |
| DELETE | `/api/chat/:chatId` | Delete chat |
| GET | `/api/memories` | List memories |
| DELETE | `/api/memories` | Forget all memories |
| DELETE | `/api/memories/:memoryId` | Forget one memory |
| GET | `/api/ai/models` | Available AI models |
| POST | `/api/ai/transcribe` | Audio → text |

### Socket.IO events

| Client → Server | Server → Client |
|---|---|
| `ai-message` – send message (+ attachments, model, effort) | `user-message-saved` |
| `ai-regenerate` – regenerate last reply | `ai-chunk` – streamed text |
| `ai-edit` – edit a message and re-answer | `ai-response` – final reply |
| `ai-stop` – stop current reply | `chat-title` – auto-generated title |
| | `ai-error` |

### Message flow

```
Frontend ──socket "ai-message"──▶ sokets.server.js
        ├─ save user message (MongoDB)
        ├─ embed + store vector (Pinecone)      ← long-term memory
        ├─ query similar past messages (Pinecone)
        ├─ build prompt: memories + recent chat history
        ├─ call model (Gemini → Groq/OpenRouter fallback) ──"ai-chunk"──▶ Frontend
        └─ save reply, emit "ai-response" (+ "chat-title" for new chats)
```

### ✅ Features

- **Accounts:** register and log in, with bcrypt-hashed passwords and a JWT stored in a cookie.
- **Chats:** create, list, open and delete chats. New chats get an auto-generated title.
- **Live replies:** answers stream in chunk by chunk over Socket.IO. You can **stop**, **regenerate** or **edit and resend** a message.
- **Several AI models:** Gemini, GPT-OSS and Qwen (Groq), Nemotron and Gemma (OpenRouter).
- **Automatic fallback:** if the chosen model fails (rate limit, outage, bad key), the next one in the chain answers: `gemini → groq-gpt-oss → or-nemotron → groq-qwen`.
- **Effort levels:** Low / Medium / High, sent with each message.
- **File attachments:** images and PDFs go to the model as they are. Text, CSV, Markdown and JSON files are added to the message as text.
- **Long-term memory:** every message is embedded and stored in Pinecone. The 3 most relevant past messages are added to each prompt.
- **Short-term memory:** the last 20 messages of the chat are included in each prompt.
- **Memory control:** list your memories, forget one, or forget all of them (removed from Pinecone too).
- **Voice input:** speech-to-text through Groq Whisper (`whisper-large-v3-turbo`).
- **One reply at a time** per chat, so double-sends can't overlap.
- **Keeps working without memory:** if embeddings fail or are rate-limited, it still answers.
- **CORS:** any localhost port is allowed, and deployed URLs can be added with `CLIENT_URL`.

### ⚠️ Limitations

- **Login never expires:** the JWT has no `expiresIn` and the cookie has no `maxAge`. A stolen token works forever.
- **Cookie is not `httpOnly` / `secure`**, so JavaScript on the page can read it.
- **No server logout route:** logout only clears things on the frontend, and the token stays valid.
- **No input validation** on register/login (empty or invalid email and password are accepted). There is no password-strength rule.
- **No rate limiting** on login or on AI calls, so anyone with an account can use up the API quota.
- **Attachments:** at most **3 files per message** and **5 MB each**. Only Gemini reads PDFs directly. Groq models can't see images.
- **File contents aren't saved:** only each file's name and type are stored. The AI sees a file once, so regenerating or editing a reply later can't see that file again.
- **Memory recall is limited:** only the top 3 matches, and only the last 20 messages of context.
- **Needs outside services:** MongoDB, Pinecone (index `chat-gpt`) and at least a Gemini key. Without `GROQ_API_KEY`, voice input is turned off.
- **Port 3000 is hard-coded** in `server.js`.
- **No tests**, and no request logging or monitoring.
- Folder and file names have typos (`Sockets/sokets.server.js`, `auth.middelware.js`). They work, but they're harder to find.

---

## 2. `frontend/` — React chat UI

**Stack:** React 19, Vite, Redux Toolkit, React Router, Axios, socket.io-client, react-markdown + highlight.js.
**Run:** `npm run dev` → `http://localhost:5173`

```
frontend/
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx                 # React root, Redux Provider
    ├── App.jsx                  # App shell
    ├── AppRoutes.jsx            # Routes: / (Home), /login, /register
    ├── store/
    │   ├── store.js             # Redux store
    │   └── chatSlice.js         # Chats, messages, active chat, streaming state
    ├── pages/
    │   ├── Home.jsx             # Main chat screen (sidebar + conversation + composer)
    │   ├── Login.jsx
    │   └── Register.jsx
    ├── components/
    │   ├── AuthLayout.jsx       # Shared layout for login/register
    │   ├── ChatSidebar.jsx      # Chat list, new/delete chat
    │   ├── ChatConversation.jsx # Message list, thinking indicator
    │   ├── ChatComposer.jsx     # Input, attachments, voice, model picker
    │   ├── MarkdownMessage.jsx  # Markdown + code highlighting for replies
    │   ├── ChatInsights.jsx     # Right panel: effort gauge, session info, shortcuts
    │   ├── MemoriesDialog.jsx   # View / forget memories
    │   ├── ChatIcon.jsx         # SVG icon set
    │   ├── modes.js             # Header tabs: "Chat" | "Azreal"
    │   ├── AzrealMode.jsx       # Voice mode (talks to jarvis server)
    │   ├── AzrealRobot.jsx      # Robot avatar
    │   ├── AzrealDevil.jsx      # Devil avatar
    │   ├── azrealVoice.js       # Speech recognition / TTS helpers
    │   └── azrealSfx.js         # Sound effects
    ├── assets/                  # hero.png, react.svg, vite.svg
    └── styles
        ├── index.css / App.css  # Base styles
        ├── theme.css            # Theme tokens
        ├── auth-horror.css      # Login/register theme
        ├── azreal-light.css     # Azreal mode – light
        ├── azreal-robot.css     # Azreal robot styles
        └── azreal-devil.css     # Azreal devil styles
```
> The CSS files actually live directly in `src/`; grouped above for readability.

### ✅ Features

- **Login and register pages** with their own themed layout.
- **ChatGPT-style layout:** chat list on the left (with title search), conversation in the middle, message box at the bottom.
- **Streaming replies** with a "thinking" indicator, plus stop, regenerate and edit.
- **Rich replies:** Markdown, tables (GFM) and code highlighting.
- **Message box:** attach files, record voice (sent to Whisper), pick a model and an effort level.
- **Side panel (wide screens):** effort gauge, session info, and shortcuts for a new chat, memories and Azreal.
- **Memories dialog:** see what the AI remembers, and forget one memory or all of them.
- **Two modes in the header:** `Chat` (normal AI chat) and `Azreal` (voice assistant that talks to `jarvis`).
- **Azreal mode:** speech recognition, spoken replies, robot and devil avatars, and sound effects. The jarvis URL can be set with `VITE_AZREAL_URL`.
- **Themes:** dark "devil" theme by default. A light theme (`azreal-light.css`) is included.
- **Remembers your choices:** the last mode and model are saved in `localStorage`.
- **Redux store** keeps chats and messages in one place.

### ⚠️ Limitations

- **Backend URL is hard-coded** to `http://localhost:3000` in `Home.jsx`, `Login.jsx` and `Register.jsx`. There is no `.env` setting for production builds.
- **Azreal mode needs `jarvis` running** on the same PC (`127.0.0.1:7777`). It does not work for remote users.
- **Voice depends on the browser:** speech recognition works best in Chrome and Edge, and Firefox doesn't support it.
- **Search covers chat titles only**, not what's inside messages. There is no paging, so each chat loads all of its messages at once.
- **No chat rename, pin or share**, and no export.
- **No theme toggle in the app:** switching to the light theme means editing the CSS import in `App.jsx` and `data-theme` in `index.html`.
- **No tests**, and no error boundary, so a component crash blanks the page.
- Leftover Vite template files (`assets/react.svg`, `vite.svg`, `hero.png`, `App.css`, `README.md`) may be unused.

---

## 3. `jarvis/` — Local voice desktop assistant

**Stack:** Plain Node `http` server, OpenAI SDK (Groq / Gemini), PowerShell for PC control.
**Run:** `start-jarvis.bat` (or `npm start`) → `http://127.0.0.1:7777` (localhost only)

```
jarvis/
├── server.js             # HTTP server: serves UI, runs AI loop with tool calls
├── tools.js              # PC tools (OpenAI-style schemas + PowerShell handlers), confirm rules
├── public/
│   └── index.html        # Voice UI (speech recognition + TTS)
├── start-jarvis.bat      # Installs deps, starts server, opens Edge app window
├── create-shortcut.ps1   # Desktop shortcut (-Startup to launch with Windows)
├── package.json
└── .env.example          # GROQ_API_KEY, GEMINI_API_KEY, JARVIS_NAME, JARVIS_PORT…
```
> Also reads `../backend/.env`, so separate keys are optional.

### Endpoints

| Path | Purpose |
|---|---|
| `/` | Voice UI |
| `/health` | Status + active providers |
| `/api/events` | Server-sent events (timers etc.) |
| `/api/chat` | Send a spoken command to the AI |
| `/api/confirm` | Approve/deny a risky tool action |
| `/api/reset` | Clear conversation |

### ✅ Features

- **Voice control:** speak a command and Azreal answers out loud. It runs in an Edge app window, which has natural voices for free.
- **20 PC tools:**

| Category | Tools |
|---|---|
| Apps | `open_app`, `close_app` |
| Web | `open_url`, `search_web`, `play_youtube`, `get_weather` |
| System | `system_status` (CPU/RAM/battery/disk), `volume`, `media`, `screenshot`, `lock_pc`, `power` |
| Files | `list_files`, `find_files`, `read_file`, `write_file`, `open_path` |
| Other | `clipboard`, `set_timer` (spoken reminder), `run_command` (PowerShell) |

- **Asks before risky actions:** `run_command`, `write_file`, `close_app`, shutdown/restart/sleep, and opening executables or app paths all wait for a "yes".
- **Two AI providers (free tiers):** Groq first, then Gemini. The models can be changed in `.env`.
- **Localhost only:** it listens on `127.0.0.1`, checks the Host header, and accepts only localhost origins.
- **Live events:** timers and other later events reach the UI through Server-Sent Events.
- **Easy to start:** a one-click `.bat` file, automatic `npm install` on first run, and a desktop shortcut that can also start with Windows.
- **Shares the backend's keys:** reads `../backend/.env`, so no extra setup is needed.

### ⚠️ Limitations

- **Windows only:** every tool uses PowerShell, and the launcher uses Edge.
- **One shared session:** the conversation is kept in memory for the whole server. It is not per user, and it is lost on restart.
- **Short memory:** only the last ~30 messages are kept. It does not use the backend's Pinecone memory.
- **Timers are lost** if the server stops.
- **`run_command` can run any PowerShell command** after you confirm. One careless "yes" can damage the system.
- **No login:** anything that can reach `127.0.0.1:7777` on this PC (another local app or browser tab on a localhost origin) can send commands.
- **Voice quality depends on Edge/Chrome** speech APIs and on your microphone. It needs internet access.
- **Needs at least `GROQ_API_KEY` or `GEMINI_API_KEY`**, or it has nothing to answer with.
- **Not a real assistant platform:** no wake word, no offline mode, and no multi-step background tasks.

---

## How the 3 parts connect

```
┌──────────────┐   REST + Socket.IO   ┌──────────────┐ ── MongoDB
│   frontend   │ ───────────────────▶ │   backend    │ ── Pinecone
│  :5173       │                      │   :3000      │ ── Gemini / Groq / OpenRouter
└──────┬───────┘                      └──────────────┘
       │ Azreal mode (HTTP, localhost)
       ▼
┌──────────────┐ ── Groq / Gemini
│    jarvis    │ ── PowerShell → controls this PC
│  :7777       │
└──────────────┘
```
