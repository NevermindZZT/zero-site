import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { logout } from '../services/auth'

function getSystemTheme(){
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function FloatingMenu(){
  const [open,setOpen] = useState(false)
  const [theme,setTheme] = useState(localStorage.getItem('theme') || getSystemTheme())

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  },[theme])

  function toggleTheme(){
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="floating-menu">
      <button className="menu-btn" aria-label="菜单" onClick={()=>setOpen(v=>!v)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      </button>
      <AnimatePresence>
      {open && (
        <motion.div className="menu-panel" initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:6}}>
          <button className="menu-item" onClick={toggleTheme} aria-label="切换主题">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>主题</span>
            <div className="menu-item-toggle">{theme === 'dark' ? '🌙' : '☀️'}</div>
          </button>
          <button className="menu-item" onClick={logout} aria-label="登出">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>登出</span>
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
