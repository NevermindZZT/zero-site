const COOKIE_NAME = 'zero_auth'

function setCookie(name, value, maxAgeSec){ document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSec}` }
function getCookie(name){ const m = document.cookie.match(new RegExp('(^| )'+name+'=([^;]+)')); return m?m[2]:null }
function eraseCookie(name){ document.cookie = name+'=; path=/; max-age=0' }

export function isAuthenticated(){ return getCookie(COOKIE_NAME) === '1' }

export async function login(username,password){
  try{
    const res = await fetch('/js/config.json', {cache:'no-store'})
    const cfg = await res.json()
    const users = cfg.auth && cfg.auth.users || []
    const ok = users.some(u=>u.username===username && u.password===password)
    if (ok){ setCookie(COOKIE_NAME,'1',60*60); return {ok:true} }
    return {ok:false, message:'用户名或密码错误'}
  }catch(e){ return {ok:false,message:'无法读取配置'} }
}

export function logout(){ eraseCookie(COOKIE_NAME); location.href='/login' }
