import React from 'react';

export const getAvatarGradient = (name = '') => {
  const colors = [
    'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', // Violet
    'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', // Blue
    'linear-gradient(135deg, #34d399 0%, #059669 100%)', // Emerald
    'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', // Rose
    'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', // Amber
    'linear-gradient(135deg, #f472b6 0%, #db2777 100%)', // Pink
    'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)', // Teal
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const UserAvatar = ({ name = '', size = 40, style = {} }) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  const gradient = getAvatarGradient(name);

  // Derive font size based on avatar size
  const fontSize = `${(size * 0.45).toFixed(1)}px`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: gradient,
        color: '#fff',
        fontSize: fontSize,
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
        userSelect: 'none',
        ...style,
      }}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;
