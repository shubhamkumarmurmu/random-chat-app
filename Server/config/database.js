const mongoose = require("mongoose");
const config = require("./config");

async function connectDB() {
try {
await mongoose.connect(config.MONGO_URI, {
dbName: "chat",
serverSelectionTimeoutMS: 10000,
});

```
console.log("DB connected:", mongoose.connection.name);
```

} catch (error) {
console.error("MongoDB connection failed:", error);
throw error;
}
}

module.exports = connectDB;
