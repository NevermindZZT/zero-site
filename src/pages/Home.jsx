import React, { useEffect, useState } from 'react'
import NavCard from '../components/NavCard'
import FloatingMenu from '../components/FloatingMenu'
import AddCardModal from '../components/AddCardModal'
import ManageCardsModal from '../components/ManageCardsModal'
import { loadConfig, addNavCard, updateNavCard, deleteNavCard, reorderNavCards } from '../services/config'
import { motion } from 'framer-motion'
import Lenis from 'lenis'

export default function Home(){
  const [cfg, setCfg] = useState(null)
  const [bgUrl, setBgUrl] = useState('')
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [savingCard, setSavingCard] = useState(false)
  const [cardError, setCardError] = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [manageCardsOpen, setManageCardsOpen] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')

  useEffect(()=>{
    let lenis

    function getBingCacheKey(resolution, random){
      return `zerosite-bing-bg:v2:${resolution}:${random ? 'rand' : 'today'}`
    }

    function getCachedBingUrl(resolution, random){
      if (!window.localStorage) return null
      try{
        const key = getBingCacheKey(resolution, random)
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const entry = JSON.parse(raw)
        if (!entry || !entry.url || !entry.date) return null
        const today = new Date().toISOString().slice(0,10)
        if (entry.date !== today) return null
        return entry.url
      }catch(e){ return null }
    }

    function setCachedBingUrl(resolution, random, url){
      if (!window.localStorage) return
      try{
        const key = getBingCacheKey(resolution, random)
        const entry = { url, date: new Date().toISOString().slice(0,10) }
        window.localStorage.setItem(key, JSON.stringify(entry))
      }catch(e){ /* ignore */ }
    }

    function clearCachedBingUrl(resolution, random){
      if (!window.localStorage) return
      try{ window.localStorage.removeItem(getBingCacheKey(resolution, random)) }catch(e){ /* ignore */ }
    }

    function preloadBackground(url, onError){
      const img = new Image()
      img.onload = () => {/* loaded */}
      img.onerror = onError || (()=>{})
      img.src = url
    }

    async function loadBingBackground(background, useCache=true){
      const resolution = (background && background.resolution) || 'uhd'
      const random = !!(background && background.random)
      const cached = useCache ? getCachedBingUrl(resolution, random) : null
      if (cached){
        setBgUrl(cached)
        preloadBackground(cached, ()=>{
          clearCachedBingUrl(resolution, random)
          loadBingBackground(background, false)
        })
        return
      }

      try{
        const endpoint = '/api/bing-wallpaper?resolution=' + encodeURIComponent(resolution) + '&random=' + String(random)
        const response = await fetch(endpoint, {cache:'no-store', credentials:'include'})
        if (!response.ok) throw new Error('Bing wallpaper API returned ' + response.status)
        const payload = await response.json()
        if (!payload || !payload.url) throw new Error('Bing wallpaper URL missing')
        setBgUrl(payload.url)
        setCachedBingUrl(resolution, random, payload.url)
        preloadBackground(payload.url, ()=>{
          clearCachedBingUrl(resolution, random)
          console.warn('Bing wallpaper image failed to load')
        })
      }catch(e){
        console.warn('Bing wallpaper load failed', e)
      }
    }

    loadConfig().then(async c=>{
      setCfg(c)
      // set background (Bing archive or custom) into state
      try{
        if (c.background) {
          if (c.background.source === 'bing'){
            await loadBingBackground(c.background)
          } else if (c.background.source === 'custom' && c.background.customUrl){
            setBgUrl(c.background.customUrl)
            preloadBackground(c.background.customUrl, e=>console.warn('custom bg preload error', e))
          }
        }
      }catch(e){ console.warn('bg load failed',e) }
    }).catch(e=>{
      console.warn('config load failed', e)
    })
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) {
      lenis = new Lenis({ duration:1.2 })
      function raf(t){ lenis.raf(t); requestAnimationFrame(raf) }
      requestAnimationFrame(raf)
    }
    return ()=>{ if (lenis && lenis.destroy) lenis.destroy() }
  },[])

  if (!cfg) return null

  function onSearch(e){
    e.preventDefault()
    const q = e.target.q.value.trim()
    if (!q) return
    const engine = (cfg.search && cfg.search.engine) || 'bing'
    const base = (cfg.search && cfg.search.engines && cfg.search.engines[engine]) || 'https://www.bing.com/search?q='
    location.href = base + encodeURIComponent(q)
  }

  function getCardReference(card){
    if (card && card.id) return card.id
    if (card && Number.isInteger(card.__originalIndex)) return 'index-' + card.__originalIndex
    return ''
  }

  async function handleSaveCard(card, originalCard){
    setSavingCard(true)
    setCardError('')
    try{
      const reference = getCardReference(originalCard)
      const payload = originalCard ? await updateNavCard(reference, card) : await addNavCard(card)
      if (payload && payload.config){
        setCfg(payload.config)
      } else if (!originalCard) {
        setCfg(current=>({...current, navCards:[...(current.navCards || []), (payload && payload.card) || card]}))
      }
      setEditingCard(null)
      setAddCardOpen(false)
    }catch(e){
      setCardError(e.message || '卡片保存失败，请稍后重试')
    }finally{
      setSavingCard(false)
    }
  }

  async function handleDeleteCard(card){
    const reference = getCardReference(card)
    if (!reference){
      setOrderError('无法定位要删除的卡片')
      return
    }
    setSavingOrder(true)
    setOrderError('')
    try{
      const payload = await deleteNavCard(reference)
      if (payload && payload.config) setCfg(payload.config)
    }catch(e){
      setOrderError(e.message || '卡片删除失败，请稍后重试')
    }finally{
      setSavingOrder(false)
    }
  }

  function openAddCard(){
    setCardError('')
    setEditingCard(null)
    setAddCardOpen(true)
  }

  function openEditCard(card){
    setCardError('')
    setManageCardsOpen(false)
    setEditingCard(card)
    setAddCardOpen(true)
  }

  async function handleReorderCards(order){
    setSavingOrder(true)
    setOrderError('')
    try{
      const payload = await reorderNavCards(order)
      if (payload && payload.config) setCfg(payload.config)
      setManageCardsOpen(false)
    }catch(e){
      setOrderError(e.message || '卡片顺序保存失败，请稍后重试')
    }finally{
      setSavingOrder(false)
    }
  }

  function openManageCards(){
    setOrderError('')
    setManageCardsOpen(true)
  }

  return (
    <div>
      <div id="bg" className="bg" aria-hidden="true" style={{
        backgroundImage: bgUrl?`url(${bgUrl})`:'none',
        // expose CSS vars to control overlay independently from image opacity
        '--bg-overlay-opacity': (cfg && cfg.background && (typeof cfg.background.overlayOpacity === 'number' ? cfg.background.overlayOpacity : cfg.background.overlayOpacity)) || 0.45,
        '--bg-overlay-top': (cfg && cfg.background && cfg.background.overlayTop) || undefined,
        '--bg-overlay-bottom': (cfg && cfg.background && cfg.background.overlayBottom) || undefined
      }}></div>
      {/* header intentionally removed per design */}

      <main className="container">
        <section className="hero">
          <motion.h1 id="hero-title" initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.7}}>{cfg.site.hero}</motion.h1>
          <form className="search" onSubmit={onSearch}>
            <div className="search-input-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
              <input name="q" placeholder="搜索或输入查询并回车" />
            </div>
          </form>
        </section>

        <section>
          <h2>导航</h2>
          <div className="cards">
             {(cfg.navCards || []).map((n,i)=>(<NavCard key={n.id || n.link || i} item={n}/>))}
          </div>
        </section>
      </main>
      <FloatingMenu onAddCard={openAddCard} onManageCards={openManageCards} />
      <AddCardModal
        open={addCardOpen}
        onClose={()=>{ if (!savingCard) { setEditingCard(null); setAddCardOpen(false) } }}
        onSubmit={handleSaveCard}
        saving={savingCard}
        error={cardError}
        initialCard={editingCard}
      />
      <ManageCardsModal
        open={manageCardsOpen}
        cards={cfg.navCards || []}
        onClose={()=>{ if (!savingOrder) setManageCardsOpen(false) }}
        onSubmit={handleReorderCards}
        onEditCard={openEditCard}
        onDeleteCard={handleDeleteCard}
        saving={savingOrder}
        error={orderError}
      />
    </div>
  )
}
