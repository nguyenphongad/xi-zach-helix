import React from 'react';
import { HiX } from 'react-icons/hi';
import { IoWarning } from 'react-icons/io5';
import './InfoModal.scss';

const InfoModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Thông tin quan trọng</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            <HiX size={24} />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="warning-section">
            <IoWarning size={48} />
            <h4>Lưu ý quan trọng</h4>
          </div>
          
          <ul className="info-list">
            <li>🎮 Đây là trò chơi giải trí, không phải cá độ</li>
            <li>⚖️ Không vi phạm pháp luật Việt Nam</li>
            <li>🎯 Chỉ dành cho mục đích vui chơi</li>
            <li>👥 Phù hợp cho mọi lứa tuổi</li>
            <li>🎲 Xu trong game không có giá trị thật</li>
            <li>🤝 Chơi fair play và tôn trọng người chơi khác</li>
          </ul>
          
          <div className="game-rules">
            <h4>Luật chơi cơ bản:</h4>
            <p>• Mục tiêu: Đạt tổng điểm gần 21 nhất mà không quá 21</p>
            <p>• Xì dách: A + (10, J, Q, K) = Thắng ngay</p>
            <p>• Xì bàng: 2 con A = Thắng tất cả (trừ xì dách)</p>
            <p>• Quắc: Tổng điểm > 21 = Thua ngay</p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="confirm-btn" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;

