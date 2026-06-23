const dotenv=require('dotenv');
dotenv.config();

const MONGO_URI=process.env.MONGO_URI;
const JWT_SECRET=process.env.JWT_SECRET;
const PORT=process.env.PORT;
const CLIENT_URL=process.env.CLIENT_URL;

if(!MONGO_URI || !JWT_SECRET || !PORT || !CLIENT_URL){
    throw new Error("Environment variables are missing.");
}

const config={
    MONGO_URI,
    JWT_SECRET,
    PORT,
    CLIENT_URL
}

module.exports=config;