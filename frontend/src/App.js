import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('home');
  };

  const handleEnterRoom = (roomData) => {
    setCurrentRoom(roomData);
    setCurrentPage('game');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentRoom(null);
    setCurrentPage('login');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPage('home');
  };

  return (
    <div className="App">
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'home' && <HomePage user={user} onEnterRoom={handleEnterRoom} onLogout={handleLogout} />}
      {currentPage === 'game' && <GameRoom user={user} room={currentRoom} onLeaveRoom={handleLeaveRoom} />}
    </div>
  );
}

export default App;
