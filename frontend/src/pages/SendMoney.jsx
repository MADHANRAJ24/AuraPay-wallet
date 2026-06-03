import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { Send, QrCode, AlertCircle, CheckCircle, Search, Sparkles, Loader2, Camera, Upload } from 'lucide-react';

const SendMoney = () => {
  const { verifyRecipient, sendMoney } = useWallet();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getAvatarGradient = (name = '') => {
    const colors = [
      'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', // Violet
      'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', // Blue
      'linear-gradient(135deg, #34d399 0%, #059669 100%)', // Emerald
      'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', // Rose
      'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', // Amber
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  // Mode: 'send' or 'scan'
  const [mode, setMode] = useState(searchParams.get('scan') === 'true' ? 'scan' : 'send');

  // Recipient input & state
  const [recipientInput, setRecipientInput] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Transfer states
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(null);

  // Scan simulation states
  const [scanStep, setScanStep] = useState(1); // 1 = scanning, 2 = scanned
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Real camera streams refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Handle camera video stream lifecycle
  useEffect(() => {
    let activeStream = null;

    if (mode === 'scan' && scanStep === 1 && !uploadedImage) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          activeStream = s;
          streamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setCameraActive(true);
          }
        })
        .catch(err => {
          console.warn("Camera access denied or unavailable:", err);
          setCameraActive(false);
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    };
  }, [mode, scanStep, uploadedImage]);

  // Load all users to simulate contact searching and scan selection
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      setLoadingUsers(true);
      try {
        const token = localStorage.getItem('aurapay_token');
        const res = await fetch('http://localhost:5000/api/users/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          // Exclude logged in user and admin
          const filtered = data.data.filter(u => u._id !== user?._id && u.role !== 'admin');
          setRegisteredUsers(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingUsers(false);
      }
    };
    if (user) {
      fetchRegisteredUsers();
    }
  }, [user]);

  // Real-time contact filtering based on phone or UPI ID
  const filteredSearchUsers = recipientInput.trim() ? registeredUsers.filter(u => 
    u.name.toLowerCase().includes(recipientInput.toLowerCase()) ||
    u.phone.includes(recipientInput) ||
    u.upiId.toLowerCase().includes(recipientInput.toLowerCase())
  ) : [];

  const handleVerify = async () => {
    if (!recipientInput) return;
    setVerifyError('');
    setVerifiedUser(null);
    setVerifyLoading(true);

    const res = await verifyRecipient(recipientInput);
    setVerifyLoading(false);

    if (res.success) {
      setVerifiedUser(res.data);
    } else {
      setVerifyError(res.message || 'Recipient not found');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError('');
    
    if (!verifiedUser) return;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSendError('Please enter a valid amount.');
      return;
    }

    if (numAmount > user.walletBalance) {
      setSendError('Insufficient wallet balance.');
      return;
    }

    setSendLoading(true);
    const res = await sendMoney(verifiedUser.upiId, amount, remarks);
    setSendLoading(false);

    if (res.success) {
      setSendSuccess(res.data.transaction);
      setAmount('');
      setRemarks('');
      setVerifiedUser(null);
      setRecipientInput('');
    } else {
      setSendError(res.message || 'Transaction failed.');
    }
  };

  const simulateScan = (upiId) => {
    setScanStep(2);
    // Simulate a 1.2s delay for "Scanning QR code..."
    setTimeout(() => {
      setRecipientInput(upiId);
      setVerifiedUser(null);
      setMode('send');
      setScanStep(1);
      setUploadedImage(null);
      // Immediately verify the user scanned
      setVerifyLoading(true);
      verifyRecipient(upiId).then(res => {
        setVerifyLoading(false);
        if (res.success) {
          setVerifiedUser(res.data);
        }
      });
    }, 1200);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (registeredUsers.length === 0) {
      alert("No other registered users available to simulate scanning. Please sign up another account first!");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setScanStep(2); // Show analyzing transition

    setTimeout(() => {
      // Pick a random user to simulate successful scan
      const randomIndex = Math.floor(Math.random() * registeredUsers.length);
      const targetUser = registeredUsers[randomIndex];

      setRecipientInput(targetUser.upiId);
      setVerifiedUser(null);
      setMode('send');
      setScanStep(1);
      setUploadedImage(null);

      // Verify the user
      setVerifyLoading(true);
      verifyRecipient(targetUser.upiId).then(res => {
        setVerifyLoading(false);
        if (res.success) {
          setVerifiedUser(res.data);
        }
      });
    }, 1500);
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
      
      {/* Tab Switcher */}
      <div className="glass-panel" style={{ display: 'flex', padding: '0.4rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => { setMode('send'); setSendError(''); setSendSuccess(null); }}
          className="btn" 
          style={{ flex: 1, background: mode === 'send' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: mode === 'send' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
        >
          <Send size={16} />
          Send to UPI / Phone
        </button>
        <button 
          onClick={() => { setMode('scan'); setSendError(''); setSendSuccess(null); }}
          className="btn" 
          style={{ flex: 1, background: mode === 'scan' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: mode === 'scan' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
        >
          <QrCode size={16} />
          Scan QR Code
        </button>
      </div>

      {mode === 'send' ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={22} color="var(--accent-primary)" />
            Send Money
          </h2>

          {/* Success screen */}
          {sendSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }} className="animate-fade-in">
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--success-bg)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={36} color="var(--success)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>Transfer Successful!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Successfully sent <strong>₹{Number(sendSuccess.amount).toLocaleString('en-IN')}</strong> to <strong>{sendSuccess.receiverName}</strong>
              </p>
              
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>UPI Transaction ID</span><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sendSuccess._id}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>To UPI ID</span><span>{sendSuccess.receiverUpi}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Remarks</span><span>{sendSuccess.remarks}</span></div>
                {sendSuccess.isFlagged && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <AlertCircle size={14} />
                    <span>Flagged by security (Fraud Score: {sendSuccess.fraudScore})</span>
                  </div>
                )}
              </div>

              <button onClick={() => setSendSuccess(null)} className="btn btn-primary" style={{ width: '100%' }}>Send More Money</button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Step 1: Verify Recipient */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Recipient UPI ID, Email or Phone</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="e.g. john@aura or 9876543210"
                      value={recipientInput}
                      onChange={(e) => {
                        setRecipientInput(e.target.value);
                        setVerifiedUser(null);
                        setVerifyError('');
                      }}
                      className="glass-input"
                      style={{ paddingLeft: '40px' }}
                      disabled={sendLoading || verifyLoading}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleVerify}
                    className="btn btn-secondary"
                    disabled={!recipientInput || verifyLoading || sendLoading}
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    {verifyLoading ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify'}
                  </button>
                </div>

                {verifyError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <AlertCircle size={14} />
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Google Pay Style Selected Recipient Header */}
                {verifiedUser && (
                  <div className="glass-card animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.03)', marginTop: '0.5rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', background: getAvatarGradient(verifiedUser.name), color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                        {verifiedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={12} />
                          Verified Secure Contact
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{verifiedUser.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{verifiedUser.upiId}</div>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => {
                        setVerifiedUser(null);
                        setRecipientInput('');
                      }}
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Google Pay Style Contacts Section */}
                {!verifiedUser && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                      {recipientInput.trim() ? 'Matched Contacts' : 'People on AuraPay'}
                    </div>
                    {loadingUsers ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                        <Loader2 className="animate-spin" size={20} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : (recipientInput.trim() ? filteredSearchUsers : registeredUsers).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No other registered contacts found.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {(recipientInput.trim() ? filteredSearchUsers : registeredUsers).map(u => (
                          <div 
                            key={u._id}
                            onClick={() => {
                              setRecipientInput(u.upiId);
                              setVerifiedUser(u);
                              setVerifyError('');
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                            className="search-item-hover animate-fade-in"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', background: getAvatarGradient(u.name), color: '#fff', fontSize: '1.1rem', fontWeight: 700, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{u.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {u.upiId} | {u.phone}
                                </div>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.05)', color: 'var(--accent-primary)', cursor: 'pointer' }}
                            >
                              Pay
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Amount & Remarks (Visible only when recipient verified) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: verifiedUser ? 1 : 0.45, pointerEvents: verifiedUser ? 'auto' : 'none', transition: 'var(--transition-smooth)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Wallet Balance: ₹{Number(user?.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="Enter transfer amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input"
                    disabled={!verifiedUser || sendLoading}
                    min="1"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Remarks / Message (Optional)</label>
                  <input
                    type="text"
                    placeholder="Dinner, rent, gift, etc."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="glass-input"
                    disabled={!verifiedUser || sendLoading}
                  />
                </div>

                {sendError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{sendError}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary glow-btn" 
                  disabled={!verifiedUser || sendLoading || !amount}
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}
                >
                  {sendLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      Processing Secure Transfer...
                    </>
                  ) : (
                    'Pay Securely Now'
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      ) : (
        /* SCAN MODE SIMULATION */
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justify: 'center', gap: '0.5rem' }}>
            <Camera size={22} color="var(--accent-primary)" />
            QR Scanner Simulator
          </h2>

          {scanStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              
              {/* Simulated camera scanning window */}
              <div style={{ width: '220px', height: '220px', position: 'relative', background: '#0a0a0f', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {/* Glowing lens scan lines */}
                <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)', position: 'absolute', top: 0, left: 0, animation: 'scanline 2s linear infinite', zIndex: 10 }} />
                
                {/* Corner markers */}
                <div style={{ width: '20px', height: '20px', borderTop: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', position: 'absolute', top: '15px', left: '15px', zIndex: 11 }} />
                <div style={{ width: '20px', height: '20px', borderTop: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', position: 'absolute', top: '15px', right: '15px', zIndex: 11 }} />
                <div style={{ width: '20px', height: '20px', borderBottom: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', position: 'absolute', bottom: '15px', left: '15px', zIndex: 11 }} />
                <div style={{ width: '20px', height: '20px', borderBottom: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', position: 'absolute', bottom: '15px', right: '15px', zIndex: 11 }} />
                
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded QR" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, display: cameraActive ? 'block' : 'none' }} 
                    />
                    {!cameraActive && (
                      <QrCode size={64} color="rgba(255,255,255,0.15)" style={{ zIndex: 1 }} />
                    )}
                  </>
                )}
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                Point camera at a user's UPI QR Code or select a test recipient profile below to simulate a scan.
              </p>

              <div style={{ marginBottom: '0.5rem' }}>
                <input 
                  type="file" 
                  id="qr-upload" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
                <label 
                  htmlFor="qr-upload" 
                  className="btn btn-secondary" 
                  style={{ display: 'inline-flex', gap: '0.5rem', cursor: 'pointer', padding: '0.6rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}
                >
                  <Upload size={16} color="var(--accent-primary)" />
                  Upload QR Image
                </label>
              </div>

              {/* List of active mock accounts to "scan" */}
              <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select Test User to Scan</h4>
                
                {loadingUsers ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                    <Loader2 className="animate-spin" size={20} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : registeredUsers.length === 0 ? (
                  <div style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No other registered users. Open another tab and sign up a new test account!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.4rem' }}>
                    {registeredUsers.map(u => (
                      <button 
                        key={u._id}
                        onClick={() => simulateScan(u.upiId)}
                        className="glass-card" 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.8rem 1rem', textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.upiId}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Scan QR →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Scanning completed transition state */
            <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-fade-in">
              <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Analyzing QR Code...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Connecting to secure payment API gateway</p>
            </div>
          )}

        </div>
      )}

      {/* Embedded CSS animations for scanning simulation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanline {
          0% { top: 15px; }
          50% { top: 200px; }
          100% { top: 15px; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .search-item-hover:hover {
          background: rgba(255, 255, 255, 0.06);
        }
      `}} />
    </div>
  );
};

export default SendMoney;
