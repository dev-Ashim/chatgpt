require('dotenv').config();
const app=require('./src/app')
const connectDB=require('./db/db')
const initSocketServer = require("./Sockets/sokets.server");
const http = require("http");
const httpServer = http.createServer(app);

initSocketServer(httpServer);
connectDB()

httpServer.listen(3000,()=>{
    console.log('server is running');
})







