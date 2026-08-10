import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  ShieldAlert, 
  IndianRupee, 
  Loader2, 
  AlertTriangle, 
  Check, 
  UserMinus, 
  UserCheck, 
  BarChart3, 
  Lock,
  ListFilter
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user]);

  // Tab: 'users', 'transactions', 'security'
  const [activeTab, setActiveTab] = useState('users');

  // Admin Data states
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [error, setError] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  });

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', { headers: getHeaders() });
      const statsData = await statsRes.json();
      
      // 2. Fetch Users
      const usersRes = await fetch('http://localhost:5000/api/users/admin/users', { headers: getHeaders() });
      const usersData = await usersRes.json();

      // 3. Fetch Transactions
      const transRes = await fetch('http://localhost:5000/api/admin/transactions', { headers: getHeaders() });
      const transData = await transRes.json();

      if (statsData.success && usersData.success && transData.success) {
        setStats(statsData.data);
        setAllUsers(usersData.data);
        setAllTransactions(transData.data);
      } else {
        setError('Failed to fetch some admin data panels.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed while reaching admin portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [token, user]);

  const toggleUserBlock = async (targetId, currentStatus) => {
    setUpdatingUserId(targetId);
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${targetId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh local UI states
        setAllUsers(prev => prev.map(u => u._id === targetId ? { ...u, status: newStatus } : u));
        // Update stats
        setStats(prev => ({
          ...prev,
          blockedUsers: prev.blockedUsers + (newStatus === 'blocked' ? 1 : -1)
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2 style={{ color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ marginTop: '1rem' }}>You do not have administrative permissions to view this portal.</p>
      </div>
    );
  }

  // Draw pure SVG chart from stats chartData
  const drawChart = () => {
    if (!stats || !stats.chartData || stats.chartData.length === 0) return null;
    const data = stats.chartData;
    const maxVal = Math.max(...data.map(d => d.amount), 500); // minimum scale height
    const height = 120;
    const width = 450;
    const padding = 20;

    const points = data.map((d, i) => {
      const x = padding + (i * (width - padding * 2) / (data.length - 1));
      const y = (height - padding) - (d.amount * (height - padding * 2) / maxVal);
      return { x, y, date: d.date, amt: d.amount };
    });

    const polylinePath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 0' }}>
        {/* Grids line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        
        {/* Glow path */}
        <polyline
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="3.5"
          points={polylinePath}
          style={{ filter: 'drop-shadow(0px 3px 8px rgba(139, 92, 246, 0.4))' }}
        />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#fff"
              stroke="var(--accent-secondary)"
              strokeWidth="2.5"
            />
            {/* Label texts */}
            <text x={p.x} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="middle">{p.date}</text>
            {p.amt > 0 && (
              <text x={p.x} y={p.y - 8} fill="var(--success)" fontSize="8" fontWeight="bold" textAnchor="middle">₹{Math.round(p.amt).toLocaleString('en-IN')}</text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="container animate-fade-in">
      
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="glow-text">Admin Control Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>System diagnostics, security flags, & user directories</p>
        </div>
        <button 
          onClick={fetchAdminData}
          className="btn btn-secondary" 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'Refresh System'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
          <Loader2 className="animate-spin" size={44} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ANALYTICS SUMMARY CARDS */}
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Volume</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
                  ₹{Number(stats?.totalVolume).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.6rem', borderRadius: '10px', color: 'var(--success)' }}>
                <IndianRupee size={22} />
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Registered Users</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem' }}>
                  {stats?.totalUsers} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--danger)' }}>({stats?.blockedUsers} Blocked)</span>
                </h2>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', padding: '0.6rem', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                <Users size={22} />
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className={stats?.flaggedTransactions > 0 ? "glass-panel animate-pulse-glow" : "glass-panel"}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Security Alerts</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem', color: stats?.flaggedTransactions > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {stats?.flaggedTransactions} flagged
                </h2>
              </div>
              <div style={{ background: stats?.flaggedTransactions > 0 ? 'var(--danger-bg)' : 'rgba(255,255,255,0.03)', border: stats?.flaggedTransactions > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.08)', padding: '0.6rem', borderRadius: '10px', color: stats?.flaggedTransactions > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                <ShieldAlert size={22} />
              </div>
            </div>
          </div>

          {/* SYSTEM CHART */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Daily Transaction Volume (Last 7 Days)
            </h3>
            {drawChart()}
          </div>

          {/* TAB SECTION CONTROLS */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.4rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('users')}
              className="btn" 
              style={{ flex: 1, background: activeTab === 'users' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
            >
              <Users size={16} />
              User Database ({allUsers.length})
            </button>
            
            <button 
              onClick={() => setActiveTab('transactions')}
              className="btn" 
              style={{ flex: 1, background: activeTab === 'transactions' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: activeTab === 'transactions' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
            >
              <Activity size={16} />
              System Transactions ({allTransactions.length})
            </button>

            <button 
              onClick={() => setActiveTab('security')}
              className="btn" 
              style={{ flex: 1, background: activeTab === 'security' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem', position: 'relative' }}
            >
              <ShieldAlert size={16} />
              Fraud Detection Panel
              {stats?.flaggedTransactions > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '12px', background: 'var(--danger)', width: '8px', height: '8px', borderRadius: '50%' }} />
              )}
            </button>
          </div>

          {/* TAB CONTENTS */}

          {/* TAB 1: USER DATABASE */}
          {activeTab === 'users' && (
            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontWeight: 600 }}>User Management Directories</h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem' }}>Name</th>
                    <th style={{ padding: '0.75rem' }}>UPI ID</th>
                    <th style={{ padding: '0.75rem' }}>Phone / Email</th>
                    <th style={{ padding: '0.75rem' }}>Wallet Balance</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <UserAvatar name={u.name} size={32} />
                          <div>
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                            {u.role === 'admin' && <span style={{ color: 'var(--warning)', fontSize: '0.7rem', border: '1px solid rgba(245,158,11,0.2)', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px' }}>Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--accent-secondary)' }}>{u.upiId}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div>{u.phone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                        ₹{Number(u.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span className={u.status === 'blocked' ? "badge badge-danger" : "badge badge-success"} style={{ fontSize: '0.7rem' }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => toggleUserBlock(u._id, u.status)}
                            className={u.status === 'blocked' ? "btn btn-danger" : "btn btn-secondary"}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', gap: '0.3rem', borderRadius: '6px' }}
                            disabled={updatingUserId === u._id}
                          >
                            {updatingUserId === u._id ? (
                              <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : u.status === 'blocked' ? (
                              <>
                                <UserCheck size={12} />
                                Unblock
                              </>
                            ) : (
                              <>
                                <UserMinus size={12} />
                                Block
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SYSTEM TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontWeight: 600 }}>Real-Time Transaction Audit</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {allTransactions.map((tx) => (
                  <div key={tx._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: tx.isFlagged ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tx.senderName || 'SYSTEM'} → {tx.receiverName || 'EXTERNAL'}</span>
                        <span className="badge" style={{ fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)' }}>{tx.type}</span>
                        {tx.isFlagged && (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem', display: 'flex', gap: '0.2rem' }}>
                            <AlertTriangle size={10} />
                            Flagged (Score: {tx.fraudScore})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{tx._id}</span> | Remarks: {tx.remarks}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY ALERTS */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertTriangle size={20} />
                Suspected Fraud Logs
              </h3>

              {allTransactions.filter(t => t.isFlagged).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                  <Check size={36} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Excellent. No security flags or fraud triggers tripped.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allTransactions.filter(t => t.isFlagged).map((tx) => (
                    <div key={tx._id} className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            🚨 FRAUD TRIPPED (Score: {tx.fraudScore})
                          </div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                            Transfer of ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} from {tx.senderName}
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                        <div><strong>Sender UPI:</strong> {tx.senderUpi}</div>
                        <div><strong>Receiver UPI:</strong> {tx.receiverUpi}</div>
                        <div><strong>Transaction ID:</strong> <span style={{ fontFamily: 'monospace' }}>{tx._id}</span></div>
                        <div><strong>Trigger Details:</strong> {tx.remarks}</div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        <Lock size={12} color="var(--warning)" />
                        <span>Analysis: {tx.amount >= 10000 ? "Triggered high-value transaction alert (> ₹10,000 limit)." : "Triggered transaction velocity limits (rapid consecutive transfer checks)."}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default AdminPanel;
