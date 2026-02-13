import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { HiMenu, HiX, HiUserGroup, HiLogout, HiUserAdd, HiOutlineCash } from 'react-icons/hi';
import './AdminLayout.scss';

const AdminLayout = ({ admin, onLogout }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('adminToken');
    onLogout();
    navigate('/admin');
  };

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">Admin</span>
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin/create-players"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <HiUserAdd />
            <span>Tạo người chơi</span>
          </NavLink>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <HiUserGroup />
            <span>Danh sách người chơi</span>
          </NavLink>
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-balance">
            <div className="admin-balance">
              <HiOutlineCash />
              <span>
                Số dư admin: {(admin?.balance ?? 0).toLocaleString()} xu
              </span>
            </div>
          </div>
          <div className="admin-header-user">
            <span>{admin?.username}</span>
            <button type="button" className="admin-header-logout" onClick={handleLogout}>
              <HiLogout />
              Đăng xuất
            </button>
          </div>
        </header>
        <Outlet />

        {logoutConfirmOpen && (
          <div
            className="admin-modal-overlay"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div
              className="admin-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Đăng xuất</h3>
              <p className="admin-modal-message">
                Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?
              </p>
              <div className="admin-modal-actions">
                <button type="button" onClick={() => setLogoutConfirmOpen(false)}>
                  Hủy
                </button>
                <button type="button" onClick={handleConfirmLogout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
