import React, { useRef, useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Gift, Loader2, Sparkles, X } from 'lucide-react';

const ScratchCardModal = ({ reward, onClose }) => {
  const { scratchCard } = useWallet();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scratchedPercent, setScratchedPercent] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(reward.isClaimed);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    if (claimed || isRevealed) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fill with metallic silver gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#a1a1a1');
    gradient.addColorStop(0.5, '#d4d4d4');
    gradient.addColorStop(1, '#8e8e8e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some decorative details (like a gift box outline or pattern)
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 10);
    
    ctx.font = '24px sans-serif';
    ctx.fillText('🎁', canvas.width / 2, canvas.height / 2 + 20);

    // Draw border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  }, [claimed, isRevealed]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Support both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (isRevealed || claimed) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    checkScratchPercentage();
  };

  const draw = (e) => {
    if (!isDrawing || isRevealed || claimed) return;
    e.preventDefault(); // prevent scrolling on mobile touch

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get image data to compute transparent pixel percentage
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;
    
    // Check alpha values (every 4th byte)
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentCount++;
      }
    }
    
    const totalPixels = canvas.width * canvas.height;
    const percent = Math.round((transparentCount / totalPixels) * 100);
    setScratchedPercent(percent);

    // If more than 50% scratched, auto-reveal and trigger API claim!
    if (percent >= 50) {
      handleReveal();
    }
  };

  const handleReveal = async () => {
    setIsRevealed(true);
    setClaiming(true);
    setClaimError('');
    
    try {
      const res = await scratchCard(reward._id);
      setClaiming(false);
      if (res.success) {
        setClaimed(true);
        // Play success tone if audio synthesizer is initialized
        playRewardChime();
      } else {
        setClaimError(res.message || 'Failed to claim reward');
      }
    } catch (e) {
      setClaiming(false);
      setClaimError('Network error claiming cashback');
    }
  };

  // Synthesizes a premium golden reward chime chime
  const playRewardChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // Synthesize a quick 3-tone arpeggio (C5 -> E5 -> G5 -> C6)
      const playNote = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      playNote(523.25, now, 0.15);       // C5
      playNote(659.25, now + 0.08, 0.15); // E5
      playNote(783.99, now + 0.16, 0.15); // G5
      playNote(1046.50, now + 0.24, 0.3); // C6
    } catch (e) {
      console.warn('Sound synthesis blocked/unsupported:', e);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
      <div style={{ 
        width: '90%', 
        maxWidth: '340px', 
        borderRadius: '24px', 
        padding: '1.5rem', 
        background: '#0c1a30', 
        color: '#fff', 
        border: '1px solid #1c355e', 
        boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
        textAlign: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }} className="animate-fade-in">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          disabled={claiming}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            AuraPay Rewards
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {claimed ? 'Cashback Claimed!' : 'Scratch card to reveal your cashback!'}
          </p>
        </div>

        {/* The Scratchcard container */}
        <div style={{ 
          width: '200px', 
          height: '200px', 
          position: 'relative', 
          borderRadius: '16px', 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #162c50 0%, #0c1a30 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          
          {/* UNDERNEATH LAYER: The Revealed Reward */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '0.5rem',
            animation: isRevealed ? 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <Gift size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CASHBACK</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>₹{reward.amount}</h2>
            </div>
          </div>

          {/* TOP LAYER: The Scratchable Canvas */}
          {!claimed && !isRevealed && (
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: 'crosshair',
                touchAction: 'none'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          )}

          {/* Fade transition cover when claiming / claimed */}
          {claimed && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(12,26,48,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} className="animate-fade-in">
              <span style={{ fontSize: '2.5rem' }}>🎉</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>Credited to Wallet!</span>
            </div>
          )}
        </div>

        {/* Claim Status Indicator / Actions */}
        <div style={{ width: '100%' }}>
          {claiming ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Crediting cashback to wallet...
            </div>
          ) : claimError ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{claimError}</div>
          ) : claimed ? (
            <button 
              onClick={onClose} 
              className="btn btn-primary" 
              style={{ width: '100%', borderRadius: '12px' }}
            >
              Awesome, Thanks!
            </button>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Scratch off {Math.max(0, 50 - scratchedPercent)}% more to claim
            </div>
          )}
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pop {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default ScratchCardModal;
