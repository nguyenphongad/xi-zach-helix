import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiTrash, HiCheckCircle, HiXCircle, HiX, HiUserAdd } from 'react-icons/hi';
import adminApi from '../services/adminApi';
import './AdminCreatePlayers.scss';

const AdminCreatePlayers = ({ onRefresh }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [players, setPlayers] = useState([
    { username: '', password: '' },
    { username: '', password: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const addRow = () => {
    setPlayers([...players, { username: '', password: '' }]);
  };

  const removeRow = (index) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index, field, value) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const handleSubmit = async () => {
    // Lọc các hàng có đủ username và password
    const validPlayers = players.filter(
      (p) => p.username.trim() && p.password.trim()
    );

    if (validPlayers.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Vui lòng nhập ít nhất một người chơi với đầy đủ username và password');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await adminApi.post('/admin/players/create', {
        players: validPlayers.map((p) => ({
          username: p.username.trim(),
          password: p.password.trim(),
        })),
      });

      setResult(response.data.results);

      // Xóa các hàng đã tạo thành công
      const failedUsernames = new Set(
        response.data.results.failed.map((f) => f.username)
      );
      const newPlayers = players.filter(
        (p) => !p.username.trim() || failedUsernames.has(p.username.trim())
      );

      // Nếu tất cả đều thành công, reset về 2 hàng trống
      if (response.data.results.failed.length === 0) {
        setPlayers([
          { username: '', password: '' },
          { username: '', password: '' },
        ]);
      } else {
        setPlayers(newPlayers.length > 0 ? newPlayers : [{ username: '', password: '' }]);
      }

      // Refresh danh sách người chơi nếu có callback
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 1000);
      }

      // Đóng modal nếu tất cả đều thành công
      if (response.data.results.failed.length === 0) {
        setTimeout(() => {
          setShowModal(false);
        }, 2000);
      }
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.response?.data?.message || 'Tạo người chơi thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setResult(null);
    // Reset form về 2 hàng trống
    setPlayers([
      { username: '', password: '' },
      { username: '', password: '' },
    ]);
  };

  return (
    <div className="admin-create-players">
      <div className="admin-create-players-header">
        <h2>Tạo người chơi</h2>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => navigate('/admin')}
        >
          Quay lại danh sách
        </button>
      </div>

      <div className="admin-create-players-empty">
        <div className="empty-state">
          <HiUserAdd className="empty-icon" />
          <p>Tạo người chơi mới cho hệ thống</p>
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-large"
            onClick={() => setShowModal(true)}
          >
            <HiUserAdd />
            Tạo người chơi
          </button>
        </div>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={handleCloseModal}>
          <div className="admin-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo người chơi</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
              >
                <HiX />
              </button>
            </div>

            <div className="modal-content">
              <div className="create-players-table-wrap">
                <div className="table-header">
                  <div className="table-header-cell">STT</div>
                  <div className="table-header-cell">Username</div>
                  <div className="table-header-cell">Password</div>
                  <div className="table-header-cell">Thao tác</div>
                </div>

                <div className="table-body">
                  {players.map((player, index) => (
                    <div key={index} className="table-row">
                      <div className="table-cell">{index + 1}</div>
                      <div className="table-cell">
                        <input
                          type="text"
                          placeholder="Nhập username"
                          value={player.username}
                          onChange={(e) => updatePlayer(index, 'username', e.target.value)}
                        />
                      </div>
                      <div className="table-cell">
                        <input
                          type="text"
                          placeholder="Nhập password"
                          value={player.password}
                          onChange={(e) => updatePlayer(index, 'password', e.target.value)}
                        />
                      </div>
                      <div className="table-cell">
                        <button
                          type="button"
                          className="action-btn-remove"
                          onClick={() => removeRow(index)}
                          disabled={players.length === 1}
                          title="Xóa hàng"
                        >
                          <HiTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="table-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-add"
                    onClick={addRow}
                  >
                    <HiPlus />
                    Thêm hàng
                  </button>
                </div>
              </div>

              <div className="create-players-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Đang tạo...' : 'Tạo người chơi'}
                </button>
              </div>

              {result && (
                <div className="create-players-result">
                  <h3>Kết quả:</h3>
                  {result.success.length > 0 && (
                    <div className="result-success">
                      <h4>
                        <HiCheckCircle /> Thành công ({result.success.length})
                      </h4>
                      <ul>
                        {result.success.map((p, i) => (
                          <li key={i}>{p.username}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.failed.length > 0 && (
                    <div className="result-failed">
                      <h4>
                        <HiXCircle /> Thất bại ({result.failed.length})
                      </h4>
                      <ul>
                        {result.failed.map((f, i) => (
                          <li key={i}>
                            <strong>{f.username}</strong>: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCreatePlayers;
