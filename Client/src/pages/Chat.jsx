import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Users, Send, LogOut } from "lucide-react";

export default function Chat() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, Logout,loading } = useAuth();

  const [partnerUsername] = useState(location.state?.partnerUsername || 'Stranger');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [endReason, setEndReason] = useState('');

  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMessages() {
      try {
        const res = await api.get(`/chat/session/${sessionId}/messages`);
        if (!cancelled) {
          setMessages(
            res.data.messages.map((m) => ({
              id: m._id,
              text: m.text,
              senderId: m.sender._id,
              senderUsername: m.sender.username,
              createdAt: m.createdAt,
            }))
          );
        }
      } catch {
        // session might be brand new with no messages yet — that's fine
      }
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;

    const onReceive = (payload) => {
      if (payload.sessionId !== sessionId) return;
      setMessages((prev) => [
        ...prev,
        {
          id: payload.messageId,
          text: payload.text,
          senderId: payload.senderId,
          senderUsername: payload.senderUsername,
          createdAt: payload.createdAt,
        },
      ]);
      if (payload.senderId !== user?.id) setPartnerTyping(false);
    };

    const onPartnerTyping = ({ isTyping }) => setPartnerTyping(isTyping);

    const onPartnerLeft = () => {
      setChatEnded(true);
      setEndReason('The stranger left the chat.');
    };
    const onPartnerDisconnected = () => {
      setChatEnded(true);
      setEndReason('The stranger disconnected.');
    };

    socket.on('receive-message', onReceive);
    socket.on('partner-typing', onPartnerTyping);
    socket.on('partner-left', onPartnerLeft);
    socket.on('partner-disconnected', onPartnerDisconnected);

    return () => {
      socket.off('receive-message', onReceive);
      socket.off('partner-typing', onPartnerTyping);
      socket.off('partner-left', onPartnerLeft);
      socket.off('partner-disconnected', onPartnerDisconnected);
    };
  }, [socket, sessionId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = useCallback(
    (e) => {
      e.preventDefault();
      if (!draft.trim() || !socket || chatEnded) return;
      socket.emit('send-message', { sessionId, text: draft.trim() });
      setDraft('');
      socket.emit('typing', { sessionId, isTyping: false });
    },
    [draft, socket, sessionId, chatEnded]
  );

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (!socket || chatEnded) return;
    socket.emit('typing', { sessionId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { sessionId, isTyping: false });
    }, 1500);
  };

  const leaveChat = () => {
    if (socket) socket.emit('leave-chat');
    navigate('/lobby');
  };

  const findNewStranger = () => {
    navigate('/lobby');
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {partnerUsername.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${chatEnded ? "bg-gray-400" : "bg-green-500"}`}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900">{partnerUsername}</h2>
              <div className="flex items-center text-xs text-gray-500">
                <Users className="w-3 h-3 mr-1" />
                {/* {onlineUsers} online */}
              </div>
            </div>
          </div>
          <button
            onClick={leaveChat}
            className="px-3 py-2 rounded-lg bg-red-500 text-white"
          >
            Leave Chat
          </button>
          <button
            onClick={Logout}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((m) => {
            const isOwn = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                  {!isOwn && (
                    <div className="text-xs text-gray-600 mb-1 px-3">
                      {m.SenderUserName}
                    </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                      }`}
                  >
                    <p className="text-sm wrap-break-word">{m.text}</p>
                    <p
                      className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'
                        }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {partnerTyping && !chatEnded && (
          <div className="message-row is-theirs">
            <div className="message-bubble is-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" >Typing</span>

            </div>
          </div>
        )}

        {chatEnded && (
          <div className="chat-ended-banner">
            <p>{endReason}</p>
            <button className="btn-primary" onClick={findNewStranger}>
              Find another stranger
            </button>
          </div>
        )}

        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <form onSubmit={sendMessage} className="flex items-center space-x-3">
            <input
              type="text"
              value={draft}
              onChange={handleDraftChange}
              placeholder="Type a message..."
              disabled={chatEnded}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <button
              type="submit"
              disabled={!draft.trim() || chatEnded}
              className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
