import React, { useEffect, useState } from 'react'
import NavCard from '../components/NavCard'
import FloatingMenu from '../components/FloatingMenu'
import { logout } from '../services/auth'
import { loadConfig } from '../services/config'
import { motion } from 'framer-motion'
import Lenis from 'lenis'

export default function Home(){
  const [cfg, setCfg] = useState(null)
  const [bgUrl, setBgUrl] = useState('')

  useEffect(()=>{
    let lenis
    loadConfig().then(async c=>{
      setCfg(c)
      // set background (bing or custom) into state
      try{
        if (c.background) {
          if (c.background.source === 'bing'){
            const api = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'
            // try direct fetch first; if blocked by CORS, fallback to a CORS proxy (AllOrigins)
            async function fetchJsonWithFallback(url){
              try{
                const res = await fetch(url)
                if (res.ok) return await res.json()
                throw new Error('network response not ok')
              }catch(err){
                console.warn('direct fetch failed, trying proxy', err)
                const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
                const res2 = await fetch(proxy)
                if (res2.ok) return await res2.json()
                throw new Error('proxy fetch failed')
              }
            }

            const j = await fetchJsonWithFallback(api)
            if (j && j.images && j.images[0]){
              const url = 'https://www.bing.com' + j.images[0].url
              // set background immediately so UI shows quickly, still try to preload for diagnostics
              setBgUrl(url)
              const img = new Image()
              // avoid forcing CORS mode which can sometimes cause failures for remote assets
              img.onload = () => {/* loaded */}
              img.onerror = (e) => { console.warn('bg image preload error', e) }
              img.src = url
            }
          } else if (c.background.source === 'custom' && c.background.customUrl){
            // use custom URL immediately and attempt preload
            setBgUrl(c.background.customUrl)
            const img = new Image()
            img.onload = () => {/* loaded */}
            img.onerror = (e) => { console.warn('custom bg preload error', e) }
            img.src = c.background.customUrl
          }
        }
      }catch(e){ console.warn('bg load failed',e) }
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
            {cfg.navCards.map((n,i)=>(<NavCard key={i} item={n}/>))}
          </div>
        </section>
      </main>
      <FloatingMenu />
    </div>
  )
}
