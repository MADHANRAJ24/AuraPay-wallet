import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Bell, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

const SocketListener = () => {
  const { user, refreshUser } = useAuth();
  const { fetchTransactions, fetchBanks } = useWallet();
  const [toasts, setToasts] = useState([]);

  // Audio synthesis chime using Web Audio API
  const playChime = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'receive') {
        // High-pitched double beep for receiving money
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        // Clear pleasant chime for sending money successfully
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn('Web Audio playback failed or blocked:', err);
    }
  };

  const showToast = (data) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      type: data.type, // 'receive' or 'send'
      title: data.title,
      message: data.message,
      createdAt: new Date()
    };

    setToasts((prev) => [newToast, ...prev]);
    playChime(data.type);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!user?._id) return;

    // Connect to WebSocket Server
    const socket = io('http://localhost:5000');

    // Join user room
    socket.emit('join', user._id);

    // Event listeners
    socket.on('money_received', (data) => {
      showToast(data);
      // Refresh current states
      refreshUser();
      fetchTransactions();
      fetchBanks();
    });

    socket.on('money_sent', (data) => {
      showToast(data);
      // Refresh current states
      refreshUser();
      fetchTransactions();
      fetchBanks();
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  return (
    <>
      {/* Toast container */}
      <div 
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '380px',
          width: 'calc(100% - 48px)'
        }}
      >
        {toasts.map((toast) => {
          const isReceive = toast.type === 'receive';
          const themeColor = isReceive ? 'var(--success)' : 'var(--accent-primary)';
          const glowShadow = isReceive 
            ? '0 8px 32px rgba(16, 185, 129, 0.25), 0 0 15px rgba(16, 185, 129, 0.15)'
            : '0 8px 32px rgba(139, 92, 246, 0.25), 0 0 15px rgba(139, 92, 246, 0.15)';

          return (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'rgba(18, 18, 26, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${isReceive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                borderRadius: '16px',
                padding: '1.25rem',
                boxShadow: glowShadow,
                color: '#fff',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                cursor: 'pointer',
                animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Left icon wrapper */}
              <div 
                style={{
                  background: isReceive ? 'var(--success-bg)' : 'rgba(139, 92, 246, 0.1)',
                  border: `1px solid ${isReceive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                  borderRadius: '10px',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isReceive ? (
                  <ArrowDownLeft size={20} color="var(--success)" />
                ) : (
                  <ArrowUpRight size={20} color="var(--accent-primary)" />
                )}
              </div>

              {/* Toast messages */}
              <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Bell size={14} color={themeColor} />
                  {toast.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
              >
                <X size={16} />
              </button>

              {/* Animated Progress Timer Line */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  background: themeColor,
                  width: '100%',
                  animation: 'toast-timer 5s linear forwards'
                }}
              />
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(120%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        @keyframes toast-timer {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}} />
    </>
  );
};

export default SocketListener;
