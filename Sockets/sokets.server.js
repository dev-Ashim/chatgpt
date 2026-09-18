const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiServices = require("../service/service.ai");
const mesaageModel=require('../models/message.model')

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {});

    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

        if (!cookies.token) {
            next(new Error("Authentication error:no token"));
        }

        try {
            const decode = jwt.verify(cookies.token, process.env.JWT_SECRET_KEY);
            const user = await userModel.findById(decode.id);
            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication error:invalid token"));
        }
    });

    io.on("connection", (socket) => {
        socket.on("ai-message", async (messagePayLoad) => {
            console.log(messagePayLoad);
           
            await mesaageModel.create({
                user: socket.user._id,
                chat: messagePayLoad.chat,
                content: messagePayLoad.content,
                role: "user",
            });
            const chatHistory=(await mesaageModel.find({
                chat:messagePayLoad.chat
            }).sort({createdAt:1}).limit(20).lean()).reverse()
            console.log("chatHistory:",chatHistory);

            const response = await aiServices.generateResponse(
    chatHistory.map((item) => {
        return {
            type: item.role === "user"
                ? "user_input"
                : "model_output",

            content: [
                {
                    type: "text",
                    text: item.content
                }
            ]
        };
    })
);
            await mesaageModel.create({
                user: socket.user._id,
                chat: messagePayLoad.chat,
                content: response,
                role: "model",
            });
            socket.emit("ai-response", {
                content: response,
                chat: messagePayLoad.chat,
            });
        });
    });
}

module.exports = initSocketServer;