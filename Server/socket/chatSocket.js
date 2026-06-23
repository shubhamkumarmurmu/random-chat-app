const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const ChatSession = require('../models/chatsession.model');
const Message = require('../models/message.model');

const waitingQueue = []; 
const activePairs = new Map(); 
const onlineUsers = new Map(); 

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: no token'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, username }
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
}

function removeFromQueue(socketId) {
  const idx = waitingQueue.findIndex((entry) => entry.socketId === socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

function initSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.username})`);

    onlineUsers.set(socket.user.id, socket.id);
    await User.findByIdAndUpdate(socket.user.id, { isOnline: true });

    // ---- Find a random stranger ----
    socket.on('find-partner', async () => {
      // Avoid duplicate queue entries
      removeFromQueue(socket.id);

      // If already paired, end the old pair first
      if (activePairs.has(socket.id)) {
        return; // already chatting
      }

      // Look for someone else waiting (not themself, ideally not already paired)
      const partnerIndex = waitingQueue.findIndex(
        (entry) => entry.userId !== socket.user.id
      );

      if (partnerIndex !== -1) {
        const partner = waitingQueue.splice(partnerIndex, 1)[0];
        const partnerSocket = io.sockets.sockets.get(partner.socketId);

        if (!partnerSocket) {
          // Partner disconnected silently; put self in queue and wait
          waitingQueue.push({ socketId: socket.id, userId: socket.user.id, username: socket.user.username });
          return;
        }

        try {
          const session = await ChatSession.create({
            participants: [socket.user.id, partner.userId],
            status: 'active',
          });

          activePairs.set(socket.id, { partnerSocketId: partner.socketId, sessionId: session._id.toString() });
          activePairs.set(partner.socketId, { partnerSocketId: socket.id, sessionId: session._id.toString() });

          socket.join(session._id.toString());
          partnerSocket.join(session._id.toString());

          socket.emit('partner-found', {
            sessionId: session._id,
            partnerUsername: partner.username,
          });
          partnerSocket.emit('partner-found', {
            sessionId: session._id,
            partnerUsername: socket.user.username,
          });
        } catch (err) {
          console.error('Error creating chat session:', err.message);
          socket.emit('error-message', { message: 'Could not start chat. Try again.' });
        }
      } else {
        // No one waiting — add self to queue
        waitingQueue.push({ socketId: socket.id, userId: socket.user.id, username: socket.user.username });
        socket.emit('waiting-for-partner');
      }
    });

    socket.on('send-message', async ({ sessionId, text }) => {
      if (!text || !text.trim()) return;

      const pairInfo = activePairs.get(socket.id);
      if (!pairInfo || pairInfo.sessionId !== sessionId) {
        return socket.emit('error-message', { message: 'You are not in an active chat.' });
      }

      try {
        const message = await Message.create({
          session: sessionId,
          sender: socket.user.id,
          text: text.trim(),
        });

        const payload = {
          sessionId,
          messageId: message._id,
          text: message.text,
          senderId: socket.user.id,
          senderUsername: socket.user.username,
          createdAt: message.createdAt,
        };

        // Emit to both sender and partner
        socket.emit('receive-message', payload);
        const partnerSocket = io.sockets.sockets.get(pairInfo.partnerSocketId);
        if (partnerSocket) {
          partnerSocket.emit('receive-message', payload);
        }
      } catch (err) {
        console.error('Error saving message:', err.message);
        socket.emit('error-message', { message: 'Message failed to send.' });
      }
    });

    socket.on('typing', ({ sessionId, isTyping }) => {
      const pairInfo = activePairs.get(socket.id);
      if (!pairInfo || pairInfo.sessionId !== sessionId) return;

      const partnerSocket = io.sockets.sockets.get(pairInfo.partnerSocketId);
      if (partnerSocket) {
        partnerSocket.emit('partner-typing', { isTyping });
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
      onlineUsers.delete(socket.user.id);

      await User.findByIdAndUpdate(socket.user.id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      await endChatForSocket(socket, io, 'partner-disconnected');
    });
  });
}

async function endChatForSocket(socket, io, reasonEvent) {
  const pairInfo = activePairs.get(socket.id);
  if (!pairInfo) return;

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

  const partnerSocket = io.sockets.sockets.get(pairInfo.partnerSocketId);
  if (partnerSocket) {
    partnerSocket.emit(reasonEvent, { sessionId: pairInfo.sessionId });
  }
}

module.exports = initSocket;
