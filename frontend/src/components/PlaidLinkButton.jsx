import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Link2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

const PlaidLinkButton = ({ onLinkSuccess }) => {
  const { token } = useAuth();
  const { fetchBanks } = useWallet();

  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Dynamically load the secure Plaid Link script from CDN (Production-safe)
  useEffect(() => {
    if (window.Plaid) {
      setPlaidLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => setPlaidLoaded(true);
    script.onerror = () => setError('Failed to load banking API script.');
    document.head.appendChild(script);

    return () => {
      // Clean up script if unmounting before loaded
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handlePlaidLink = async () => {
    if (!plaidLoaded || !window.Plaid) {
      setError('Banking script is not ready. Please try again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 2. Fetch Plaid link token from backend
      const res = await fetch('http://localhost:5000/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to initialize link token.');
      }

      // 3. Initialize Plaid Link Handler Overlay
      const handler = window.Plaid.create({
        token: data.link_token,
        onSuccess: async (public_token, metadata) => {
          setLoading(true);
          try {
            // 4. Exchange public token for permanent credentials in backend
            const exchangeRes = await fetch('http://localhost:5000/api/plaid/exchange-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                public_token,
                bankName: metadata.institution?.name || 'Linked Checking Account'
              })
            });
            const exchangeData = await exchangeRes.json();

            if (exchangeData.success) {
              setSuccess('Real bank account linked successfully!');
              await fetchBanks(); // Refresh linked list
              if (onLinkSuccess) onLinkSuccess();
            } else {
              setError(exchangeData.message || 'Handshake failed.');
            }
          } catch (err) {
            setError('Failed to establish server handshake.');
          } finally {
            setLoading(false);
          }
        },
        onExit: (err, metadata) => {
          setLoading(false);
          if (err) {
            setError(err.display_message || 'Plaid connection aborted.');
          }
        },
      });

      // 5. Open Plaid Secure OAuth iframe
      handler.open();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to link account.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
      
      <button 
        type="button" 
        onClick={handlePlaidLink} 
        disabled={loading || !plaidLoaded}
        className="btn btn-primary"
        style={{ 
          background: 'linear-gradient(135deg, #111 0%, #333 100%)', 
          border: '1px solid rgba(255,255,255,0.12)', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          width: '100%',
          display: 'flex',
          gap: '0.5rem'
        }}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Connecting to Plaid Secure...
          </>
        ) : (
          <>
            <ShieldCheck size={16} color="#10b981" />
            Connect Real Bank (Plaid)
          </>
        )}
      </button>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.8rem', background: 'var(--danger-bg)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.8rem', background: 'var(--success-bg)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.15)' }}>
          <ShieldCheck size={14} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Production Integration Instructions Tip */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', background: 'rgba(255,255,255,0.01)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
        ℹ️ <strong>Developer Note:</strong> Real-banking API handshake requires registering client keys at Plaid Developer dashboard and populating <code>PLAID_CLIENT_ID</code> inside <code>backend/.env</code>.
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default PlaidLinkButton;
