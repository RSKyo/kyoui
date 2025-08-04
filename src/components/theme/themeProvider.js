'use client';
import { useEffect, useState } from 'react';

export default function ThemeProvider() {
  const [theme, setTheme] = useState(null); // null 代表尚未初始化

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (mode) => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // 系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };
    
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme);
    }
    applyTheme(newTheme);
  };
      
  return (
    <>
      <button onClick={() => updateTheme('light')}>☀️ Light</button>
      <button onClick={() => updateTheme('dark')}>🌙 Dark</button>
      <button onClick={() => updateTheme('system')}>🖥 System</button>
    </>
  );
};