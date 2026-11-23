const { Server } = require("socket.io");
const allowedOrigin = require("../src/allowedOrigin");
const mongoose = require("mongoose");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const chatModel = require("../models/chat.model");
const aiServices = require("../service/service.ai");
const messageModel = require('../models/message.model')
const { createMemory, queryMemory, deleteMemories } = require('../service/vector.service')

const DEFAULT_TITLE = "New chat";
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"];
const TEXT_TYPES = ["text/plain", "text/csv", "text/markdown", "application/json"];

class UserFacingError extends Error {}

// Validates uploaded files and turns them into interaction content parts.
// Images and PDFs go to Gemini as-is; text files are inlined as text.
function prepareAttachments(rawAttachments) {
    if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) return { stored: [], parts: [] };
    if (rawAttachments.length > MAX_ATTACHMENTS) {
        throw new UserFacingError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
    }

    const stored = [];
    const parts = [];
    for (const file of rawAttachments) {
        const name = String(file?.name || "file").slice(0, 120);
        const mimeType = String(file?.mimeType || "");
        const data = String(file?.data || "");
        const size = Buffer.byteLength(data, "base64");

        if (!data) throw new UserFacingError(`"${name}" is empty.`);
        if (size > MAX_ATTACHMENT_BYTES) throw new UserFacingError(`"${name}" is larger than 5 MB.`);

        if (IMAGE_TYPES.includes(mimeType)) {
            parts.push({ type: "image", data, mime_type: mimeType });
        } else if (mimeType === "application/pdf") {
            parts.push({ type: "document", data, mime_type: mimeType });
        } else if (TEXT_TYPES.includes(mimeType)) {
            const text = Buffer.from(data, "base64").toString("utf8");
            parts.push({ type: "text", text: `Contents of the attached file "${name}":\n${text}` });
        } else {
            throw new UserFacingError(`"${name}" isn't a supported file type. Use images, PDFs or text files.`);
        }
        stored.push({ name, mimeType });
    }
    return { stored, parts };
}

function attachmentNote(message) {
    if (!message.attachments?.length) return "";
    return `\n[Attached earlier: ${message.attachments.map((a) => a.name).join(", ")}]`;
}

function toInteractionTurn(message, extraParts = []) {
    const text = (message.content || "") + attachmentNote(message);
    return {
        type: message.role === "user" ? "user_input" : "model_output",
        content: [...(text ? [{ type: "text", text }] : []), ...extraParts],
    };
}

async function findOwnChat(chatId, userId) {
    if (!mongoose.isValidObjectId(chatId)) throw new UserFacingError("Chat not found.");
    const chat = await chatModel.findOne({ _id: chatId, user: userId });
    if (!chat) throw new UserFacingError("Chat not found.");
    return chat;
}

async function deleteMessages(filter) {
    const ids = await messageModel.find(filter).distinct("_id");
    if (!ids.length) return;
    await messageModel.deleteMany({ _id: { $in: ids } });
    try {
        await deleteMemories(ids);
    } catch (err) {
        console.error("failed to delete memories:", err);
    }
}

async function rememberMessage(message, userId) {
    const text = message.content?.trim();
    if (!text) return;
    const vector = await aiServices.createEmbedding(text);
    await createMemory({
        vectors: vector,
        messageId: message._id,
        metadata: {
            chatId: String(message.chat),
            userId: String(userId),
            text
        },
    });
}

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigin,
            credentials: true,
        },
        // Room for up to 3 base64-encoded 5 MB attachments
        maxHttpBufferSize: 25 * 1024 * 1024,
    });

    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

        if (!cookies.token) {
            return next(new Error("Authentication error:no token"));
        }

        try {
            const decode = jwt.verify(cookies.token, process.env.JWT_SECRET_KEY);
            const user = await userModel.findById(decode.id);
            if (!user) return next(new Error("Authentication error:user not found"));
            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication error:invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.user._id;
        // chatId -> AbortController for the reply currently streaming in that chat
        const activeReplies = new Map();

        async function saveUserMessage(chatId, content, attachments, clientId) {
            const message = await messageModel.create({
                user: userId,
                chat: chatId,
                content,
                attachments,
                role: "user",
            });
            socket.emit("user-message-saved", { chat: chatId, clientId, id: String(message._id) });
            return message;
        }

        // Generates and streams a reply to the latest messages in the chat.
        async function respond(chat, { effort, model, latestParts = [], signal }) {
            const chatId = String(chat._id);
            const history = (await messageModel.find({ chat: chatId })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean()).reverse();

            const lastUser = [...history].reverse().find((m) => m.role === "user");
            const queryText = lastUser?.content?.trim();

            let memory = [];
            if (queryText) {
                // Memory is optional: if embeddings are rate-limited, still answer without it
                try {
                    const vector = await aiServices.createEmbedding(queryText);
                    memory = await queryMemory({
                        queryVector: vector,
                        limit: 3,
                        metadata: { userId: String(userId) }
                    });
                    // Don't feed messages already in the short-term history back in as "memories"
                    const historyIds = new Set(history.map((m) => String(m._id)));
                    memory = memory.filter((item) => !historyIds.has(String(item.id)));
                } catch (err) {
                    console.error("memory lookup failed, answering without it:", err.message);
                    memory = [];
                }
            }

            const stm = history.map((message) =>
                message === history[history.length - 1] && message.role === "user"
                    ? toInteractionTurn(message, latestParts)
                    : toInteractionTurn(message)
            );

            const ltm = memory.length ? [{
                type: "user_input",
                content: [{
                    type: "text",
                    text: `The following are reference memories only.
Do not answer them individually.
Use them only to answer the latest user message.
${memory.map(item => item.metadata.text).join("\n")}`
                }]
            }] : [];

            const result = signal.aborted ? { text: "" } : await aiServices.generateResponseStream([...ltm, ...stm], {
                modelId: model,
                userName: socket.user.fullName?.firstName,
                effort,
                signal,
                onChunk: (text) => socket.emit("ai-chunk", { chat: chatId, text }),
            });

            const response = result.text;
            const answeredBy = result.model;
            const stopped = signal.aborted;
            if (!response.trim()) {
                socket.emit("ai-response", { chat: chatId, content: "", stopped });
                return;
            }

            const responseMessage = await messageModel.create({
                user: userId,
                chat: chatId,
                content: response,
                role: "model",
            });
            await chatModel.updateOne({ _id: chatId }, { lastTime: new Date() });

            socket.emit("ai-response", {
                id: String(responseMessage._id),
                content: response,
                chat: chatId,
                stopped,
                model: answeredBy && { id: answeredBy.id, label: answeredBy.label },
                fallback: Boolean(answeredBy && model && answeredBy.id !== model),
            });

            // Background work: the user already has their reply
            rememberMessage(responseMessage, userId)
                .catch((err) => console.error("failed to store reply memory:", err));

            if (chat.title === DEFAULT_TITLE && lastUser) {
                const titleSource = lastUser.content || lastUser.attachments?.map((a) => a.name).join(", ") || "";
                aiServices.generateTitle(titleSource, response, answeredBy?.id)
                    .then(async (title) => {
                        if (!title) return;
                        await chatModel.updateOne({ _id: chatId, title: DEFAULT_TITLE }, { title });
                        socket.emit("chat-title", { chat: chatId, title });
                    })
                    .catch((err) => console.error("failed to generate title:", err));
            }
        }

        // Wraps each event: one reply at a time per chat, errors reported to the client
        function handle(eventName, work) {
            socket.on(eventName, async (payload = {}) => {
                const chatId = payload.chat;
                const key = String(chatId);
                if (activeReplies.has(key)) {
                    socket.emit("ai-error", { chat: chatId, message: "Wait for the current reply to finish." });
                    return;
                }
                // Reserve the chat right away so a second event can't slip in while this one awaits
                const controller = new AbortController();
                activeReplies.set(key, controller);
                try {
                    const chat = await findOwnChat(chatId, userId);
                    await work(chat, payload, controller.signal);
                } catch (err) {
                    console.error(`${eventName} failed:`, err);
                    socket.emit("ai-error", {
                        chat: chatId,
                        message: err instanceof UserFacingError
                            ? err.message
                            : "Azreal couldn't respond right now. Please try again.",
                    });
                } finally {
                    activeReplies.delete(key);
                }
            });
        }

        handle("ai-message", async (chat, { content = "", attachments, effort, model, clientId }, signal) => {
            const text = String(content).trim();
            const files = prepareAttachments(attachments);
            if (!text && !files.parts.length) throw new UserFacingError("Message is empty.");

            const message = await saveUserMessage(chat._id, text, files.stored, clientId);
            rememberMessage(message, userId).catch((err) => console.error("failed to store memory:", err));
            await respond(chat, { effort, model, latestParts: files.parts, signal });
        });

        handle("ai-regenerate", async (chat, { effort, model }, signal) => {
            const lastUser = await messageModel.findOne({ chat: chat._id, role: "user" }).sort({ createdAt: -1 });
            if (!lastUser) throw new UserFacingError("Nothing to regenerate yet.");
            await deleteMessages({ chat: chat._id, role: "model", createdAt: { $gt: lastUser.createdAt } });
            await respond(chat, { effort, model, signal });
        });

        handle("ai-edit", async (chat, { messageId, content = "", effort, model, clientId }, signal) => {
            const text = String(content).trim();
            if (!text) throw new UserFacingError("Message is empty.");
            if (!mongoose.isValidObjectId(messageId)) throw new UserFacingError("Message not found.");

            const original = await messageModel.findOne({ _id: messageId, chat: chat._id, role: "user" });
            if (!original) throw new UserFacingError("Message not found.");

            // Editing rewinds the conversation to that point
            await deleteMessages({ chat: chat._id, createdAt: { $gte: original.createdAt } });
            const message = await saveUserMessage(chat._id, text, original.attachments, clientId);
            rememberMessage(message, userId).catch((err) => console.error("failed to store memory:", err));
            await respond(chat, { effort, model, signal });
        });

        socket.on("ai-stop", ({ chat } = {}) => {
            activeReplies.get(String(chat))?.abort();
        });

        socket.on("disconnect", () => {
            for (const controller of activeReplies.values()) controller.abort();
        });
    });
}

module.exports = initSocketServer;
