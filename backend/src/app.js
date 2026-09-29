const express =require('express')
const cookiesparse=require('cookie-parser')
const autroutes=require('../router/auth.routes')
const chatRoutes=require('../router/chat.routes')
const app = express()
app.use(express.json())
app.use(cookiesparse())

app.use('/api/auth',autroutes)
app.use('/api/chat', chatRoutes)


module.exports=app




