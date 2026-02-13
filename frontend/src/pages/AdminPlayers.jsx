import React, { useState, useEffect } from 'react';
import {
  HiRefresh,
  HiCheckCircle,
  HiXCircle,
  HiCurrencyDollar,
  HiOutlineCash,
} from 'react-icons/hi';
import adminApi from '../services/adminApi';
import './AdminPlayers.scss';

const AdminPlayers = ({ admin, onLogout, onAdminRefresh }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferAllOpen, setTransferAllOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [modalPass, setModalPass] = useState({ id: null, newPassword: '' });
  const [adminBalance, setAdminBalance] = useState(admin?.balance ?? 0);
  const [messageModal, setMessageModal] = useState({
    open: false,
    title: '',
    message: '',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [singleTransfer, setSingleTransfer] = useState({
    open: false,
    player: null,
    amount: '',
  });
  const [singleDeduct, setSingleDeduct] = useState({
    open: false,
    player: null,
    amount: '',
  });

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const [playersRes, meRes] = await Promise.all([
        adminApi.get('/admin/players'),
        adminApi.get('/admin/me'),
      ]);
      setPlayers(playersRes.data);
      setAdminBalance(meRes.data.balance);
      if (onAdminRefresh) {
        onAdminRefresh(meRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleChangePassword = async (id) => {
    if (!modalPass.newPassword || modalPass.newPassword.length < 4) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: 'Mật khẩu tối thiểu 4 ký tự',
      });
      return;
    }
    try {
      await adminApi.patch(`/admin/players/${id}/password`, {
        newPassword: modalPass.newPassword,
      });
      setModalPass({ id: null, newPassword: '' });
      setMessageModal({
        open: true,
        title: 'Thành công',
        message: 'Đã đổi mật khẩu',
      });
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    }
  };

  const handleSetActive = async (id) => {
    try {
      await adminApi.patch(`/admin/players/${id}/active`);
      loadPlayers();
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    }
  };

  const openTransferOne = (player) => {
    setSingleTransfer({
      open: true,
      player,
      amount: '',
    });
  };

  const handleTransferOne = async () => {
    const num = parseInt(singleTransfer.amount, 10);
    if (!Number.isInteger(num) || num <= 0) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: 'Vui lòng nhập số xu hợp lệ',
      });
      return;
    }
    try {
      await adminApi.post(`/admin/players/${singleTransfer.player._id}/transfer`, {
        amount: num,
      });
      setSingleTransfer({
        open: false,
        player: null,
        amount: '',
      });
      await loadPlayers();
      setMessageModal({
        open: true,
        title: 'Thành công',
        message: 'Chuyển xu thành công',
      });
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    }
  };

  const openDeductOne = (player) => {
    setSingleDeduct({
      open: true,
      player,
      amount: '',
    });
  };

  const handleDeductOne = async () => {
    const num = parseInt(singleDeduct.amount, 10);
    if (!Number.isInteger(num) || num <= 0) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: 'Vui lòng nhập số xu hợp lệ',
      });
      return;
    }
    if (num >= (singleDeduct.player.balance || 0)) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: 'Số xu cần trừ phải nhỏ hơn số dư hiện tại của người chơi',
      });
      return;
    }
    try {
      await adminApi.post(`/admin/players/${singleDeduct.player._id}/deduct`, { amount: num });
      setSingleDeduct({
        open: false,
        player: null,
        amount: '',
      });
      await loadPlayers();
      setMessageModal({
        open: true,
        title: 'Thành công',
        message: 'Đã trừ xu người chơi',
      });
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    }
  };

  const handleDeletePlayer = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.delete(`/admin/players/${deleteTarget._id}`);
      setDeleteTarget(null);
      loadPlayers();
      setMessageModal({
        open: true,
        title: 'Thành công',
        message: 'Đã xóa người chơi',
      });
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === players.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(players.map((p) => p._id)));
  };

  const handleTransferAll = async () => {
    const num = parseInt(transferAmount, 10);
    if (selectedIds.size === 0 || !Number.isInteger(num) || num <= 0) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: 'Chọn ít nhất một người chơi và nhập số xu hợp lệ',
      });
      return;
    }
    setTransferLoading(true);
    try {
      await adminApi.post('/admin/transfer-all', {
        playerIds: Array.from(selectedIds),
        amount: num,
      });
      setTransferAllOpen(false);
      setTransferAmount('');
      setSelectedIds(new Set());
      loadPlayers();
      setMessageModal({
        open: true,
        title: 'Thành công',
        message: 'Chuyển xu thành công',
      });
    } catch (e) {
      setMessageModal({
        open: true,
        title: 'Lỗi',
        message: e.response?.data?.message || 'Lỗi',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="admin-players">
      <div className="admin-players-toolbar">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => setTransferAllOpen(true)}
        >
          <HiCurrencyDollar />
          Chuyển xu tất cả
        </button>
      </div>

      <div className="admin-players-table-wrap">
        {loading ? (
          <div className="admin-loading">Đang tải...</div>
        ) : (
          <table className="admin-players-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Người chơi</th>
                <th>Số dư (xu)</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p._id} className={!p.isActive ? 'inactive' : ''}>
                  <td>{i + 1}</td>
                  <td>{p.username}</td>
                  <td>{p.balance?.toLocaleString() ?? 0}</td>
                  <td>
                    <span className={`badge ${p.isActive ? 'active' : 'inactive'}`}>
                      {p.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                    {p.isOnline && <span className="badge online">Online</span>}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        type="button"
                        className="action-btn"
                        title="Đổi mật khẩu"
                        onClick={() => setModalPass({ id: p._id, newPassword: '' })}
                      >
                        <HiRefresh />
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        title={p.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        onClick={() => handleSetActive(p._id)}
                      >
                        {p.isActive ? <HiXCircle /> : <HiCheckCircle />}
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        title="Chuyển xu"
                        onClick={() => openTransferOne(p)}
                      >
                        <HiCurrencyDollar />
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        title="Trừ xu"
                        onClick={() => openDeductOne(p)}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        title="Xóa người chơi"
                        onClick={() => setDeleteTarget(p)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalPass.id && (
        <div className="admin-modal-overlay" onClick={() => setModalPass({ id: null, newPassword: '' })}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Đổi mật khẩu</h3>
            <input
              type="text"
              placeholder="Mật khẩu mới (tối thiểu 4 ký tự)"
              value={modalPass.newPassword}
              onChange={(e) => setModalPass((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setModalPass({ id: null, newPassword: '' })}>
                Hủy
              </button>
              <button type="button" onClick={() => handleChangePassword(modalPass.id)}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {transferAllOpen && (
        <div className="admin-modal-overlay" onClick={() => !transferLoading && setTransferAllOpen(false)}>
          <div className="admin-modal admin-modal-transfer" onClick={(e) => e.stopPropagation()}>
            <h3>Chuyển xu cho nhiều người chơi</h3>
            <div className="transfer-all-list">
              <label className="select-all">
                <input type="checkbox" checked={selectedIds.size === players.length} onChange={selectAll} />
                Chọn tất cả
              </label>
              {players.map((p) => (
                <label key={p._id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p._id)}
                    onChange={() => toggleSelect(p._id)}
                  />
                  {p.username} ({p.balance?.toLocaleString()} xu)
                </label>
              ))}
            </div>
            <label>
              Số xu chuyển cho mỗi người
              <div className="amount-input">
                <input
                  type="number"
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <span className="amount-unit">xu</span>
              </div>
            </label>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => !transferLoading && setTransferAllOpen(false)}>
                Hủy
              </button>
              <button type="button" onClick={handleTransferAll} disabled={transferLoading}>
                {transferLoading ? 'Đang xử lý...' : 'Chuyển xu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {singleTransfer.open && (
        <div
          className="admin-modal-overlay"
          onClick={() =>
            setSingleTransfer({
              open: false,
              player: null,
              amount: '',
            })
          }
        >
          <div
            className="admin-modal admin-modal-amount"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              Chuyển xu cho{' '}
              <strong>{singleTransfer.player?.username}</strong>
            </h3>
            <label>
              Số xu cần chuyển
              <div className="amount-input">
                <input
                  type="number"
                  min="1"
                  value={singleTransfer.amount}
                  onChange={(e) =>
                    setSingleTransfer((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
                <span className="amount-unit">xu</span>
              </div>
            </label>
            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setSingleTransfer({
                    open: false,
                    player: null,
                    amount: '',
                  })
                }
              >
                Hủy
              </button>
              <button type="button" onClick={handleTransferOne}>
                Chuyển xu
              </button>
            </div>
          </div>
        </div>
      )}

      {singleDeduct.open && (
        <div
          className="admin-modal-overlay"
          onClick={() =>
            setSingleDeduct({
              open: false,
              player: null,
              amount: '',
            })
          }
        >
          <div
            className="admin-modal admin-modal-amount"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              Trừ xu người chơi{' '}
              <strong>{singleDeduct.player?.username}</strong>
            </h3>
            <label>
              Số xu cần trừ
              <div className="amount-input">
                <input
                  type="number"
                  min="1"
                  value={singleDeduct.amount}
                  onChange={(e) =>
                    setSingleDeduct((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
                <span className="amount-unit">xu</span>
              </div>
            </label>
            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setSingleDeduct({
                    open: false,
                    player: null,
                    amount: '',
                  })
                }
              >
                Hủy
              </button>
              <button type="button" onClick={handleDeductOne}>
                Trừ xu
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="admin-modal-overlay"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Xóa người chơi</h3>
            <p className="admin-modal-message">
              Bạn chắc chắn muốn xóa người chơi{' '}
              <strong>{deleteTarget.username}</strong>?
            </p>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button type="button" onClick={handleDeletePlayer}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {messageModal.open && (
        <div
          className="admin-modal-overlay"
          onClick={() =>
            setMessageModal((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {messageModal.title && <h3>{messageModal.title}</h3>}
            <p className="admin-modal-message">{messageModal.message}</p>
            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setMessageModal((prev) => ({
                    ...prev,
                    open: false,
                  }))
                }
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlayers;
