import React, { useState, useEffect, useRef } from 'react';
import { HiVolumeUp, HiVolumeOff } from 'react-icons/hi';
import './AudioController.scss';

// Nhạc nền: đặt file mp3 tại public/sources/music-xi-zach.mp3
// Hoặc nếu bạn đặt tại src/sources/music-xi-zach.mp3, uncomment dòng import bên dưới
const MUSIC_URL = '/sources/music-xi-zach.mp3';
// import musicSrc from '../sources/music-xi-zach.mp3'; // Uncomment nếu dùng file từ src/sources

const STORAGE_KEY = 'xi_zach_music_enabled';

const AudioController = () => {
  // Đọc từ localStorage, mặc định là true (phát nhạc)
  const getInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === 'true' : true; // Mặc định true nếu chưa có
  };

  const [isPlaying, setIsPlaying] = useState(getInitialState);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef(null);
  const shouldAutoPlayRef = useRef(getInitialState()); // Lưu trạng thái ban đầu

  useEffect(() => {
    // Tạo audio element
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Xử lý khi audio sẵn sàng
    const handleCanPlay = () => {
      setAudioReady(true);
      
      // Tự động phát nhạc nếu setting là bật (mặc định hoặc từ localStorage)
      if (shouldAutoPlayRef.current) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            localStorage.setItem(STORAGE_KEY, 'true');
            console.log('Nhạc đã tự động phát');
          })
          .catch((err) => {
            // Trình duyệt chặn autoplay - cần user interaction
            console.log('Autoplay bị chặn, cần click để phát nhạc:', err.message);
            setIsPlaying(false);
            // Không lưu false vào localStorage vì user có thể muốn bật sau
          });
      }
    };

    // Xử lý khi audio bị pause
    const handlePause = () => {
      if (audioRef.current && audioRef.current.paused) {
        setIsPlaying(false);
        localStorage.setItem(STORAGE_KEY, 'false');
      }
    };

    // Xử lý khi audio đang play
    const handlePlay = () => {
      setIsPlaying(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    };

    // Xử lý lỗi load file
    const handleError = (e) => {
      console.error('Lỗi load nhạc:', e);
      setAudioReady(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Load audio
    audio.load();

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []); // Chỉ chạy 1 lần khi mount

  // Đồng bộ với localStorage khi isPlaying thay đổi từ toggle
  useEffect(() => {
    if (audioReady && audioRef.current) {
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Autoplay bị chặn
          setIsPlaying(false);
        });
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioReady]);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    const newState = !isPlaying;
    setIsPlaying(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));

    if (newState) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          localStorage.setItem(STORAGE_KEY, 'true');
        })
        .catch((err) => {
          console.error('Không thể phát nhạc:', err);
          setIsPlaying(false);
          localStorage.setItem(STORAGE_KEY, 'false');
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    }
  };

  return (
    <button 
      type="button" 
      className="audio-btn" 
      onClick={toggleAudio} 
      title={isPlaying ? 'Tắt âm thanh' : 'Bật âm thanh'}
    >
      {isPlaying ? <HiVolumeUp size={24} /> : <HiVolumeOff size={24} />}
    </button>
  );
};

export default AudioController;

