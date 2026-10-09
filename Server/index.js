const app=require("./app");
const http=require('http');
const connectDB=require("./config/database");
const config=require("./config/config");
const {Server}=require('socket.io');
const initSocket=require('./socket/chatSocket');
connectDB();

const Port=config.PORT || 5000;

const server=http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);

server.listen(Port,()=>{
    console.log(`Server is running on port ${Port}`);
});