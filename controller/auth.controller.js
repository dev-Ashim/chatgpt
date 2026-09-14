const userModel=require("../models/user.model")
const jwt=require("jsonwebtoken")
const bcrypt=require("bcrypt")


async function registerUser(req,res){
    const {fullName:{firstName,lastName},
    email,password}=req.body

    const isuserExist= await userModel.findOne({email})
    if(isuserExist) 
        return res.status(400).json({message:"user already exist"})

    const hashedPassword=await bcrypt.hash(password,10)

    const user= await userModel.create({
        fullName:{firstName,lastName},
    email,password:hashedPassword
    })
    const token=jwt.sign({id:user._id},process.env.JWT_SECRET_KEY)
res.cookie("token",token)
    res.status(200).json({
        message:"user created successfully",
        token,
        user:{
            id:user._id,
            fullName:user.fullName,
            email:user.email
        }
    })
}

async function loginUser(req,res){
    const {email,password}=req.body
    const user= await userModel.findOne({email})
    if(!user)
        return res.status(400).json({message:"user not found"})
    
    const  passwordValid= await bcrypt.compare(password,user.password)
    if(!passwordValid )
        return res.status(400).json({message:"invalid password"})

    const token= jwt.sign({id:user._id},process.env.JWT_SECRET_KEY)
      res.cookie("token",token)
    res.status(200).json({
        message:"user logged in successfully",
        token,
        user:{
            id:user._id,
            fullName:user.fullName,
            email:user.email
        }
    })
}

module.exports={registerUser,loginUser}

       
    