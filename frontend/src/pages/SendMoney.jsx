import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { Send, QrCode, AlertCircle, CheckCircle, Search, Sparkles, Loader2, Camera, Upload } from 'lucide-react';
import jsQR from 'jsqr';
import UserAvatar from '../components/UserAvatar';

const SendMoney = () => {
  const { verifyRecipient, sendMoney, requestMoney } = useWallet();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // UPI PIN states
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const [upiError, setUpiError] = useState('');

  // Request money states
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(null);

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

  // Real-time camera QR decoding loop
  useEffect(() => {
    let active = true;
    let animId = null;

    const scanFrame = () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          // Found QR code!
          const upiId = code.data;
          
          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          
          // Show scanning success delay transition
          setScanStep(2);
          setTimeout(() => {
            setRecipientInput(upiId);
            setVerifiedUser(null);
            setMode('send');
            setScanStep(1);
            setUploadedImage(null);
            
            // Verify recipient
            setVerifyLoading(true);
            verifyRecipient(upiId).then(res => {
              setVerifyLoading(false);
              if (res.success) {
                setVerifiedUser(res.data);
              } else {
                setVerifyError(res.message || 'Recipient not found for this QR code');
              }
            });
          }, 800);
          
          active = false;
          return;
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    if (cameraActive && mode === 'scan' && scanStep === 1 && !uploadedImage) {
      animId = requestAnimationFrame(scanFrame);
    }

    return () => {
      active = false;
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [cameraActive, mode, scanStep, uploadedImage]);

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

    const isUpiLiteUsed = user?.upiLiteEnabled && numAmount <= 200 && Number(user?.upiLiteBalance) >= numAmount;

    if (isUpiLiteUsed) {
      if (numAmount > Number(user?.upiLiteBalance)) {
        setSendError('Insufficient UPI Lite balance.');
        return;
      }
    } else {
      if (numAmount > Number(user?.walletBalance)) {
        setSendError('Insufficient wallet balance.');
        return;
      }
    }

    if (isUpiLiteUsed) {
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
    } else {
      // Prompt UPI PIN modal
      setUpiPin('');
      setUpiError('');
      setShowUpiModal(true);
    }
  };

  const handleUpiSubmit = async () => {
    if (upiPin.length < 4) {
      setUpiError('Please enter a 4-digit UPI PIN.');
      return;
    }

    setSendLoading(true);
    setSendError('');
    setShowUpiModal(false);

    const res = await sendMoney(verifiedUser.upiId, amount, remarks);
    setSendLoading(false);

    if (res.success) {
      setSendSuccess(res.data.transaction);
      setAmount('');
      setRemarks('');
      setVerifiedUser(null);
      setRecipientInput('');
      setUpiPin('');
    } else {
      setSendError(res.message || 'Transaction failed.');
      setUpiPin('');
    }
  };

  const handleKeypadPress = (key) => {
    setUpiError('');
    if (key === '⌫') {
      setUpiPin(prev => prev.slice(0, -1));
    } else if (key === '✓') {
      if (upiPin.length < 4) {
        setUpiError('Please enter a 4-digit UPI PIN.');
        return;
      }
      handleUpiSubmit();
    } else {
      if (upiPin.length < 4) {
        setUpiPin(prev => prev + key);
      }
    }
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess(null);
    setSendError('');

    if (!verifiedUser) return;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setRequestError('Please enter a valid amount.');
      return;
    }

    setRequestLoading(true);
    const res = await requestMoney(verifiedUser.upiId, amount, remarks);
    setRequestLoading(false);

    if (res.success) {
      setRequestSuccess(res.data);
      setAmount('');
      setRemarks('');
      setVerifiedUser(null);
      setRecipientInput('');
    } else {
      setRequestError(res.message || 'Request failed.');
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

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setScanStep(2); // Show analyzing transition

    // Parse QR code from uploaded image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      setTimeout(() => {
        if (code && code.data) {
          const decodedUpi = code.data;
          setRecipientInput(decodedUpi);
          setVerifiedUser(null);
          setMode('send');
          setScanStep(1);
          setUploadedImage(null);

          // Verify the decoded user details
          setVerifyLoading(true);
          verifyRecipient(decodedUpi).then(res => {
            setVerifyLoading(false);
            if (res.success) {
              setVerifiedUser(res.data);
            } else {
              setVerifyError(res.message || 'Recipient not found for this QR code');
            }
          });
        } else {
          // If no QR found in uploaded image, show error
          setScanStep(1);
          setUploadedImage(null);
          setVerifyError('No valid QR code found in the uploaded image.');
        }
      }, 1500); // 1.5s visual scanning delay
    };
    img.src = imageUrl;
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

          {/* Request Success screen */}
          {requestSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }} className="animate-fade-in">
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <CheckCircle size={36} color="#3b82f6" />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '0.5rem' }}>Request Sent!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Successfully requested <strong>₹{Number(requestSuccess.amount).toLocaleString('en-IN')}</strong> from <strong>{requestSuccess.receiverName}</strong>
              </p>
              
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Request ID</span><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{requestSuccess._id}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>From UPI ID</span><span>{requestSuccess.receiverUpi}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Remarks</span><span>{requestSuccess.remarks}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Status</span><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{requestSuccess.status}</span></div>
              </div>

              <button onClick={() => setRequestSuccess(null)} className="btn btn-primary" style={{ width: '100%' }}>Send More Money</button>
            </div>
          ) : sendSuccess ? (
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
                      <UserAvatar name={verifiedUser.name} size={42} />
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
                              <UserAvatar name={u.name} size={42} />
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

                {requestError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{requestError}</span>
                  </div>
                )}

                {user?.upiLiteEnabled && Number(amount) > 0 && Number(amount) <= 200 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: 'rgba(16, 185, 129, 0.05)', 
                    border: '1px solid rgba(16, 185, 129, 0.2)', 
                    padding: '0.6rem 0.85rem', 
                    borderRadius: '8px', 
                    color: 'var(--success)', 
                    fontSize: '0.8rem',
                    textAlign: 'left'
                  }}>
                    <Sparkles size={14} style={{ flexShrink: 0 }} />
                    <span>
                      {Number(user?.upiLiteBalance) >= Number(amount) 
                        ? `UPI Lite eligible! Pin-less payment will be debited from UPI Lite balance (Available: ₹${Number(user?.upiLiteBalance).toFixed(2)}).`
                        : `Amount is ≤ ₹200 but UPI Lite balance (₹${Number(user?.upiLiteBalance).toFixed(2)}) is insufficient. Payment will use main wallet with PIN.`}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary glow-btn" 
                    disabled={!verifiedUser || sendLoading || !amount}
                    style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {sendLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    ) : (user?.upiLiteEnabled && Number(amount) <= 200 && Number(user?.upiLiteBalance) >= Number(amount)) ? (
                      <>
                        <Sparkles size={16} />
                        Pay via UPI Lite
                      </>
                    ) : (
                      'Pay Securely Now'
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={handleRequestMoney}
                    className="btn btn-secondary" 
                    disabled={!verifiedUser || requestLoading || !amount}
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6' }}
                  >
                    {requestLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        Requesting...
                      </>
                    ) : (
                      'Request Money'
                    )}
                  </button>
                </div>
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

      {/* SIMULATED UPI PIN MODAL */}
      {showUpiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ 
            width: '90%', 
            maxWidth: '360px', 
            borderRadius: '24px', 
            padding: '1.5rem', 
            background: '#0c1a30', 
            color: '#fff', 
            border: '1px solid #1a365d', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }} className="animate-fade-in">
            
            {/* Header: Bank & UPI logo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e3a63', paddingBottom: '0.75rem' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unified Payments Interface</span>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>AuraPay Wallet</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg, #df6226, #2251a3)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>UPI</span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>secured by NPCI</span>
              </div>
            </div>

            {/* Payment Info */}
            <div style={{ background: '#112544', padding: '1rem', borderRadius: '14px', border: '1px solid #1c3a66', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Paying Contact</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{verifiedUser?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>{verifiedUser?.upiId}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Amount</div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>
                  ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Hidden Input for keyboard typing support */}
            <input 
              type="password"
              value={upiPin}
              onChange={(e) => {
                setUpiError('');
                setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              }}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              maxLength={4}
              autoFocus
            />

            {/* PIN Dots display */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>ENTER 4-DIGIT UPI PIN</div>
              
              <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', alignItems: 'center' }}>
                {[0, 1, 2, 3].map(index => (
                  <div 
                    key={index} 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      border: '2.5px solid #3b82f6', 
                      background: upiPin.length > index ? '#3b82f6' : 'transparent',
                      boxShadow: upiPin.length > index ? '0 0 10px rgba(59, 130, 246, 0.6)' : 'none',
                      transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {upiError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>
                {upiError}
              </div>
            )}

            {/* Virtual Keypad */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.75rem', 
              marginTop: '0.5rem',
              justifyItems: 'center'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(key => {
                const isDelete = key === '⌫';
                const isSubmit = key === '✓';
                
                let btnBg = '#142744';
                let btnColor = '#fff';
                let btnHoverBg = '#1d355c';
                
                if (isSubmit) {
                  btnBg = '#10b981';
                  btnColor = '#fff';
                  btnHoverBg = '#059669';
                } else if (isDelete) {
                  btnBg = '#1e293b';
                  btnColor = '#cbd5e1';
                  btnHoverBg = '#334155';
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: btnBg,
                      color: btnColor,
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '50px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = btnHoverBg}
                    onMouseOut={(e) => e.currentTarget.style.background = btnBg}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Cancel link */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setShowUpiModal(false); setUpiPin(''); setUpiError(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cancel Transaction
              </button>
            </div>

          </div>
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
