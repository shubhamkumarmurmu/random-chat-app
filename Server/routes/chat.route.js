const express = require('express');
const ChatSession = require('../models/chatsession.model');
const Message = require('../models/message.model');
const authMiddleware = require('../middlewares/auth.middleware');
const chatController=require("../controllers/chat.controller");

const router = express.Router();

router.get('/session/:sessionId/messages', authMiddleware, );

module.exports = router;
