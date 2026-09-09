import React, { useEffect, useState } from 'react'

function createDraft(cards){
  return (cards || []).map((card,index)=>({...card,__originalIndex:index}))
}

function createOrder(draft){
  return draft.map(card=>card.id ? {id:card.id} : {index:card.__originalIndex})
}

export default function ManageCardsModal({open, cards, onClose, onSubmit, saving, error}){
  const [draft, setDraft] = useState([])

  useEffect(()=>{
    if (open) setDraft(createDraft(cards))
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

  function moveCard(index, direction){
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= draft.length) return
    setDraft(current=>{
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next
    })
  }

  function handleSubmit(event){
    event.preventDefault()
    onSubmit(createOrder(draft))
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event=>{ if (event.target === event.currentTarget && !saving) onClose() }}>
      <section className="modal-card manage-modal-card" role="dialog" aria-modal="true" aria-labelledby="manage-card-title" onWheel={event=>event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">首页导航</p>
            <h2 id="manage-card-title">调整卡片顺序</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} disabled={saving} aria-label="关闭卡片排序窗口">×</button>
        </div>
        <p className="modal-description">使用每行右侧的箭头调整显示顺序，保存后首页会立即更新。</p>
        <form onSubmit={handleSubmit}>
          {draft.length ? (
            <ol className="manage-card-list" aria-label="首页卡片顺序">
              {draft.map((card,index)=>(
                <li className="manage-card-row" key={card.id || card.__originalIndex}>
                  <span className="manage-card-position" aria-hidden="true">{index + 1}</span>
                  <div className="manage-card-info">
                    <strong>{card.title || '未命名卡片'}</strong>
                    <span title={card.link}>{card.link}</span>
                  </div>
                  <div className="manage-card-controls">
                    <button className="move-btn" type="button" onClick={()=>moveCard(index,-1)} disabled={saving || index === 0} aria-label={'上移 ' + (card.title || '卡片')}>↑</button>
                    <button className="move-btn" type="button" onClick={()=>moveCard(index,1)} disabled={saving || index === draft.length - 1} aria-label={'下移 ' + (card.title || '卡片')}>↓</button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="manage-empty">还没有首页卡片。</p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="btn secondary" type="button" onClick={onClose} disabled={saving}>取消</button>
            <button className="btn primary modal-submit" type="submit" disabled={saving}>{saving ? '保存中…' : '保存顺序'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
