const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { marked } = require('marked')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 8080

// Allow credentials (cookies) in cross-origin dev mode / remote access.
// For production, set proper origin and https.
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// In-memory session store for demo purposes
const sessions = {}
const MAX_NAV_CARDS = 100
const MAX_CARD_TITLE_LENGTH = 80
const MAX_ICON_HTML_BYTES = 1024 * 1024
const MAX_ICON_IMAGE_BYTES = 512 * 1024
const MAX_ICON_REDIRECTS = 5
const ICON_REQUEST_TIMEOUT_MS = 8000

// Serve built frontend (dist) if exists, otherwise serve public for dev static assets
const distPath = path.join(__dirname, '..', 'dist')
const publicPath = path.join(__dirname, '..', 'public')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath))
}

function getConfigPath(){
  return path.join(publicPath, 'js', 'config.json')
}

// Helper to load config from public/js/config.json
function loadConfig(){
  const cfgPath = getConfigPath()
  if (fs.existsSync(cfgPath)){
    try{ return JSON.parse(fs.readFileSync(cfgPath,'utf8')) }catch(e){ return null }
  }
  return null
}

function saveConfig(cfg){
  const cfgPath = getConfigPath()
  const tempPath = cfgPath + '.' + process.pid + '.' + Date.now() + '.tmp'
  const data = JSON.stringify(cfg, null, 2) + '\n'
  try{
    fs.writeFileSync(tempPath, data, 'utf8')
    try{
      fs.renameSync(tempPath, cfgPath)
    }catch(e){
      // Windows cannot always rename over an existing file. Replace it only
      // after the temporary file has been written successfully.
      if (e && (e.code === 'EEXIST' || e.code === 'EPERM')){
        fs.rmSync(cfgPath, {force:true})
        fs.renameSync(tempPath, cfgPath)
      }else{
        throw e
      }
    }
  }finally{
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, {force:true})
  }
}

// The browser only needs public site/navigation settings. Keep credentials
// server-side so /api/config never sends configured passwords to the client.
function toPublicConfig(cfg){
  if (!cfg || typeof cfg !== 'object') return cfg
  const { auth, ...publicCfg } = cfg
  return {
    ...publicCfg,
    navCards: Array.isArray(publicCfg.navCards) ? publicCfg.navCards : []
  }
}

function getSession(req){
  const sid = req.cookies && req.cookies.zero_auth
  return sid ? sessions[sid] : null
}

function requireAuth(req,res,next){
  if (!getSession(req)) return res.status(401).json({ok:false,message:'请先登录'})
  next()
}

function isValidHttpUrl(value){
  try{
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    return true
  }catch(e){
    return false
  }
}

function validateCardInput(body){
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {error:'请求数据无效'}
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const link = typeof body.link === 'string' ? body.link.trim() : ''
  const iconUrl = typeof body.iconUrl === 'string' ? body.iconUrl.trim() : ''
  if (!title) return {error:'请输入卡片名称'}
  if (title.length > MAX_CARD_TITLE_LENGTH) return {error:'卡片名称不能超过' + MAX_CARD_TITLE_LENGTH + '个字符'}
  const validInternalLink = /^#[A-Za-z0-9_-]{1,80}$/.test(link)
  if (!validInternalLink && !isValidHttpUrl(link)) return {error:'链接必须是 http(s) 地址或站内页面链接'}
  if (iconUrl){
    const validRelativeIcon = iconUrl.startsWith('/') && !iconUrl.startsWith('//')
    if (!validRelativeIcon && !isValidHttpUrl(iconUrl)) return {error:'图标地址必须是 http(s) 地址或站内路径'}
  }
  return {card:{title,link,...(iconUrl ? {iconUrl} : {})}}
}

function normalizeNavCards(cards){
  const usedIds = new Set()
  return cards.map(card=>{
    const existingId = card && typeof card.id === 'string' && card.id ? card.id : ''
    const id = existingId && !usedIds.has(existingId) ? existingId : crypto.randomUUID()
    usedIds.add(id)
    return {...card,id}
  })
}

function reorderNavCards(cards, order){
  if (!Array.isArray(order) || order.length !== cards.length) return null
  const normalized = normalizeNavCards(cards)
  const byId = new Map(normalized.map(card=>[card.id, card]))
  const usedIds = new Set()
  const reordered = []
  for (const reference of order){
    let card = null
    if (reference && typeof reference.id === 'string') card = byId.get(reference.id) || null
    else if (reference && Number.isInteger(reference.index)) card = normalized[reference.index] || null
    if (!card || usedIds.has(card.id)) return null
    usedIds.add(card.id)
    reordered.push(card)
  }
  return reordered
}

function parseHttpUrl(raw){
  try{
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    url.hash = ''
    return url
  }catch(e){
    return null
  }
}

function decodeHtmlEntities(value){
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/gi, '/')
}

function getAttribute(tag, name){
  const pattern = new RegExp(name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", 'i')
  const match = tag.match(pattern)
  return match ? (match[1] || match[2] || match[3] || '') : ''
}

function extractIconCandidates(html, pageUrl){
  const candidates = []
  const seen = new Set()
  const addCandidate = (raw, priority)=>{
    if (!raw) return
    try{
      const resolved = new URL(decodeHtmlEntities(raw.trim()), pageUrl)
      if ((resolved.protocol !== 'http:' && resolved.protocol !== 'https:') || resolved.username || resolved.password) return
      resolved.hash = ''
      const value = resolved.toString()
      if (!seen.has(value)){
        seen.add(value)
        candidates.push({url:value, priority})
      }
    }catch(e){ /* ignore malformed icon references */ }
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) || []
  for (const tag of linkTags){
    const rel = getAttribute(tag, 'rel').toLowerCase().split(/\s+/).filter(Boolean)
    const href = getAttribute(tag, 'href')
    if (rel.includes('icon')) addCandidate(href, rel.includes('shortcut') ? 1 : 0)
    else if (rel.includes('apple-touch-icon')) addCandidate(href, 2)
    else if (rel.includes('mask-icon')) addCandidate(href, 3)
  }

  const metaTags = html.match(/<meta\b[^>]*>/gi) || []
  for (const tag of metaTags){
    const name = (getAttribute(tag, 'name') || getAttribute(tag, 'property')).toLowerCase()
    if (name === 'msapplication-tileimage' || name === 'og:image') addCandidate(getAttribute(tag, 'content'), 4)
  }

  return candidates.sort((a,b)=>a.priority - b.priority).map(candidate=>candidate.url)
}

async function fetchWithTimeout(url, options){
  const controller = new AbortController()
  const timer = setTimeout(()=>controller.abort(), ICON_REQUEST_TIMEOUT_MS)
  try{
    return await fetch(url, {...options, signal:controller.signal, redirect:'manual'})
  }finally{
    clearTimeout(timer)
  }
}

async function fetchWithRedirects(rawUrl, options={}){
  let current = rawUrl
  for (let i=0; i<=MAX_ICON_REDIRECTS; i += 1){
    const parsed = parseHttpUrl(current)
    if (!parsed) throw new Error('invalid redirect')
    const response = await fetchWithTimeout(parsed.toString(), options)
    if (response.status >= 300 && response.status < 400){
      const location = response.headers.get('location')
      if (!location) return {response,url:parsed.toString()}
      const next = new URL(location, parsed)
      if ((next.protocol !== 'http:' && next.protocol !== 'https:') || next.username || next.password) throw new Error('invalid redirect')
      current = next.toString()
      continue
    }
    return {response,url:parsed.toString()}
  }
  throw new Error('too many redirects')
}

async function readResponseBuffer(response, maxBytes){
  if (!response.body){
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > maxBytes) return null
    return Buffer.from(arrayBuffer)
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  try{
    while (true){
      const part = await reader.read()
      if (part.done) break
      total += part.value.byteLength
      if (total > maxBytes){
        await reader.cancel()
        return null
      }
      chunks.push(Buffer.from(part.value))
    }
  }finally{
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

function inferImageType(url, response){
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (contentType.startsWith('image/')) return contentType
  if (contentType && contentType !== 'application/octet-stream' && contentType !== 'binary/octet-stream') return ''
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith('.ico')) return 'image/x-icon'
  if (pathname.endsWith('.svg')) return 'image/svg+xml'
  if (pathname.endsWith('.png')) return 'image/png'
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
  if (pathname.endsWith('.webp')) return 'image/webp'
  if (pathname.endsWith('.gif')) return 'image/gif'
  return ''
}

async function sendImageIfValid(res, response, url){
  if (!response.ok) return false
  const contentType = inferImageType(url, response)
  if (!contentType) return false
  const data = await readResponseBuffer(response, MAX_ICON_IMAGE_BYTES)
  if (!data) return false
  res.set({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff'
  })
  res.send(data)
  return true
}

async function resolveSiteIcon(target, res){
  let pageUrl = target
  try{
    const pageResult = await fetchWithRedirects(target, {
      headers:{
        'accept':'text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5',
        'user-agent':'ZeroSite favicon resolver'
      }
    })
    pageUrl = pageResult.url
    if (await sendImageIfValid(res, pageResult.response, pageResult.url)) return true

    const contentType = (pageResult.response.headers.get('content-type') || '').toLowerCase()
    if (pageResult.response.ok && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'))){
      const htmlBuffer = await readResponseBuffer(pageResult.response, MAX_ICON_HTML_BYTES)
      if (htmlBuffer){
        const html = htmlBuffer.toString('utf8')
        const candidates = extractIconCandidates(html, pageResult.url)
        for (const candidate of candidates){
          try{
            const iconResult = await fetchWithRedirects(candidate, {
              headers:{
                'accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'user-agent':'ZeroSite favicon resolver'
              }
            })
            if (await sendImageIfValid(res, iconResult.response, iconResult.url)) return true
          }catch(e){ /* try the next candidate */ }
        }
      }
    }
  }catch(e){ /* fall back to /favicon.ico below */ }

  const fallback = new URL('/favicon.ico', pageUrl)
  try{
    const fallbackResult = await fetchWithRedirects(fallback.toString(), {
      headers:{'accept':'image/*,*/*;q=0.8','user-agent':'ZeroSite favicon resolver'}
    })
    if (await sendImageIfValid(res, fallbackResult.response, fallbackResult.url)) return true
  }catch(e){ /* no site icon available */ }
  return false
}

// API: get public config (credentials are intentionally omitted)
app.get('/api/config',(req,res)=>{
  const cfg = loadConfig()
  if (!cfg) return res.status(500).json({error:'config not found'})
  res.json(toPublicConfig(cfg))
})

// API: login (demo)
app.post('/api/login',(req,res)=>{
  const { username, password } = req.body || {}
  const cfg = loadConfig()
  const users = (cfg && cfg.auth && cfg.auth.users) || []
  const ok = users.some(u=>u.username === username && u.password === password)
  if (ok){
    const sid = crypto.randomBytes(16).toString('hex')
    sessions[sid] = { username, created: Date.now() }
    const cookieOpts = { maxAge: 30 * 24 * 3600 * 1000, httpOnly: true, sameSite: 'lax' }
    if (process.env.NODE_ENV === 'production') cookieOpts.secure = true
    res.cookie('zero_auth', sid, cookieOpts)
    return res.json({ok:true, user:{username}})
  }
  res.status(401).json({ok:false, message:'invalid credentials'})
})

// API: logout
app.post('/api/logout',(req,res)=>{
  const sid = req.cookies && req.cookies.zero_auth
  if (sid && sessions[sid]) delete sessions[sid]
  res.clearCookie('zero_auth')
  res.json({ok:true})
})

// API: session check
app.get('/api/session',(req,res)=>{
  const session = getSession(req)
  if (!session) return res.json({ authenticated: false })
  res.json({ authenticated: true, user: { username: session.username } })
})

// API: read homepage cards for authenticated clients
app.get('/api/nav-cards', requireAuth, (req,res)=>{
  const cfg = loadConfig()
  if (!cfg) return res.status(500).json({ok:false,message:'config not found'})
  const cards = Array.isArray(cfg.navCards) ? normalizeNavCards(cfg.navCards) : []
  res.json({ok:true,cards})
})

// API: append a homepage card to the runtime config
app.post('/api/nav-cards', requireAuth, (req,res)=>{
  const validation = validateCardInput(req.body)
  if (validation.error) return res.status(400).json({ok:false,message:validation.error})
  const cfg = loadConfig()
  if (!cfg) return res.status(500).json({ok:false,message:'config not found'})
  const currentCards = Array.isArray(cfg.navCards) ? normalizeNavCards(cfg.navCards) : []
  if (currentCards.length >= MAX_NAV_CARDS) return res.status(400).json({ok:false,message:'首页卡片数量已达到上限'})
  const card = {id:crypto.randomUUID(), ...validation.card}
  cfg.navCards = [...currentCards, card]
  try{
    saveConfig(cfg)
  }catch(e){
    console.error('config save failed', e && e.message)
    return res.status(500).json({ok:false,message:'卡片保存失败'})
  }
  res.status(201).json({ok:true, card, config:toPublicConfig(cfg)})
})

// API: persist the order of homepage cards
app.put('/api/nav-cards/order', requireAuth, (req,res)=>{
  const cfg = loadConfig()
  if (!cfg) return res.status(500).json({ok:false,message:'config not found'})
  const currentCards = Array.isArray(cfg.navCards) ? cfg.navCards : []
  const reordered = reorderNavCards(currentCards, req.body && req.body.order)
  if (!reordered) return res.status(400).json({ok:false,message:'卡片顺序数据无效'})
  cfg.navCards = reordered
  try{
    saveConfig(cfg)
  }catch(e){
    console.error('config order save failed', e && e.message)
    return res.status(500).json({ok:false,message:'卡片顺序保存失败'})
  }
  res.json({ok:true,config:toPublicConfig(cfg)})
})

// API: resolve a site's favicon/logo server-side to avoid browser CORS issues
app.get('/api/favicon', requireAuth, async (req,res)=>{
  const target = typeof req.query.url === 'string' ? req.query.url : ''
  const parsed = parseHttpUrl(target)
  if (!parsed) return res.status(400).end()
  try{
    const found = await resolveSiteIcon(parsed.toString(), res)
    if (!found && !res.headersSent) res.status(404).end()
  }catch(e){
    if (!res.headersSent) res.status(404).end()
  }
})

// API: serve pages (html or markdown -> html)
app.get('/api/pages/:name',(req,res)=>{
  const name = req.params.name
  const htmlPath = path.join(publicPath, 'pages', name + '.html')
  const mdPath = path.join(publicPath, 'pages', name + '.md')
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath)
  if (fs.existsSync(mdPath)){
    try{
      const md = fs.readFileSync(mdPath,'utf8')
      const html = marked.parse(md)
      return res.send(html)
    }catch(e){ return res.status(500).send('render error') }
  }
  return res.status(404).send('not found')
})

// Fallback: serve index.html for SPA routes
app.get('*',(req,res)=>{
  const indexHtml = path.join(distPath, 'index.html')
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml)
  const fallback = path.join(publicPath, 'index.html')
  if (fs.existsSync(fallback)) return res.sendFile(fallback)
  res.status(404).send('not found')
})

app.listen(PORT,()=>{
  console.log('ZeroSite server running on', PORT)
})
