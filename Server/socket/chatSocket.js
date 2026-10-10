
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const ChatSession = require('../models/chatsession.model');
const Message = require('../models/message.model');

const waitingQueue = [];
const activePairs = new Map();

const onlineUsers = new Map();

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: no token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    if (!decoded.id || !decoded.username) {
      return next(new Error('Authentication error: invalid user data'));
    }

    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
}


function addOnlineUser(userId, socketId) {
  userId = String(userId);

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
  userId = String(userId);

  const sockets = onlineUsers.get(userId);

  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  return false;
}

function broadcastOnlineCount(io) {
  io.emit('online-users-count', onlineUsers.size);
}

function removeFromQueue(socketId) {
  const idx = waitingQueue.findIndex(
    (entry) => entry.socketId === socketId
  );

  if (idx !== -1) {
    waitingQueue.splice(idx, 1);
  }
}

function initSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const userId = String(socket.user.id);

    console.log(
      `Socket connected: ${socket.id} (user: ${socket.user.username})`
    );

    addOnlineUser(userId, socket.id);

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
      });
    } catch (err) {
      console.error('Error updating online status:', err.message);
    }

    broadcastOnlineCount(io);

    socket.emit('online-users-count', onlineUsers.size);

    socket.on('find-partner', async () => {
      removeFromQueue(socket.id);

      if (activePairs.has(socket.id)) {
        return;
      }

      const partnerIndex = waitingQueue.findIndex(
        (entry) => entry.userId !== userId
      );

      if (partnerIndex === -1) {
        waitingQueue.push({
          socketId: socket.id,
          userId,
          username: socket.user.username,
        });

        socket.emit('waiting-for-partner');
        return;
      }

      const partner = waitingQueue.splice(partnerIndex, 1)[0];
      const partnerSocket = io.sockets.sockets.get(partner.socketId);

      if (!partnerSocket || !partnerSocket.connected) {
        socket.emit('waiting-for-partner');
        waitingQueue.push({
          socketId: socket.id,
          userId,
          username: socket.user.username,
        });
        return;
      }

      try {
        const session = await ChatSession.create({
          participants: [userId, partner.userId],
          status: 'active',
        });

        const sessionId = session._id.toString();

        activePairs.set(socket.id, {
          partnerSocketId: partner.socketId,
          sessionId,
        });

        activePairs.set(partner.socketId, {
          partnerSocketId: socket.id,
          sessionId,
        });

        socket.join(sessionId);
        partnerSocket.join(sessionId);

        socket.emit('partner-found', {
          sessionId,
          partnerUsername: partner.username,
        });

        partnerSocket.emit('partner-found', {
          sessionId,
          partnerUsername: socket.user.username,
        });
      } catch (err) {
        console.error('Error creating chat session:', err.message);

        socket.emit('error-message', {
          message: 'Could not start chat. Try again.',
        });

        if (partnerSocket.connected) {
          waitingQueue.push({
            socketId: partnerSocket.id,
            userId: String(partnerSocket.user.id),
            username: partnerSocket.user.username,
          });

          partnerSocket.emit('waiting-for-partner');
        }
      }
    });

    socket.on('send-message', async ({ sessionId, text } = {}) => {
      if (typeof text !== 'string' || !text.trim()) {
        return;
      }

      const pairInfo = activePairs.get(socket.id);

      if (!pairInfo || pairInfo.sessionId !== String(sessionId)) {
        return socket.emit('error-message', {
          message: 'You are not in an active chat.',
        });
      }

      try {
        const message = await Message.create({
          session: sessionId,
          sender: userId,
          text: text.trim(),
        });

        const payload = {
          sessionId,
          messageId: message._id,
          text: message.text,
          senderId: userId,
          senderUsername: socket.user.username,
          createdAt: message.createdAt,
        };

        socket.emit('receive-message', payload);

        const partnerSocket = io.sockets.sockets.get(
          pairInfo.partnerSocketId
        );

        if (partnerSocket) {
          partnerSocket.emit('receive-message', payload);
        }
      } catch (err) {
        console.error('Error saving message:', err.message);

        socket.emit('error-message', {
          message: 'Message failed to send.',
        });
      }
    });

    socket.on('typing', ({ sessionId, isTyping } = {}) => {
      const pairInfo = activePairs.get(socket.id);

      if (!pairInfo || pairInfo.sessionId !== String(sessionId)) {
        return;
      }

      const partnerSocket = io.sockets.sockets.get(
        pairInfo.partnerSocketId
      );

      if (partnerSocket) {
        partnerSocket.emit('partner-typing', {
          isTyping: Boolean(isTyping),
        });
      }
    });

    socket.on('leave-chat', async () => {
      await endChatForSocket(socket, io, 'partner-left');
    });

    socket.on('cancel-search', () => {
      removeFromQueue(socket.id);
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      removeFromQueue(socket.id);

      const fullyOffline = removeOnlineUser(userId, socket.id);

      if (fullyOffline) {
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error('Error updating offline status:', err.message);
        }
      }

      broadcastOnlineCount(io);

      await endChatForSocket(
        socket,
        io,
        'partner-disconnected'
      );
    });
  });
}

async function endChatForSocket(socket, io, reasonEvent) {
  const pairInfo = activePairs.get(socket.id);

  if (!pairInfo) {
    return;
  }

  activePairs.delete(socket.id);
  activePairs.delete(pairInfo.partnerSocketId);

  try {
    await ChatSession.findByIdAndUpdate(pairInfo.sessionId, {
      status: 'ended',
      endedAt: new Date(),
    });
  } catch (err) {
    console.error('Error ending session:', err.message);
  }

  const partnerSocket = io.sockets.sockets.get(
    pairInfo.partnerSocketId
  );

  if (partnerSocket) {
    partnerSocket.emit(reasonEvent, {
      sessionId: pairInfo.sessionId,
    });
  }
}

module.exports = initSocket;
