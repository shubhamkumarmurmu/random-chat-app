const express = require("express");
const app = express();
const userRoutes=require("./routes/user.route");
const cookieParser = require('cookie-parser');

app.use(cookieParser());

app.use(express.json());

app.get("/",(req,res)=>{
    res.send("hello World");
    console.log("reseive");
}); 

app.use("/",userRoutes);

module.exports = app;