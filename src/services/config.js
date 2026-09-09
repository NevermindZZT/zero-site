export async function loadConfig(){
  const res = await fetch('/api/config', {cache:'no-store', credentials:'include'})
  if (!res.ok) throw new Error('配置加载失败')
  return res.json()
}

export async function addNavCard(card){
  const res = await fetch('/api/nav-cards', {
    method: 'POST',
    credentials: 'include',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(card)
  })
  const payload = await res.json().catch(()=>({}))
  if (!res.ok){
    throw new Error(payload && payload.message || '卡片保存失败')
  }
  return payload
}

export async function reorderNavCards(order){
  const res = await fetch('/api/nav-cards/order', {
    method: 'PUT',
    credentials: 'include',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({order})
  })
  const payload = await res.json().catch(()=>({}))
  if (!res.ok){
    throw new Error(payload && payload.message || '卡片顺序保存失败')
  }
  return payload
}

export async function updateNavCard(reference, card){
  const res = await fetch('/api/nav-cards/' + encodeURIComponent(reference), {
    method: 'PUT',
    credentials: 'include',
    headers: {'content-type':'application/json'},
    body: JSON.stringify(card)
  })
  const payload = await res.json().catch(()=>({}))
  if (!res.ok){
    throw new Error(payload && payload.message || '卡片更新失败')
  }
  return payload
}

export async function deleteNavCard(reference){
  const res = await fetch('/api/nav-cards/' + encodeURIComponent(reference), {
    method: 'DELETE',
    credentials: 'include'
  })
  const payload = await res.json().catch(()=>({}))
  if (!res.ok){
    throw new Error(payload && payload.message || '卡片删除失败')
  }
  return payload
}
