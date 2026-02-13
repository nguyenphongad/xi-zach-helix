import React from 'react';
import { IoWarning } from 'react-icons/io5';
import './ConfirmModal.scss';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy' }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <IoWarning className="confirm-icon" />
          <h3>{title}</h3>
        </div>
        <div className="confirm-modal-content">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button type="button" className="confirm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="confirm-btn-ok" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
