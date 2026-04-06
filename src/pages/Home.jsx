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

    function getBingCacheKey(resolution, random){
      return `zerosite-bing-bg:${resolution}:${random ? 'rand' : 'today'}`
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

    loadConfig().then(async c=>{
      setCfg(c)
      // set background (bing or custom) into state
      try{
        if (c.background) {
          if (c.background.source === 'bing'){
            const res = (c.background && c.background.resolution) || 'uhd'
            const random = !!(c.background && c.background.random)
            const map = {
              uhd: 'https://bing.img.run/uhd.php',
              '1920x1080': 'https://bing.img.run/1920x1080.php',
              '1366x768': 'https://bing.img.run/1366x768.php',
              m: 'https://bing.img.run/m.php'
            }
            const randMap = {
              uhd: 'https://bing.img.run/rand_uhd.php',
              '1920x1080': 'https://bing.img.run/rand.php',
              '1366x768': 'https://bing.img.run/rand_1366x768.php',
              m: 'https://bing.img.run/rand_m.php'
            }
            const defaultUrl = random ? (randMap[res] || randMap.uhd) : (map[res] || map.uhd)
            const cached = getCachedBingUrl(res, random)
            const url = cached || defaultUrl
            setBgUrl(url)
            if (!cached) setCachedBingUrl(res, random, url)
            const img = new Image()
            img.onload = () => {/* loaded */}
            img.onerror = (e) => { console.warn('bg image preload error', e) }
            img.src = url
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
