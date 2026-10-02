const express=require('express')
const router=express.Router()
const authMiddleware=require("../middleware/auth.middelware")
const chatController=require('../controller/chat.controller')

router.post('/',authMiddleware.authUser,chatController.createChat)
router.get('/', authMiddleware.authUser, chatController.fetchChats)


module.exports=router
