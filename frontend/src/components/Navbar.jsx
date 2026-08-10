import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogOut, Menu, X, Shield, History, Send, CreditCard, LayoutDashboard, User } from 'lucide-react';
import UserAvatar from './UserAvatar';


const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/send', label: 'Send Money', icon: Send },
    { path: '/bills', label: 'Bills & Pay', icon: CreditCard },
    { path: '/history', label: 'History', icon: History }
  ];

  return (
    <nav className="glass-panel" style={{ borderRadius: '0 0 20px 20px', borderTop: 'none', position: 'sticky', top: 0, zIndex: 100, marginBottom: '2rem' }}>
      <div className="container" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', width: '40px', height: '40px', borderRadius: '10px', boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' }}>
            <Wallet size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="glow-text">
            AuraPay
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'none', gap: '1rem', alignItems: 'center' }} className="desktop-menu">
          <style dangerouslySetInnerHTML={{__html: `
            @media (min-width: 769px) {
              .desktop-menu { display: flex !important; }
              .mobile-toggle { display: none !important; }
            }
          `}} />
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: isActive(link.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.path) ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: isActive(link.path) ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          {user.role === 'admin' && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: isActive('/admin') ? 'var(--warning)' : '#fbbf24',
                background: isActive('/admin') ? 'var(--warning-bg)' : 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Shield size={16} />
              Admin Panel
            </Link>
          )}
        </div>

        {/* User Balance & Actions */}
        <div style={{ display: 'none', alignItems: 'center', gap: '1rem' }} className="desktop-menu">
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit', padding: '0.4rem 0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <UserAvatar name={user.name} size={32} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{user.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>
                ₹{Number(user.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Link>
          
          <button 
            onClick={handleLogout}
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', background: 'var(--danger-bg)' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Mobile Toggle Button */}
        <button 
          className="mobile-toggle" 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            padding: '1.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(7, 7, 10, 0.95)',
            backdropFilter: 'blur(20px)'
          }}
          className="animate-fade-in"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: isActive(link.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.path) ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: isActive(link.path) ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                }}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
          {user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                textDecoration: 'none',
                color: '#fbbf24',
                background: isActive('/admin') ? 'var(--warning-bg)' : 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}
            >
              <Shield size={18} />
              Admin Panel
            </Link>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <UserAvatar name={user.name} size={36} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.upiId}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Wallet</div>
              <div style={{ fontSize: '1rem', color: 'var(--success)', fontWeight: 700 }}>
                ₹{Number(user.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="btn btn-danger" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
