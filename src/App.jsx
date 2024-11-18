import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Use 'as Router' for clarity
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Chat from './pages/Chat.jsx';
import { useTheme } from './contexts/ThemeContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

const App = () => {
  const { theme } = useTheme();

  return (
    <div data-theme={theme} className="h-full">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/chat/*" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
};

export default App;
