import React, { useState, useEffect } from 'react';
import { HiPlus, HiUsers } from 'react-icons/hi';
import { IoMdCash } from 'react-icons/io';
import { IoLockClosed } from 'react-icons/io5';
import api from '../services/api';
import AudioController from './AudioController.jsx';
import PasswordModal from './PasswordModal.jsx';
import CreateRoomModal from './CreateRoomModal.jsx';
import './GameLobby.scss';

const GameLobby = ({ gameType, user, onEnterRoom, onBack }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 3000); // Refresh mỗi 3 giây
    return () => clearInterval(interval);
  }, [gameType]);

  const loadRooms = async () => {
    try {
      const response = await api.get(`/game/rooms?gameType=${gameType}`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (room) => {
    const currentPlayers = room.players?.length || 0;
    // Bàn đã đủ 7/7 (bao gồm cả nhà cái) thì không cho join
    if (currentPlayers >= 7) {
      // eslint-disable-next-line no-alert
      alert('Bàn đã đầy, không thể tham gia');
      return;
    }

    if (room.settings.password) {
      setSelectedRoom(room);
      setShowPassword(true);
    } else {
      joinRoom(room.roomId, '');
    }
  };

  const joinRoom = async (roomId, password) => {
    try {
      const response = await api.post('/game/join-room', { roomId, password });
      // Đẩy router tới trang bàn, để reload vẫn giữ nguyên bàn
      window.location.href = `/room/${response.data.roomId}`;
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể tham gia bàn');
    }
  };

  const handlePasswordConfirm = (password) => {
    if (selectedRoom) {
      joinRoom(selectedRoom.roomId, password);
      setShowPassword(false);
      setSelectedRoom(null);
    }
  };

  return (
    <div className="game-lobby">
      <header className="lobby-header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Quay lại
        </button>
        <h2>{gameType === 'xizach' ? 'Xì Zách' : 'Tiến Lên Miền Nam'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AudioController />
          <button
            type="button"
            className="create-room-btn"
            onClick={() => setShowCreateRoom(true)}
          >
            <HiPlus />
            Tạo bàn
          </button>
        </div>
      </header>

      <div className="lobby-content">
        {loading ? (
          <div className="lobby-loading">Đang tải danh sách bàn...</div>
        ) : rooms.length === 0 ? (
          <div className="lobby-empty">
            <p>Chưa có bàn nào đang mở</p>
            <button
              type="button"
              className="create-room-btn-large"
              onClick={() => setShowCreateRoom(true)}
            >
              <HiPlus />
              Tạo bàn đầu tiên
            </button>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div
                key={room._id}
                className="room-card"
                onClick={() => handleJoinRoom(room)}
              >
                <div className="room-card-header">
                  <h3>{room.roomName || `Bàn ${room.roomId}`}</h3>
                  {room.settings.password && (
                    <IoLockClosed className="lock-icon" title="Có mật khẩu" />
                  )}
                </div>
                <div className="room-card-info">
                  <div className="room-info-item">
                    <IoMdCash />
                    <span>Cược: {room.settings.betAmount?.toLocaleString()} xu</span>
                  </div>
                  <div className="room-info-item">
                    <HiUsers />
                    <span>
                      {room.players?.length || 0}/7 người chơi
                    </span>
                  </div>
                  <div className="room-info-item">
                    <span>Chủ bàn: {room.host?.username || 'N/A'}</span>
                  </div>
                  <div className="room-info-item">
                    <span>
                      Trạng thái:{' '}
                      {room.gameState?.status === 'playing' ? 'Đang chơi' : 'Đang chờ'}
                    </span>
                  </div>
                </div>
                <div className="room-card-footer">
                  <button type="button" className="join-btn">
                    Tham gia
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPassword && selectedRoom && (
        <PasswordModal
          onConfirm={handlePasswordConfirm}
          onCancel={() => {
            setShowPassword(false);
            setSelectedRoom(null);
          }}
        />
      )}

      {showCreateRoom && (
        <CreateRoomModal
          gameType={gameType}
          onClose={() => setShowCreateRoom(false)}
          onEnterRoom={(roomData) => {
            setShowCreateRoom(false);
            onEnterRoom(roomData);
          }}
        />
      )}
    </div>
  );
};

export default GameLobby;
