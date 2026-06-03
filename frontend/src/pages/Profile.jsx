import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { User, Mail, Phone, Shield, Calendar, Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { linkedBanks } = useWallet();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('aurapay_token');
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, phone })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccess('Profile updated successfully!');
        await refreshUser();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setLoading(false);
      setError('Server connection error. Please try again.');
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="grid-2">
        {/* User Card info summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', width: '80px', height: '80px', borderRadius: '50%', boxShadow: '0 0 20px rgba(139,92,246,0.15)', marginBottom: '0.5rem' }}>
              <User size={40} color="var(--accent-primary)" />
            </div>
            
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user?.name}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{user?.upiId}</div>
            </div>

            <div className="badge badge-success" style={{ textTransform: 'capitalize', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
              {user?.role} Account
            </div>

            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '1rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Wallet size={14} /> Wallet Balance</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{Number(user?.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={14} /> Linked Banks</span>
                <span>{linkedBanks.length} accounts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> Created At</span>
                <span>{new Date(user?.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Update profile Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Update Profile Details</h3>
          
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--success)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                  maxLength={10}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary glow-btn" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Saving updates...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
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

export default Profile;
