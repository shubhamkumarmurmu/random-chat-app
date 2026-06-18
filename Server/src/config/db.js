const mongoose=require('mongoose');

async function connectDB(params) {
    await mongoose.connect(process.env.MONGO_URI,{
        dbName:"DB"
    });
    console.log("db connected");
} 

module.exports=connectDB;