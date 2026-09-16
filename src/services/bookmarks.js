async function request(path, options={}){
  const response = await fetch(path, {
    credentials:'include',
    ...options,
    headers:{'content-type':'application/json', ...(options.headers || {})}
  })
  const payload = await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(payload && payload.message || '操作失败，请稍后重试')
  return payload
}

export function loadBookmarks(){
  return request('/api/bookmarks')
}

export function createBookmark(bookmark){
  return request('/api/bookmarks', {method:'POST', body:JSON.stringify(bookmark)})
}

export function updateBookmark(id, bookmark){
  return request('/api/bookmarks/' + encodeURIComponent(id), {method:'PUT', body:JSON.stringify(bookmark)})
}

export function deleteBookmark(id){
  return request('/api/bookmarks/' + encodeURIComponent(id), {method:'DELETE'})
}

export function reorderBookmarks(groupId, order){
  return request('/api/bookmarks/order', {method:'PUT', body:JSON.stringify({groupId, order})})
}

export function createGroup(group){
  return request('/api/bookmark-groups', {method:'POST', body:JSON.stringify(group)})
}

export function updateGroup(id, group){
  return request('/api/bookmark-groups/' + encodeURIComponent(id), {method:'PUT', body:JSON.stringify(group)})
}

export function deleteGroup(id){
  return request('/api/bookmark-groups/' + encodeURIComponent(id), {method:'DELETE'})
}

export function previewBookmarkImport(html){
  return request('/api/bookmarks/import/preview', {method:'POST', body:JSON.stringify({html})})
}

export function importBookmarks(html, selectedPaths, duplicateStrategy='skip'){
  return request('/api/bookmarks/import', {method:'POST', body:JSON.stringify({html, selectedPaths, duplicateStrategy})})
}

export function addBookmarkToHome(id){
  return request('/api/bookmarks/' + encodeURIComponent(id) + '/add-to-home', {method:'POST', body:'{}'})
}
