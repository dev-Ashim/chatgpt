const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiServices = require("../service/service.ai");
const mesaageModel=require('../models/message.model')
const {createMemory,queryMemory}=require('../service/vector.service')

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

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
           
    /*   const message = await mesaageModel.create({
                user: socket.user._id, 
                chat: messagePayLoad.chat,
                content: messagePayLoad.content, 
                role: "user",
            });*/
          /*  const vector= await aiServices.createEmbedding(messagePayLoad.content) */


          const [message,vector]=await Promise.all([
            mesaageModel.create({
                user: socket.user._id,
                chat: messagePayLoad.chat,
                content: messagePayLoad.content,
                role: "user",
            }),
          aiServices.createEmbedding(messagePayLoad.content),

          ])



/*        const memory =await queryMemory({
            quervector:
            vector,
           limit:3,
          metadata: {
    userId: String(socket.user._id)
}
          })



 const chatHistory=(await mesaageModel.find({
                chat:messagePayLoad.chat
            }).sort({createdAt:-1}).limit(20).lean()).reverse()
            console.log("chatHistory:",chatHistory);
          */


    const[memory,chatHistory]=await Promise.all([
        queryMemory({
            queryVector:vector,
           limit:3,
          metadata: {
    userId: String(socket.user._id)
}
          }) ,
          mesaageModel.find({
    chat: messagePayLoad.chat
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .lean()
])


chatHistory.reverse()
     
           const stm=chatHistory.map((item) => {
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
         
         
        
          await createMemory({
            vectors:vector,
            messageId:message._id,
            metadata:{
                chatId:messagePayLoad.chat,
                userId:socket.user._id,
                text:message.content
            },
           
          })
          
           

    const ltm=[
        {
            type: "user_input",
            content: [
                {
                    type: "text",
                    text: `The following are reference memories only.
Do not answer them individually.
Use them only to answer the latest user message.
                    ${memory.map(item=>item.metadata.text).join("\n")}`
                }
            ]
        }];

        ([...ltm,...stm]).map(item=>{
            console.log(item)
        })


            const response = await aiServices.generateResponse([...ltm,...stm]);

/*    const responseMessage=  await mesaageModel.create({
                user: socket.user._id,
                chat: messagePayLoad.chat,
                content: response,
                role: "model",
            });

               const responseEmbedding=await aiServices.createEmbedding(response)
   */


     
            const [responseMessage, responseEmbedding] = await Promise.all([
                mesaageModel.create({
                    user: socket.user._id,
                    chat: messagePayLoad.chat,
                    content: response,
                    role: "model",
                }),
                aiServices.createEmbedding(response)
            ]);

            await createMemory({
                vectors: responseEmbedding,
                messageId: responseMessage._id,
                metadata: {
                    chatId: messagePayLoad.chat,
                    userId: socket.user._id,
                    text: response
                },
            });

            socket.emit("ai-response", { 
                content: response,
                chat: messagePayLoad.chat,
            });
        });



        
    });


}


 
module.exports = initSocketServer;