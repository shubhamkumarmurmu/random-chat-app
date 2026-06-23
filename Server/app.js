const express=require('express');
const app=express();
const cors=require("cors");
const authRoute=require("./routes/auth.route");
const chatRoute=require("./routes/chat.route");
const config=require("./config/config");
const morgan=require("morgan");

const cookieParser=require("cookie-parser");

app.use(cors({
    origin:true,
    credentials:true
}));
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

app.use('/',authRoute);
app.use('/api/chat',chatRoute);
app.get('/',(req,res)=>{
    res.send("hello");
});
 
module.exports=app;