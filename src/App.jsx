import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import ContentPage from './pages/ContentPage'
import { isAuthenticated } from './services/auth'

function PrivateRoute({ children }) {
  const [checking, setChecking] = React.useState(true)
  const [authed, setAuthed] = React.useState(false)
  React.useEffect(()=>{
    let mounted = true
    isAuthenticated().then(ok=>{ if (mounted){ setAuthed(!!ok); setChecking(false) } })
    return ()=>{ mounted = false }
  },[])
  if (checking) return <div className="container"><p>检查会话…</p></div>
  return authed ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/page/:name" element={<ContentPage/>} />
        <Route path="/" element={<PrivateRoute><Home/></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
