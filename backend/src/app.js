const express =require('express')
const cookiesparse=require('cookie-parser')
const autroutes=require('../router/auth.routes')
const chatRoutes=require('../router/chat.routes')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cookiesparse())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
    
}))

app.use('/api/auth',autroutes)
app.use('/api/chat', chatRoutes)

  
module.exports=app




  