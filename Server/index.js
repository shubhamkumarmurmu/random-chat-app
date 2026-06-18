const dotenv=require('dotenv');
dotenv.config();
const app=require("./src/app");
const http=require('http');
const connectDB=require("./src/config/db");
connectDB();

const Port=process.env.PORT;

const server=http.createServer(app);

server.listen(Port,()=>{
    console.log(`Server is running on port ${Port}`);
});