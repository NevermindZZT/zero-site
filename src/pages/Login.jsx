import React, { useState } from 'react'
import { login } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [u,setU] = useState('')
  const [p,setP] = useState('')
  const [err,setErr] = useState('')
  const nav = useNavigate()

  async function onSubmit(e){
    e.preventDefault()
    const res = await login(u,p)
    if (res.ok) nav('/')
    else setErr(res.message || '登录失败')
  }
  return (
    <main className="auth-shell">
      <div className="auth-container">
        <div className="auth-card card-vertical" role="region" aria-labelledby="login-title">
          <div className="auth-top">
            <div className="auth-brand">ZeroSite</div>
            <div id="login-title" className="auth-sub">欢迎回来，继续你的精彩内容</div>
          </div>

          <form className="login-form" onSubmit={onSubmit} aria-label="登录表单">
            <div className="form-group">
              <label className="label" htmlFor="username">用户名</label>
              <input id="username" name="username" placeholder="请输入用户名" value={u} onChange={e=>setU(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">密码</label>
              <input id="password" name="password" type="password" placeholder="请输入密码" value={p} onChange={e=>setP(e.target.value)} required />
            </div>

            {/* 记住我控件已移除 */}

            <button className="btn primary" type="submit">登录</button>

            <p className="error">{err}</p>
          </form>

          
        </div>
      </div>
    </main>
  )
}
