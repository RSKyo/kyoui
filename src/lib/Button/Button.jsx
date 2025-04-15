'use client';

import React from 'react';
import './button.css';

export default function Button({ type = 'default', disabled, onClick, children }) {
  return (
    <button className={`my-btn ${type}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};