import React, { useState, useEffect } from 'react';
import { HiInformationCircle } from 'react-icons/hi';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import InfoModal from './InfoModal.jsx';
import AudioController from './AudioController.jsx';
import PasswordModal from './PasswordModal.jsx';
import api from '../services/api';
import './LoginPage.scss';

const LoginPage = ({ onLogin }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
    setShowPassword(true);
  };

  const handleLogin = async (password) => {
    try {
      const response = await api.post('/auth/login', {
        userId: selectedUser._id,
        password,
      });

      localStorage.setItem('token', response.data.token);
      onLogin(response.data.user);
    } catch (error) {
      alert('Mật khẩu không chính xác!');
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <button type="button" className="info-btn" onClick={() => setShowInfo(true)}>
          <HiInformationCircle size={24} />
        </button>
        <AudioController />
      </header>

      <div className="login-body">
        <div className="logo">
          <img
            src="/assets/logo.png"
            alt="Game Logo"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <h1>XÌ ZÁCH ONLINE</h1>
        </div>

        <div className="user-selection">
          <div className="custom-dropdown">
            <div
              className="dropdown-header"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedUser ? selectedUser.username : 'Chọn người chơi'}
              {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
            </div>

            {isDropdownOpen && (
              <div className="dropdown-list">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="dropdown-item"
                    onClick={() => handleUserSelect(user)}
                  >
                    {user.username}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showPassword && (
        <PasswordModal
          onConfirm={handleLogin}
          onCancel={() => {
            setShowPassword(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default LoginPage;

