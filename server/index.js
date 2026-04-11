const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { marked } = require('marked')

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

const crypto = require('crypto')
// In-memory session store for demo purposes
const sessions = {}

// Serve built frontend (dist) if exists, otherwise serve public for dev static assets
const distPath = path.join(__dirname, '..', 'dist')
const publicPath = path.join(__dirname, '..', 'public')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath))
}

// Helper to load config from public/js/config.json
function loadConfig(){
  const cfgPath = path.join(publicPath, 'js', 'config.json')
  if (fs.existsSync(cfgPath)){
    try{ return JSON.parse(fs.readFileSync(cfgPath,'utf8')) }catch(e){ return null }
  }
  return null
}

// API: get config
app.get('/api/config', (req,res)=>{
  const cfg = loadConfig()
  if (!cfg) return res.status(500).json({error:'config not found'})
  res.json(cfg)
})

// API: login (demo)
app.post('/api/login', (req,res)=>{
  const { username, password } = req.body || {}
  const cfg = loadConfig()
  const users = (cfg && cfg.auth && cfg.auth.users) || []
  const ok = users.some(u=>u.username === username && u.password === password)
  if (ok){
    // create a session id and set HttpOnly cookie
    const sid = crypto.randomBytes(16).toString('hex')
    sessions[sid] = { username, created: Date.now() }
    // set a longer-lived cookie (30 days), to avoid needing to re-login on refresh
    const cookieOpts = { maxAge: 30 * 24 * 3600 * 1000, httpOnly: true, sameSite: 'lax' }
    if (process.env.NODE_ENV === 'production') cookieOpts.secure = true
    res.cookie('zero_auth', sid, cookieOpts)
    return res.json({ok:true, user:{username}})
  }
  res.status(401).json({ok:false, message:'invalid credentials'})
})

// API: logout
app.post('/api/logout', (req,res)=>{
  const sid = req.cookies && req.cookies.zero_auth
  if (sid && sessions[sid]) delete sessions[sid]
  res.clearCookie('zero_auth')
  res.json({ok:true})
})

// API: session check
app.get('/api/session', (req,res)=>{
  const sid = req.cookies && req.cookies.zero_auth
  if (!sid) return res.json({ authenticated: false })
  const s = sessions[sid]
  if (!s) return res.json({ authenticated: false })
  res.json({ authenticated: true, user: { username: s.username } })
})

// API: serve pages (html or markdown -> html)
app.get('/api/pages/:name', (req,res)=>{
  const name = req.params.name
  const htmlPath = path.join(publicPath, 'pages', `${name}.html`)
  const mdPath = path.join(publicPath, 'pages', `${name}.md`)
  if (fs.existsSync(htmlPath)){
    return res.sendFile(htmlPath)
  }
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
app.get('*', (req,res)=>{
  const indexHtml = path.join(distPath, 'index.html')
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml)
  const fallback = path.join(publicPath, 'index.html')
  if (fs.existsSync(fallback)) return res.sendFile(fallback)
  res.status(404).send('not found')
})

app.listen(PORT, ()=>{
  console.log('ZeroSite server running on', PORT)
})
