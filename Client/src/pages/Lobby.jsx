import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { MessageCircle, Radio, LogOut, Clock, Loader2 } from "lucide-react";

export default function Lobby() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [searching, setSearching] = useState(false);
  const [statusText, setStatusText] = useState("Ready to connect");

  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => setStatusText("Searching for a stranger…");
    const onPartnerFound = ({ sessionId, partnerUsername }) => {
      setSearching(false);
      navigate(`/chat/${sessionId}`, { state: { partnerUsername } });
    };
    const onError = ({ message }) => {
      setSearching(false);
      setStatusText(message || "Something went wrong");
    };

    socket.on("waiting-for-partner", onWaiting);
    socket.on("partner-found", onPartnerFound);
    socket.on("error-message", onError);

    return () => {
      socket.off("waiting-for-partner", onWaiting);
      socket.off("partner-found", onPartnerFound);
      socket.off("error-message", onError);
    };
  }, [socket, navigate]);

  const startSearch = () => {
    if (!socket || !connected) return;
    setSearching(true);
    setStatusText("Scanning for strangers…");
    socket.emit("find-partner");
  };

  const cancelSearch = () => {
    if (!socket) return;
    socket.emit("cancel-search");
    setSearching(false);
    setStatusText("Ready to connect");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">ChatApp</span>
          </div>

          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-500 font-medium hidden sm:block">
              {user?.username}
            </span>

            <Link
              to="/history"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:block">History</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          {/* Title */}
          <div className="flex items-center justify-center mb-2">
            <Radio className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">Find a Stranger</h1>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            You'll be matched anonymously. Be kind. Leave any time.
          </p>

          {/* Signal visualizer */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 mb-6 flex items-center justify-center">
            <SignalBars active={searching} connected={connected} />
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-6 min-h-6">
            {!connected ? (
              <span className="text-sm text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Connecting to server…
              </span>
            ) : searching ? (
              <span className="text-sm text-blue-600 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {statusText}
              </span>
            ) : (
              <span className="text-sm text-gray-500">{statusText}</span>
            )}
          </div>

          {/* Connection indicator pill */}
          <div className="flex items-center justify-center mb-6">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                connected
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              {connected ? "Connected" : "Offline"}
            </span>
          </div>

          {/* Action button */}
          {!searching ? (
            <button
              onClick={startSearch}
              disabled={!connected}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Start Searching
            </button>
          ) : (
            <button
              onClick={cancelSearch}
              className="w-full border border-red-300 text-red-600 py-3 rounded-lg font-medium hover:bg-red-50 focus:ring-4 focus:ring-red-100 transition-all"
            >
              Cancel Search
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function SignalBars({ active, connected }) {
  const bars = [3, 5, 7, 9, 7, 5, 3, 5, 7, 9, 7, 5, 3];

  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {bars.map((height, i) => (
        <div
          key={i}
          style={{
            height: `${height * 4}px`,
            animationDelay: `${i * 80}ms`,
            animationDuration: "900ms",
          }}
          className={`w-2 rounded-full transition-colors ${
            active
              ? "bg-blue-500 animate-pulse"
              : connected
              ? "bg-blue-200"
              : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
