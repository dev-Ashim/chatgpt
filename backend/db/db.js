const mongoose= require('mongoose')
const dns= require('dns')

// Node's resolver on Windows can fail SRV lookups for mongodb+srv URLs
dns.setServers(['8.8.8.8','1.1.1.1'])

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log('DB connected');
    } catch (error) {
        console.log(error);
    }
}
module.exports=connectDB