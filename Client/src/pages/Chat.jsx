
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { Users, Send, LogOut } from "lucide-react";

export default function Chat() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user, logout, loading } = useAuth();

  const [partnerUsername] = useState(
    location.state?.partnerUsername || "Stranger"
  );
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);

  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const res = await api.get(
          `/chat/session/${sessionId}/messages`
        );

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
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load messages:", err);
        }
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
      if (String(payload.sessionId) !== String(sessionId)) return;

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

      if (String(payload.senderId) !== String(user?.id)) {
        setPartnerTyping(false);
      }
    };

    const onPartnerTyping = ({ isTyping }) => {
      setPartnerTyping(Boolean(isTyping));
    };

    const onPartnerLeft = ({ sessionId: endedSessionId } = {}) => {
      if (
        endedSessionId &&
        String(endedSessionId) !== String(sessionId)
      ) return;

      setChatEnded(true);
      setEndReason("The stranger left the chat.");
      setPartnerTyping(false);
    };

    const onPartnerDisconnected = ({
      sessionId: endedSessionId,
    } = {}) => {
      if (
        endedSessionId &&
        String(endedSessionId) !== String(sessionId)
      ) return;

      setChatEnded(true);
      setEndReason("The stranger disconnected.");
      setPartnerTyping(false);
    };

    const onOnlineUsersCount = (count) => {
      if (typeof count === "number" && Number.isFinite(count)) {
        setOnlineUsers(count);
      }
    };

    socket.on("receive-message", onReceive);
    socket.on("partner-typing", onPartnerTyping);
    socket.on("partner-left", onPartnerLeft);
    socket.on("partner-disconnected", onPartnerDisconnected);
    socket.on("online-users-count", onOnlineUsersCount);

    return () => {
      socket.off("receive-message", onReceive);
      socket.off("partner-typing", onPartnerTyping);
      socket.off("partner-left", onPartnerLeft);
      socket.off("partner-disconnected", onPartnerDisconnected);
      socket.off("online-users-count", onOnlineUsersCount);
    };
  }, [socket, sessionId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    (e) => {
      e.preventDefault();

      if (!draft.trim() || !socket || chatEnded || !connected) {
        return;
      }

      socket.emit("send-message", {
        sessionId,
        text: draft.trim(),
      });

      setDraft("");
      socket.emit("typing", {
        sessionId,
        isTyping: false,
      });

      clearTimeout(typingTimeoutRef.current);
    },
    [draft, socket, sessionId, chatEnded, connected]
  );

  const handleDraftChange = (e) => {
    const value = e.target.value;
    setDraft(value);

    if (!socket || chatEnded || !connected) return;

    socket.emit("typing", {
      sessionId,
      isTyping: value.length > 0,
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        sessionId,
        isTyping: false,
      });
    }, 1500);
  };

  const leaveChat = () => {
    if (socket && connected) {
      socket.emit("leave-chat");
    }

    navigate("/lobby");
  };

  const findNewStranger = () => {
    navigate("/lobby");
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
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {partnerUsername.charAt(0).toUpperCase()}
              </div>

              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  chatEnded ? "bg-gray-400" : "bg-green-500"
                }`}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-medium text-gray-900 truncate">
                {partnerUsername}
              </h2>

              <div className="flex items-center text-xs text-gray-500 gap-1">
                <Users className="w-3 h-3" />
                <span>{chatEnded ? "Chat ended" : "Chat partner"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-100 px-2.5 py-1.5 text-green-700"
              aria-live="polite"
              aria-label={`${onlineUsers} users online`}
              title="Unique users currently connected"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                {onlineUsers} online
              </span>
            </div>

            <button
              onClick={leaveChat}
              className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors"
            >
              Leave
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((m) => {
            const isOwn =
              String(m.senderId) === String(user?.id);

            return (
              <div
                key={m.id}
                className={`flex ${
                  isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-xs lg:max-w-md">
                  {!isOwn && (
                    <div className="text-xs text-gray-600 mb-1 px-3">
                      {m.senderUsername || "Stranger"}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isOwn
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {m.text}
                    </p>

                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
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
          <div className="px-4 pb-3">
            <div className="inline-flex items-center gap-1 rounded-xl bg-white shadow-sm px-4 py-3 text-sm text-gray-500">
              <span>{partnerUsername} is typing</span>
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}

        {chatEnded && (
          <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600 mb-3">
              {endReason}
            </p>

            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              onClick={findNewStranger}
            >
              Find another stranger
            </button>
          </div>
        )}

        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <form
            onSubmit={sendMessage}
            className="flex items-center space-x-3"
          >
            <input
              type="text"
              value={draft}
              onChange={handleDraftChange}
              placeholder={
                chatEnded ? "This chat has ended" : "Type a message..."
              }
              disabled={chatEnded || !connected}
              className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={!draft.trim() || chatEnded || !connected}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full disabled:opacity-50 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
