import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// initialize theme: prefer localStorage, otherwise system
const saved = localStorage.getItem('theme')
if (saved) document.documentElement.setAttribute('data-theme', saved)
else {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
