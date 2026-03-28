export async function isAuthenticated(){
  try{
    const res = await fetch('/api/session', { credentials: 'include' })
    if (!res.ok) return false
    const j = await res.json()
    return !!(j && j.authenticated)
  }catch(e){ return false }
}

export async function login(username,password){
  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ username, password })
    })
    if (res.ok){ const j = await res.json().catch(()=>({})); return {ok:true, user: j.user}
    }
    const j = await res.json().catch(()=>({message:'登录失败'}))
    return {ok:false, message: j && j.message || '用户名或密码错误'}
  }catch(e){ return {ok:false,message:'无法登录'} }
}

export function logout(){
  fetch('/api/logout', {method:'POST', credentials:'include'}).finally(()=>{ location.href='/login' })
}
