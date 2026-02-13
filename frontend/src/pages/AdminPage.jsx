import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import adminApi from '../services/adminApi';
import AdminLogin from './AdminLogin.jsx';
import AdminLayout from './AdminLayout.jsx';
import AdminPlayers from './AdminPlayers.jsx';
import AdminCreatePlayers from './AdminCreatePlayers.jsx';

const AdminPage = () => {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setChecking(false);
      return;
    }
    adminApi
      .get('/admin/me')
      .then((res) => setAdmin(res.data))
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setChecking(false));
  }, []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (checking) {
    return (
      <div className="admin-loading-page">
        <div className="admin-loading-spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <AdminLogin
        onLogin={(adminData) => setAdmin(adminData)}
      />
    );
  }

  return (
    <Routes>
      <Route
        path="/*"
        element={<AdminLayout admin={admin} onLogout={() => setAdmin(null)} />}
      >
        <Route
          index
          element={
            <AdminPlayers
              key={refreshKey}
              admin={admin}
              onLogout={() => setAdmin(null)}
              onAdminRefresh={setAdmin}
            />
          }
        />
        <Route
          path="create-players"
          element={<AdminCreatePlayers onRefresh={handleRefresh} />}
        />
      </Route>
    </Routes>
  );
};

export default AdminPage;
