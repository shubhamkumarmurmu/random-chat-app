import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Auth from'./pages/Auth';
import Lobby from './pages/Lobby';
import Chat from './pages/Chat';


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/lobby" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <Lobby />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:sessionId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
