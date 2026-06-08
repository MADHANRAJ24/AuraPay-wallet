import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const LocalQRCode = ({ value, size = 150, showDownload = true }) => {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (!value) return;
    
    QRCode.toDataURL(value, {
      width: size * 2, // higher resolution for print/scan clarity
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => {
        setQrSrc(url);
      })
      .catch(err => {
        console.error('Error generating local QR code:', err);
      });
  }, [value, size]);

  const handleDownload = () => {
    if (!qrSrc) return;
    const link = document.createElement('a');
    link.href = qrSrc;
    link.download = `${value.split('@')[0]}_upi_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!value) {
    return <div style={{ width: size, height: size, background: '#eee', borderRadius: '8px' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {/* White box wrapping QR image */}
      <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', display: 'inline-flex', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        {qrSrc ? (
          <img 
            src={qrSrc} 
            alt="UPI QR Code" 
            style={{ width: `${size}px`, height: `${size}px`, display: 'block' }} 
          />
        ) : (
          <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Loading...</span>
          </div>
        )}
      </div>

      {/* Download button */}
      {showDownload && qrSrc && (
        <button
          type="button"
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#c084fc', // purple text matching dashboard accent
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.22)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ display: 'flex', fontSize: '1rem' }}>📥</span> Download QR Code
        </button>
      )}
    </div>
  );
};

export default LocalQRCode;
