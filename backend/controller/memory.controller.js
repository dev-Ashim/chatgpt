const mongoose = require("mongoose");
const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");
const { deleteMemories } = require("../service/vector.service");

// Every non-empty message is stored as a memory vector, so "memories" are the user's
// messages that haven't been forgotten yet.
const rememberedFilter = (userId) => ({ user: userId, forgotten: { $ne: true }, content: { $ne: "" } });

async function listMemories(req, res) {
    const messages = await messageModel.find(rememberedFilter(req.user._id))
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    const chatIds = [...new Set(messages.map((m) => String(m.chat)))];
    const chats = await chatModel.find({ _id: { $in: chatIds } }, { title: 1 }).lean();
    const titles = new Map(chats.map((c) => [String(c._id), c.title]));

    return res.status(200).json({
        memories: messages.map((m) => ({
            id: String(m._id),
            role: m.role === "model" ? "assistant" : "user",
            content: m.content.length > 300 ? `${m.content.slice(0, 300)}…` : m.content,
            chatTitle: titles.get(String(m.chat)) || "Deleted chat",
            createdAt: m.createdAt,
        })),
    });
}

async function forgetMemory(req, res) {
    const { memoryId } = req.params;
    if (!mongoose.isValidObjectId(memoryId)) {
        return res.status(400).json({ message: "invalid memory id" });
    }
    const message = await messageModel.findOne({ _id: memoryId, user: req.user._id });
    if (!message) return res.status(404).json({ message: "memory not found" });

    await deleteMemories([message._id]);
    message.forgotten = true;
    await message.save();
    return res.status(200).json({ message: "memory forgotten" });
}

async function forgetAllMemories(req, res) {
    const ids = await messageModel.find({ user: req.user._id, forgotten: { $ne: true } }).distinct("_id");
    if (ids.length) {
        await deleteMemories(ids);
        await messageModel.updateMany({ _id: { $in: ids } }, { forgotten: true });
    }
    return res.status(200).json({ message: "all memories forgotten", count: ids.length });
}

module.exports = { listMemories, forgetMemory, forgetAllMemories };
