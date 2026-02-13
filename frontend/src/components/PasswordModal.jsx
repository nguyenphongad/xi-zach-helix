import React, { useState } from 'react';
import './PasswordModal.scss';

const PasswordModal = ({ onConfirm, onCancel }) => {
  const [password, setPassword] = useState(['', '', '', '']);

  const handleInputChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPassword = [...password];
      newPassword[index] = value;
      setPassword(newPassword);

      // Auto focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`password-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !password[index] && index > 0) {
      const prevInput = document.getElementById(`password-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleConfirm = () => {
    const fullPassword = password.join('');
    if (fullPassword.length === 4) {
      onConfirm(fullPassword);
    } else {
      alert('Vui lòng nhập đủ 4 số!');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="password-modal">
        <div className="modal-header">
          <h3>Nhập mật khẩu</h3>
        </div>
        
        <div className="password-inputs">
          {password.map((digit, index) => (
            <input
              key={index}
              id={`password-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="password-digit"
              maxLength="1"
              autoFocus={index === 0}
            />
          ))}
        </div>
        
        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onCancel}>
            Hủy
          </button>
          <button className="ok-btn" onClick={handleConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;

