const chatModel = require("../models/chat.model");

async function createChat(req, res) {
    const { title } = req.body;
    const user = req.user;

    const chat = await chatModel.create({
        title,
        user: user._id
    });

    return res.status(201).json({
        message: "chat created successfully",
        chat: {
            _id: chat._id,
            title: chat.title,
            user: chat.user,
            lastTime: chat.lastTime
        }
    });
}

async function fetchChats(req,res) {
    const user = req.user;
    const chats = await chatModel.find({ user: user._id });
    return res.status(200).json({
        message: "chats fetched successfully",
        chats:
            chats.map((chat) => ({
                _id: chat._id,
                title: chat.title,
                user: chat.user,
                lastTime: chat.lastTime
            }))

    });

    
}

module.exports = { createChat,fetchChats};