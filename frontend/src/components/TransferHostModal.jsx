import React, { useState } from 'react';
import { HiX } from 'react-icons/hi';
import './TransferHostModal.scss';

const TransferHostModal = ({ players, currentHostId, onConfirm, onCancel }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const availablePlayers = players.filter(
    (p) => p.user?._id?.toString() !== currentHostId?.toString()
  );

  const handleConfirm = () => {
    if (selectedPlayerId) {
      onConfirm(selectedPlayerId);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="transfer-host-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chọn người thay thế làm chủ cái</h3>
          <button type="button" className="close-btn" onClick={onCancel}>
            <HiX size={24} />
          </button>
        </div>

        <div className="modal-content">
          {availablePlayers.length === 0 ? (
            <p className="no-players">Không có người chơi nào để chuyển</p>
          ) : (
            <div className="players-list">
              {availablePlayers.map((player) => (
                <label key={player.user?._id} className="player-option">
                  <input
                    type="radio"
                    name="newHost"
                    value={player.user?._id}
                    checked={selectedPlayerId === player.user?._id?.toString()}
                    onChange={() => setSelectedPlayerId(player.user?._id?.toString())}
                  />
                  <span className="player-name">
                    {player.user?.username || 'Người chơi'}
                  </span>
                  {player.user?.balance !== undefined && (
                    <span className="player-balance">
                      ({player.user.balance.toLocaleString()} xu)
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onCancel}>
            Hủy
          </button>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedPlayerId || availablePlayers.length === 0}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferHostModal;
