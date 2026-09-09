import React, { useEffect, useState } from 'react'

const EMPTY_FORM = { title: '', link: '', iconUrl: '' }

function isValidLink(value){
  if (value.startsWith('#')) return /^#[A-Za-z0-9_-]+$/.test(value)
  try{
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  }catch(e){
    return false
  }
}

function isValidIconUrl(value){
  if (!value) return true
  if (value.startsWith('/')) return true
  try{
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  }catch(e){
    return false
  }
}

export default function AddCardModal({open, onClose, onSubmit, saving, error}){
  const [form, setForm] = useState(EMPTY_FORM)
  const [validationError, setValidationError] = useState('')

  useEffect(()=>{
    if (!open) return
    setForm(EMPTY_FORM)
    setValidationError('')
  }, [open])

  useEffect(()=>{
    if (!open) return undefined
    function onKeyDown(event){
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return ()=>{
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [open, onClose, saving])

  if (!open) return null

  function updateField(field, value){
    setForm(current=>({...current, [field]: value}))
    if (validationError) setValidationError('')
  }

  function handleSubmit(event){
    event.preventDefault()
    const title = form.title.trim()
    const link = form.link.trim()
    const iconUrl = form.iconUrl.trim()
    if (!title){
      setValidationError('请输入卡片名称')
      return
    }
    if (!isValidLink(link)){
      setValidationError('请输入有效网址（http(s)://）或站内页面链接（例如 #about）')
      return
    }
    if (!isValidIconUrl(iconUrl)){
      setValidationError('图标地址必须是 http(s) 地址或站内路径')
      return
    }
    onSubmit({title, link, ...(iconUrl ? {iconUrl} : {})})
  }

  return (
    <div className="modal-backdrop" data-lenis-prevent role="presentation" onMouseDown={event=>{ if (event.target === event.currentTarget && !saving) onClose() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-card-title" onWheel={event=>event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">首页导航</p>
            <h2 id="add-card-title">添加卡片</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} disabled={saving} aria-label="关闭添加卡片窗口">×</button>
        </div>
        <p className="modal-description">添加常用网站到首页。未填写图标地址时，会自动尝试读取网站 favicon。</p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="card-title">卡片名称</label>
            <input id="card-title" name="title" placeholder="例如：GitHub" value={form.title} onChange={event=>updateField('title', event.target.value)} maxLength={80} autoFocus required />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="card-link">链接地址</label>
            <input id="card-link" name="link" type="text" inputMode="url" placeholder="https://github.com" value={form.link} onChange={event=>updateField('link', event.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="card-icon">图标地址 <span className="optional">（可选）</span></label>
            <input id="card-icon" name="iconUrl" type="text" inputMode="url" placeholder="留空则自动获取网站 Logo" value={form.iconUrl} onChange={event=>updateField('iconUrl', event.target.value)} />
          </div>
          {(validationError || error) && <p className="form-error" role="alert">{validationError || error}</p>}
          <div className="modal-actions">
            <button className="btn secondary" type="button" onClick={onClose} disabled={saving}>取消</button>
            <button className="btn primary modal-submit" type="submit" disabled={saving}>{saving ? '保存中…' : '添加到首页'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
