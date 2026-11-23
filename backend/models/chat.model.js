const mongoose=require('mongoose')

const chatSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
       required:true
    },
    title:{
        type:String,
        default:"New chat"
    },
    lastTime:{
        type:Date,
        default:Date.now
    }
},{
    timestamps:true
})

const chatModel=mongoose.model("chat",chatSchema)
module.exports=chatModel