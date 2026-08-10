import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, User, Phone, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const { register, authError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!name || !email || !phone || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (phone.length < 10) {
      setValidationError('Phone number must be at least 10 digits.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password, phone);
    setLoading(false);

    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 100px)', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        
        {/* Brand header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', width: '50px', height: '50px', borderRadius: '14px', boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}>
            <Wallet size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Create Wallet</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Register and start transacting securely</p>
        </div>

        {/* Display Errors */}
        {(validationError || authError) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{validationError || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Full Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Phone input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                placeholder="10 digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="glass-input"
                style={{ paddingLeft: '40px' }}
                disabled={loading}
                maxLength={12}
              />
            </div>
          </div>

          {/* Password input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary glow-btn" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Creating Wallet...
              </>
            ) : (
              'Create Wallet'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have a wallet?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Log in here
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
