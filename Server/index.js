const app = require("./app");
const http = require("http");
const connectDB = require("./config/database");
const config = require("./config/config");
const { Server } = require("socket.io");
const initSocket = require("./socket/chatSocket");

const Port = config.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);

async function startServer() {
  try {
    await connectDB();

    server.listen(Port, () => {
      console.log(`Server is running on port ${Port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
