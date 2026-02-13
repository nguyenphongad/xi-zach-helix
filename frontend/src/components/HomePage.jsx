import React, { useState } from 'react';
import { HiUser } from 'react-icons/hi';
import { IoMdCash } from 'react-icons/io';
import ProfileModal from './ProfileModal.jsx';
import AudioController from './AudioController.jsx';
import GameLobby from './GameLobby.jsx';
import './HomePage.scss';

const HomePage = ({ user, onEnterRoom, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const handleGameSelect = (gameType) => {
    setSelectedGame(gameType);
  };

  const handleBack = () => {
    setSelectedGame(null);
  };

  if (selectedGame) {
    return (
      <GameLobby
        gameType={selectedGame}
        user={user}
        onEnterRoom={onEnterRoom}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="balance">
          <IoMdCash size={24} />
          <span>{user.balance.toLocaleString()} xu</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AudioController />
          <button type="button" className="profile-btn" onClick={() => setShowProfile(true)}>
            <HiUser size={24} />
          </button>
        </div>
      </header>

      <div className="home-body">
        <h1 className="welcome-title">Chọn trò chơi</h1>

        <div className="games-grid">
          <div className="game-card" onClick={() => handleGameSelect('xizach')}>
            <div className="game-icon">🃏</div>
            <h3>Xì Zách</h3>
          </div>

          <div className="game-card disabled">
            <div className="game-icon">🎴</div>
            <h3>Tiến Lên Miền Nam</h3>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="game-card disabled">
            <div className="game-icon">🎲</div>
            <h3>Đang phát triển</h3>
            <span className="coming-soon">Coming Soon</span>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  );
};

export default HomePage;

