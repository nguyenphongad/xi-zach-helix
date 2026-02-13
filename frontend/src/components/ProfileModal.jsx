import React, { useState } from 'react';
import { HiX, HiUserCircle } from 'react-icons/hi';
import ConfirmModal from './ConfirmModal.jsx';
import './ProfileModal.scss';

const ProfileModal = ({ user, onClose, onLogout }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    setShowConfirm(false);
    onClose();
    onLogout();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Trang cá nhân</h3>
            <button type="button" className="close-btn" onClick={onClose}>
              <HiX size={24} />
            </button>
          </div>

          <div className="modal-content">
            <div className="profile-info">
              <div className="avatar">
                <HiUserCircle size={50} />
              </div>
              <div className="info">
                <h4>{user?.username}</h4>
                <p>Số dư: {user?.balance?.toLocaleString()} xu</p>
              </div>
            </div>

            <div className="profile-actions">
              <button className="history-btn" disabled>
                Lịch sử chơi (đang phát triển)
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="logout-btn"
              onClick={() => setShowConfirm(true)}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Xác nhận đăng xuất"
          message="Bạn có chắc chắn muốn đăng xuất không?"
          onConfirm={handleLogout}
          onCancel={() => setShowConfirm(false)}
          confirmText="Đăng xuất"
        />
      )}
    </>
  );
};

export default ProfileModal;

