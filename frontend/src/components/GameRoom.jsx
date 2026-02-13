import React, { useEffect, useState, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import { FaCrown } from 'react-icons/fa';
import io from 'socket.io-client';
import AudioController from './AudioController.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import TransferHostModal from './TransferHostModal.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import './GameRoom.scss';

const socket = io('http://localhost:5000', {
  autoConnect: false,
});

// 7 vị trí: slot 0 là nhà cái (chủ bàn) + 6 ghế người chơi quanh bàn
const emptySeats = Array.from({ length: 7 });

const GameRoom = ({ user, room, onLeaveRoom }) => {
  const [roomState, setRoomState] = useState(null);
  const [donateTarget, setDonateTarget] = useState(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferHost, setShowTransferHost] = useState(false);
  const [actionPlayer, setActionPlayer] = useState(null); // player được click
  const [showActionMenu, setShowActionMenu] = useState(false); // menu Donate/Kick
  const [kickTarget, setKickTarget] = useState(null);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(null);
  const timerRef = useRef(null);
  const [balanceNotice, setBalanceNotice] = useState(null);
  const [isDealing, setIsDealing] = useState(false);
  const [showInitialCards, setShowInitialCards] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [hostStage, setHostStage] = useState(false);
  const [hostCountdown, setHostCountdown] = useState(null);
  const [hostSelectedPlayerId, setHostSelectedPlayerId] = useState(null);
  const hostTimerRef = useRef(null);

  useEffect(() => {
    if (!user || !room) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinRoom', { roomId: room.roomId, userId: user.id });

    socket.on('roomUpdate', (data) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] roomUpdate', data);
      setRoomState(data);
      setLoading(false);
    });

    socket.on('gameStarted', (data) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] gameStarted', data);
      setRoomState(data);
      setLoading(false);
      // 2s: hiển thị trạng thái \"Đang phát bài\" nhưng chưa lật bài
      setShowInitialCards(false);
      setIsDealing(false);
      setTimeout(() => {
        // Bắt đầu lật bài + hiệu ứng chia trong 3s
        setShowInitialCards(true);
        setIsDealing(true);
        setTimeout(() => {
          setIsDealing(false);
        }, 3000);
      }, 2000);
    });

    socket.on('playerTurn', ({ playerIndex, timeLeft: time }) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] playerTurn', { playerIndex, time });
      setCurrentPlayerIndex(playerIndex);
      if (time !== undefined) {
        startTimer(time, playerIndex);
      }
    });

    socket.on('playerHit', ({ player }) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] playerHit', player);
      setRoomState((prev) => {
        if (!prev) return prev;
        const newRoom = { ...prev };
        newRoom.players = prev.players.map((p) => {
          const prevId =
            p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
          const incomingId =
            player.user && player.user._id
              ? player.user._id.toString()
              : player.user?.toString();
          return prevId === incomingId ? player : p;
        });
        return newRoom;
      });
    });

    socket.on('playerStand', ({ player }) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] playerStand', player);
      setRoomState((prev) => {
        if (!prev) return prev;
        const newRoom = { ...prev };
        newRoom.players = prev.players.map((p) => {
          const prevId =
            p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
          const incomingId =
            player.user && player.user._id
              ? player.user._id.toString()
              : player.user?.toString();
          return prevId === incomingId ? player : p;
        });
        return newRoom;
      });
    });

    socket.on('hostTransferred', (data) => {
      setRoomState(data);
    });

    socket.on('roomDeleted', () => {
      setBalanceNotice({
        title: 'Bàn đã đóng',
        message: 'Bàn đã bị xóa vì không còn người chơi',
        type: 'info',
        onClose: () => {
          setBalanceNotice(null);
          onLeaveRoom();
        },
      });
    });

    socket.on('donateReceived', ({ toUserId, fromUser, amount }) => {
      if (user && user.id === toUserId) {
        setBalanceNotice({
          title: 'Nhận xu',
          message: `Bạn nhận được ${amount.toLocaleString()} xu từ người chơi ${fromUser.username}`,
          type: 'success',
        });
      }
    });

    socket.on('playerKicked', ({ targetUserId, roomName }) => {
      if (user && user.id === targetUserId) {
        setBalanceNotice({
          title: 'Bị kick khỏi bàn',
          message: 'Bạn đã bị kick ra khỏi phòng',
          type: 'error',
          onClose: () => {
            setBalanceNotice(null);
            onLeaveRoom();
          },
        });
      }
    });

    socket.on('hostShowResult', (payload) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] hostShowResult', payload);
      const { username, finalScore, outcome } = payload;
      let message = '';
      if (outcome === 'win') {
        message = `Nhà cái THUA trước người chơi ${username} (${finalScore} điểm)`;
      } else if (outcome === 'lose') {
        message = `Nhà cái THẮNG người chơi ${username} (${finalScore} điểm)`;
      } else {
        message = `Nhà cái HÒA với người chơi ${username} (${finalScore} điểm)`;
      }
      setBalanceNotice({
        title: 'So sánh kết quả',
        message,
        type: 'info',
        onClose: () => setBalanceNotice(null),
      });
    });
    socket.on('hostStage', (roomPayload) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] hostStage', roomPayload);
      setRoomState(roomPayload);
      setHostStage(true);
      setHostCountdown(60);
      if (hostTimerRef.current) {
        clearInterval(hostTimerRef.current);
      }
      hostTimerRef.current = setInterval(() => {
        setHostCountdown((prev) => {
          if (prev === null) return prev;
          if (prev <= 1) {
            clearInterval(hostTimerRef.current);
            hostTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('roundFinished', (payload) => {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] roundFinished', payload);
      setRoomState(payload.room);
      setRoundResult(payload);
      setTimeLeft(null);
      setCurrentPlayerIndex(null);
      setHostStage(false);
      setHostCountdown(null);
      if (hostTimerRef.current) {
        clearInterval(hostTimerRef.current);
        hostTimerRef.current = null;
      }
    });

    // Admin chuyển / trừ xu real-time
    socket.on('balanceUpdate', (payload) => {
      if (!payload || !user || payload.userId !== user.id) return;
      const title =
        payload.direction === 'increase'
          ? 'Tài khoản được cộng xu'
          : 'Tài khoản bị trừ xu';
      setBalanceNotice({
        title,
        message: payload.message,
        type: payload.direction === 'increase' ? 'success' : 'warning',
      });
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('playerTurn');
      socket.off('playerHit');
      socket.off('playerStand');
      socket.off('hostTransferred');
      socket.off('roomDeleted');
      socket.off('donateReceived');
      socket.off('playerKicked');
      socket.off('balanceUpdate');
      socket.off('hostStage');
      socket.off('hostShowResult');
      socket.off('roundFinished');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (hostTimerRef.current) {
        clearInterval(hostTimerRef.current);
      }
      socket.disconnect();
    };
  }, [user, room]);

  const startTimer = (totalTime, playerIndex) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(totalTime);
    setCurrentPlayerIndex(playerIndex);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Tự động dừng khi hết thời gian
          if (playerIndex === getCurrentPlayerIndex()) {
            socket.emit('stand', { roomId: room.roomId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getCurrentPlayerIndex = () => {
    if (roomState?.gameState?.currentPlayerIndex !== undefined) {
      return roomState.gameState.currentPlayerIndex;
    }
    return currentPlayerIndex;
  };

  const isHost = (() => {
    if (!roomState || !user || !roomState.host) return false;
    // host có thể là ObjectId string hoặc object đã populate
    if (typeof roomState.host === 'string') {
      return roomState.host === user.id;
    }
    if (roomState.host._id) {
      return roomState.host._id.toString() === user.id;
    }
    return false;
  })();

  const isMyTurn = () => {
    const currentIdx = getCurrentPlayerIndex();
    if (currentIdx === null || currentIdx === undefined) return false;
    const currentPlayer = roomState?.players?.[currentIdx];
    return currentPlayer && currentPlayer.user?._id?.toString() === user.id;
  };

  const canSeeCards = (player) => {
    if (!roomState?.gameState || roomState.gameState.status !== 'playing') {
      return false;
    }
    // Chỉ hiện bài của mình hoặc khi đã dừng/quắc
    if (player.user?._id?.toString() === user.id) return true;
    if (player.status === 'stand' || player.status === 'bust') return true;
    return false;
  };

  const canSeeDealerCards = () => {
    if (!roomState?.gameState || roomState.gameState.status !== 'playing') {
      return false;
    }
    // Chỉ hiện bài cái khi tất cả đã dừng hoặc quắc
    return roomState.players.every(
      (p) => p.status === 'stand' || p.status === 'bust'
    );
  };

  const handleHit = () => {
    if (isMyTurn()) {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] HIT clicked', {
        roomId: room.roomId,
        userId: user.id,
        currentPlayerIndex: getCurrentPlayerIndex(),
      });
      socket.emit('hit', { roomId: room.roomId });
    }
  };

  const handleStand = () => {
    if (isMyTurn()) {
      // eslint-disable-next-line no-console
      console.log('[GameRoom] STAND clicked', {
        roomId: room.roomId,
        userId: user.id,
        currentPlayerIndex: getCurrentPlayerIndex(),
      });
      socket.emit('stand', { roomId: room.roomId });
    }
  };

  const handleHostEndRound = () => {
    // eslint-disable-next-line no-console
    console.log('[GameRoom] hostEndRound clicked', {
      roomId: room.roomId,
      userId: user.id,
    });
    socket.emit('hostEndRound', { roomId: room.roomId });
  };

  const handleHostShowPlayer = (playerId) => {
    if (!playerId) return;
    // eslint-disable-next-line no-console
    console.log('[GameRoom] hostShowPlayer clicked', {
      roomId: room.roomId,
      userId: user.id,
      playerId,
    });
    setHostSelectedPlayerId(playerId);
    // Reset lại countdown 60s mỗi lần host chọn người (FE)
    setHostCountdown(60);
    if (hostTimerRef.current) {
      clearInterval(hostTimerRef.current);
    }
    hostTimerRef.current = setInterval(() => {
      setHostCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(hostTimerRef.current);
          hostTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Thông báo backend để so sánh kết quả và reset timer server 60s
    socket.emit('hostShowPlayer', { roomId: room.roomId, targetUserId: playerId });
  };

  const handleOpenPlayerActions = (player) => {
    if (!player?.user || player.user._id === user.id) return;
    setActionPlayer(player);
    setShowActionMenu(true);
  };

  const handleChooseDonate = () => {
    if (!actionPlayer?.user) return;
    setDonateTarget(actionPlayer);
    setDonateAmount('');
    setShowActionMenu(false);
  };

  const handleDonate = () => {
    const amount = Number(donateAmount);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số xu hợp lệ');
      return;
    }
    if (!roomState?.roomId || !donateTarget?.user?._id) {
      alert('Không xác định được bàn hoặc người nhận');
      return;
    }

    socket.emit('donate', {
      roomId: roomState.roomId,
      toUserId: donateTarget.user._id,
      amount,
    });
    setDonateTarget(null);
  };

  const handleLeaveClick = () => {
    if (isHost) {
      // Chủ cái phải chọn người thay thế
      setShowTransferHost(true);
    } else {
      setShowLeaveConfirm(true);
    }
  };

  const handleTransferHost = (newHostId) => {
    socket.emit('transferHost', { roomId: room.roomId, newHostId });
    setShowTransferHost(false);
    // Sau khi transfer, có thể rời bàn
    setTimeout(() => {
      handleLeaveConfirm();
    }, 500);
  };

  const handleLeaveConfirm = () => {
    socket.emit('leaveRoom', { roomId: room.roomId });
    setShowLeaveConfirm(false);
    onLeaveRoom();
  };

  const getTimerProgress = () => {
    if (!timeLeft || !roomState?.settings?.drawTime) return 0;
    return (timeLeft / roomState.settings.drawTime) * 100;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="game-room">
      <header className="game-room-header">
        <div className="room-info">
          <h3>{roomState?.roomName || room?.roomName || `Bàn: ${room?.roomId}`}</h3>
          <span>Game: Xì Zách</span>
        </div>
        <div className="actions">
          <AudioController />
          <button className="secondary" onClick={handleLeaveClick}>
            Rời bàn
          </button>
        </div>
      </header>

      <div className="table-area">
        {roomState?.gameState?.status === 'playing' && !showInitialCards && (
          <div className="dealing-overlay">
            <div className="dealing-box">
              <span>Đang phát bài...</span>
            </div>
          </div>
        )}
        <div className="table-circle">
          {/* Nhà cái ở hướng 12h */}
          <div className="dealer-slot">
            <div className="dealer-badge">
              <FaCrown className="dealer-icon" />
              <span>Nhà cái</span>
            </div>
            <div className="dealer" />
          </div>

          {/* 6 ghế người chơi xếp quanh bàn theo chiều kim đồng hồ */}
          {emptySeats.map((_, index) => {
            const player = roomState?.players?.find(
              (p) => p.position === index
            );
            const isCurrentTurn =
              roomState?.gameState?.status === 'playing' &&
              !hostStage &&
              getCurrentPlayerIndex() === index;
            const canSee = player && showInitialCards ? canSeeCards(player) : false;
            const isSelf =
              player && player.user?._id?.toString() === user.id;

            const isHostSeat =
              player &&
              roomState &&
              roomState.host &&
              ((typeof roomState.host === 'string' &&
                roomState.host === player.user?._id?.toString()) ||
                (roomState.host._id &&
                  roomState.host._id.toString() === player.user?._id?.toString()));

            const playerId = player?.user?._id?.toString();
            const isHostSelected =
              hostStage && isHost && playerId && hostSelectedPlayerId === playerId;

            return (
              <div
                key={index}
                className={`player-seat ${
                  player ? 'occupied' : 'empty'
                } position-${index} ${isCurrentTurn ? 'current-turn' : ''} ${
                  isSelf ? 'self-player' : ''
                } ${
                  isHostSelected ? 'host-selected' : ''
                }`}
                onClick={() => player && handleOpenPlayerActions(player)}
              >
                {player ? (
                  <>
                    <div className="player-name">
                      {isHostSeat && <FaCrown className="host-icon" />}
                      {player.user?.username || 'Người chơi'}
                    </div>
                    {player.user?.balance !== undefined && (
                      <div className="player-balance">
                        {player.user.balance.toLocaleString()} xu
                      </div>
                    )}
                    <div className="player-cards">
                      {player.cards.length > 0 &&
                        player.cards.map((card, idx) => (
                          <div
                            key={idx}
                            className={`card ${canSee ? '' : 'hidden'} ${
                              isDealing ? 'dealing' : ''
                            }`}
                            style={
                              isDealing
                                ? {
                                    animationDelay: `${(index * 2 + idx) * 0.15 + 0.3}s`,
                                  }
                                : undefined
                            }
                          >
                            {canSee ? card : '🂠'}
                          </div>
                        ))}
                    </div>
                    <div className="player-status">
                      {roomState?.gameState?.status === 'waiting' ? (
                        <span
                          className={
                            player.isReady ? 'status-ready' : 'status-not-ready'
                          }
                        >
                          {player.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                        </span>
                      ) : (
                        <span>
                          {`Đang có ${player.cards.length} lá${
                            canSee ? ` - ${player.score} điểm - ${player.status}` : ''
                          }`}
                        </span>
                      )}
                    </div>
                    {hostStage && isHost && !isHostSeat && player && (
                      <button
                        type="button"
                        className="host-show-btn"
                        onClick={() => handleHostShowPlayer(playerId)}
                      >
                        Hiện
                      </button>
                    )}
                    {roomState?.gameState?.status === 'playing' &&
                      isCurrentTurn &&
                      timeLeft !== null && (
                        <div className="player-timer">
                          <div className="player-timer-circle">
                            <svg viewBox="0 0 40 40">
                              <circle
                                className="timer-bg"
                                cx="20"
                                cy="20"
                                r="18"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                              />
                              <circle
                                className="timer-progress"
                                cx="20"
                                cy="20"
                                r="18"
                                fill="none"
                                stroke="#ffd700"
                                strokeWidth="3"
                                strokeDasharray={`${2 * Math.PI * 18}`}
                                strokeDashoffset={`${
                                  2 * Math.PI * 18 * (1 - getTimerProgress() / 100)
                                }`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="player-timer-text">{timeLeft}s</span>
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <span>Ghế trống</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {roomState?.gameState?.status === 'waiting' && (
        <footer className="game-actions">
          <button
            className="secondary"
            onClick={() => {
              if (!roomState?.players || roomState.players.length <= 1) {
                // eslint-disable-next-line no-alert
                alert('Phòng cần ít nhất 2 người mới có thể sẵn sàng');
                return;
              }
              // Debug: log khi bấm Sẵn sàng
              // eslint-disable-next-line no-console
              console.log('[GameRoom] Emitting toggleReady', {
                roomId: room.roomId,
                userId: user.id,
              });
              socket.emit('toggleReady', { roomId: room.roomId });
            }}
          >
            {roomState.players.find(
              (p) => p.user?._id?.toString() === user.id
            )?.isReady
              ? 'Hủy sẵn sàng'
              : 'Sẵn sàng'}
          </button>
        </footer>
      )}

      {roundResult && (
        <div
          className="modal-overlay"
          onClick={() => setRoundResult(null)}
        >
          <div
            className="notice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Kết quả ván chơi</h3>
            </div>
            <div className="modal-content">
              <div className="result-table">
                <div className="result-header">
                  <span>Người chơi</span>
                  <span>Bài</span>
                  <span>Điểm</span>
                  <span>Kết quả</span>
                </div>
                {roundResult.results.map((r) => {
                  const p = roundResult.room.players.find(
                    (pl) => pl.user._id === r.playerId
                  );
                  const cards = p?.cards || [];
                  const outcomeText =
                    r.outcome === 'win'
                      ? 'Thắng'
                      : r.outcome === 'lose'
                      ? 'Thua'
                      : 'Hòa';
                  return (
                    <div key={r.playerId} className="result-row">
                      <span>{p?.user?.username || r.playerId}</span>
                      <span>{cards.length ? cards.join(', ') : '-'}</span>
                      <span>{r.finalScore}</span>
                      <span>{outcomeText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="confirm-btn"
                onClick={() => setRoundResult(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {roomState?.gameState?.status === 'playing' && isMyTurn() && !hostStage && (
        <footer className="game-actions">
          <button className="secondary" onClick={handleHit} disabled={timeLeft === 0}>
            Rút bài
          </button>
          <button className="secondary" onClick={handleStand}>
            Dừng
          </button>
        </footer>
      )}

      {hostStage && (
        <footer className="game-actions">
          {isHost ? (
            <>
              <span style={{ color: '#fff', marginRight: 16 }}>
                Đang chờ bạn kết thúc ván
                {hostCountdown !== null ? ` (${hostCountdown}s)` : ''}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={handleHostEndRound}
              >
                Kết thúc ván
              </button>
            </>
          ) : (
            <span style={{ color: '#fff' }}>
              Đang chờ nhà cái kết thúc ván
              {hostCountdown !== null ? ` (${hostCountdown}s)` : ''}
            </span>
          )}
        </footer>
      )}

      {donateTarget && (
        <div className="modal-overlay" onClick={() => setDonateTarget(null)}>
          <div
            className="donate-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                Donate cho {donateTarget.user?.username || 'người chơi'}
              </h3>
              <button
                className="close-btn"
                onClick={() => setDonateTarget(null)}
              >
                <HiX size={20} />
              </button>
            </div>
            <div className="modal-content">
              <label>Số xu muốn donate</label>
              <input
                type="number"
                min="1"
                step="10"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setDonateTarget(null)}
              >
                Hủy
              </button>
              <button className="create-btn" onClick={handleDonate}>
                Donate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nhận donate real-time */}
      {/* Đăng ký listener một lần sau khi roomState có roomId */}

      {showTransferHost && roomState && (
        <TransferHostModal
          players={roomState.players}
          currentHostId={roomState.host}
          onConfirm={handleTransferHost}
          onCancel={() => setShowTransferHost(false)}
        />
      )}

      {showActionMenu && actionPlayer && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowActionMenu(false);
            setActionPlayer(null);
          }}
        >
          <div
            className="donate-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{actionPlayer.user?.username}</h3>
            </div>
            <div className="modal-content">
              <div className="player-actions-menu">
                <button
                  type="button"
                  className="create-btn"
                  onClick={handleChooseDonate}
                >
                  Donate
                </button>
                {isHost &&
                  actionPlayer.user?._id?.toString() !== user.id && (
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setShowActionMenu(false);
                        setKickTarget(actionPlayer);
                        setShowKickConfirm(true);
                      }}
                    >
                      Kick
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <ConfirmModal
          title="Xác nhận rời bàn"
          message="Bạn có chắc chắn muốn rời bàn không?"
          onConfirm={handleLeaveConfirm}
          onCancel={() => setShowLeaveConfirm(false)}
          confirmText="Rời bàn"
        />
      )}

      {showKickConfirm && kickTarget && (
        <ConfirmModal
          title="Xác nhận kick người chơi"
          message={`Bạn muốn kick người chơi ${
            kickTarget.user?.username || ''
          } ra khỏi bàn?`}
          onConfirm={() => {
            socket.emit('kickPlayer', {
              roomId: room.roomId,
              targetUserId: kickTarget.user._id,
            });
            setShowKickConfirm(false);
            setKickTarget(null);
          }}
          onCancel={() => {
            setShowKickConfirm(false);
            setKickTarget(null);
          }}
          confirmText="Kick"
        />
      )}

      {balanceNotice && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (balanceNotice.onClose) {
              balanceNotice.onClose();
            } else {
              setBalanceNotice(null);
            }
          }}
        >
          <div
            className="notice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{balanceNotice.title}</h3>
            </div>
            <div className="modal-content">
              <p>{balanceNotice.message}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="confirm-btn"
                onClick={() => {
                  if (balanceNotice.onClose) {
                    balanceNotice.onClose();
                  } else {
                    setBalanceNotice(null);
                  }
                }}
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

export default GameRoom;
