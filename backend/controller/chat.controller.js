const mongoose = require("mongoose");
const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");
const { deleteMemories } = require("../service/vector.service");

function toChatResponse(chat) {
    return {
        _id: chat._id,
        title: chat.title,
        user: chat.user,
        lastTime: chat.lastTime
    };
}

async function findOwnChat(req, res) {
    const { chatId } = req.params;
    if (!mongoose.isValidObjectId(chatId)) {
        res.status(400).json({ message: "invalid chat id" });
        return null;
    }
    const chat = await chatModel.findOne({ _id: chatId, user: req.user._id });
    if (!chat) {
        res.status(404).json({ message: "chat not found" });
        return null;
    }
    return chat;
}

async function createChat(req, res) {
    // Title is optional: untitled chats get named automatically after the first reply
    const title = req.body?.title?.trim().slice(0, 60);

    const chat = await chatModel.create({
        ...(title ? { title } : {}),
        user: req.user._id
    });

    return res.status(201).json({
        message: "chat created successfully",
        chat: toChatResponse(chat)
    });
}

async function fetchChats(req, res) {
    const chats = await chatModel.find({ user: req.user._id }).sort({ lastTime: -1 });
    return res.status(200).json({
        message: "chats fetched successfully",
        chats: chats.map(toChatResponse)
    });
}

async function fetchMessages(req, res) {
    const chat = await findOwnChat(req, res);
    if (!chat) return;

    const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({
        message: "messages fetched successfully",
        messages: messages.map((message) => ({
            id: String(message._id),
            role: message.role === "model" ? "assistant" : "user",
            content: message.content,
            attachments: message.attachments || [],
            createdAt: message.createdAt
        }))
    });
}

async function deleteChat(req, res) {
    const chat = await findOwnChat(req, res);
    if (!chat) return;

    const messageIds = await messageModel.find({ chat: chat._id }).distinct("_id");

    await Promise.all([
        messageModel.deleteMany({ chat: chat._id }),
        chatModel.deleteOne({ _id: chat._id }),
    ]);

    if (messageIds.length) {
        try {
            await deleteMemories(messageIds);
        } catch (err) {
            // The chat is already gone; stale vectors only affect memory recall
            console.error("failed to delete chat memories:", err);
        }
    }

    return res.status(200).json({ message: "chat deleted successfully" });
}

module.exports = { createChat, fetchChats, fetchMessages, deleteChat };
