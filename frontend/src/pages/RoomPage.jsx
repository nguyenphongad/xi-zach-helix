import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import GameRoom from '../components/GameRoom.jsx';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (e) {
        // Không có token hoặc token hết hạn -> quay lại trang login
        localStorage.removeItem('token');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (loading) {
    return <div className="App">Đang tải...</div>;
  }

  if (!roomId) {
    navigate('/');
    return null;
  }

  return (
    <GameRoom
      user={user}
      room={{ roomId }}
      onLeaveRoom={() => navigate('/')}
    />
  );
};

export default RoomPage;

