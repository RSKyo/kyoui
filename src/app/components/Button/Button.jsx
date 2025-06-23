'use client';

import React from 'react';
import './button.css';
// import { VT323 } from 'next/font/google';

// const vt323 = VT323({
//   weight: '400',
//   subsets: ['latin'],
// });
// const ttt = document.getElementById('ttt');



export default function Button({ className='', text='', size='md', ...props }) {

  
  
  return (
    <button className={`op1-button ${size} ${className}`} {...props}>
      <span className={`op1-knob-bg`}>
      <span className={`op1-knob-surface`}>
      {text}
      </span>
      </span>
    </button>
    
  );
};