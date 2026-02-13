import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import HomePage from './components/HomePage.jsx';
import api from './services/api';
import './App.scss';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra token khi mount
    const token = localStorage.getItem('token');
    if (token) {
      // Gọi API để lấy thông tin user từ token
      api.get('/auth/me')
        .then((response) => {
          setUser(response.data);
          setCurrentPage('home');
        })
        .catch(() => {
          // Token không hợp lệ, xóa và quay về login
          localStorage.removeItem('token');
          setCurrentPage('login');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('login');
  };

  if (loading) {
    return <div className="App">Đang tải...</div>;
  }

  return (
    <div className="App">
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'home' && (
        <HomePage
          user={user}
          onEnterRoom={() => {}}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;

