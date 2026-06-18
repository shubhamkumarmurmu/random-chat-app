import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Chat } from './components/Chat';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <Chat /> : <AuthForm />;
}

export default App;
