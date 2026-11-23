const express =require('express')
const cookiesparse=require('cookie-parser')
const autroutes=require('../router/auth.routes')
const chatRoutes=require('../router/chat.routes')
const memoryRoutes=require('../router/memory.routes')
const aiRoutes=require('../router/ai.routes')
const cors = require('cors')
const allowedOrigin = require('./allowedOrigin')

const app = express()
app.use(express.json())
app.use(cookiesparse())
app.use(cors({
    origin: allowedOrigin,
    credentials: true
    
}))

app.use('/api/auth',autroutes)
app.use('/api/chat', chatRoutes)
app.use('/api/memories', memoryRoutes)
app.use('/api/ai', aiRoutes)

  
module.exports=app




  