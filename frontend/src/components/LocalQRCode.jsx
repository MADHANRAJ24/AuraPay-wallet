import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const LocalQRCode = ({ value, size = 150 }) => {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (!value) return;
    
    QRCode.toDataURL(value, {
      width: size,
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

  if (!value) {
    return <div style={{ width: size, height: size, background: '#eee', borderRadius: '8px' }} />;
  }

  return qrSrc ? (
    <img 
      src={qrSrc} 
      alt="UPI QR Code" 
      style={{ width: `${size}px`, height: `${size}px`, display: 'block', borderRadius: '8px' }} 
    />
  ) : (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '0.8rem', color: '#666' }}>Loading QR...</span>
    </div>
  );
};

export default LocalQRCode;
