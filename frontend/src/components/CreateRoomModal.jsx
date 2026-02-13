import React, { useState } from 'react';
import { HiX } from 'react-icons/hi';
import './CreateRoomModal.scss';
import api from '../services/api';

const CreateRoomModal = ({ gameType, onClose, onEnterRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [betAmount, setBetAmount] = useState(100);
  const [drawTime, setDrawTime] = useState(30);
  const [password, setPassword] = useState('0000');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      const response = await api.post('/game/create-room', {
        gameType,
        roomName: roomName.trim() || undefined,
        betAmount,
        drawTime,
        password,
      });
      // Sau khi tạo bàn xong, chuyển sang router của bàn
      window.location.href = `/room/${response.data.roomId}`;
      onClose();
    } catch (error) {
      alert('Tạo bàn thất bại, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo bàn chơi</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            <HiX size={24} />
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Trò chơi</label>
            <div className="readonly-field">
              {gameType === 'xizach' && 'Xì Zách'}
              {gameType === 'tienlenmiennam' && 'Tiến Lên Miền Nam'}
            </div>
          </div>

          <div className="form-group">
            <label>Tên bàn (tùy chọn)</label>
            <input
              type="text"
              placeholder="Nhập tên bàn"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Mức cược (xu)</label>
            <input
              type="number"
              min="10"
              step="10"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Thời gian rút bài (giây)</label>
            <select
              value={drawTime}
              onChange={(e) => setDrawTime(Number(e.target.value))}
            >
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
            </select>
          </div>

          <div className="form-group">
            <label>Mật khẩu bàn (4 số)</label>
            <input
              type="text"
              maxLength={4}
              value={password}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPassword(value);
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Hủy
          </button>
          <button
            className="create-btn"
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo bàn'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;

