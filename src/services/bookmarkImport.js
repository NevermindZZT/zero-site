function normaliseUrl(value){
  try{
    const url = new URL(value, window.location.href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    url.hash = ''
    return url.toString()
  }catch(e){
    return ''
  }
}

function text(value){ return String(value || '').replace(/\s+/g, ' ').trim() }

export function parseBookmarkHtml(html){
  if (typeof DOMParser === 'undefined') throw new Error('当前浏览器不支持 HTML 书签解析')
  const document = new DOMParser().parseFromString(String(html || ''), 'text/html')
  const entries = []

  function walk(node, path){
    for (const child of Array.from(node.children || [])){
      const tag = child.tagName
      if (tag === 'DL' || tag === 'P'){
        walk(child, path)
        continue
      }
      if (tag !== 'DT') continue

      const folder = Array.from(child.children).find(item=>item.tagName === 'H3')
      if (folder){
        const folderName = text(folder.textContent)
        const nested = Array.from(child.children).find(item=>item.tagName === 'DL') || child.querySelector('dl')
        if (nested) walk(nested, folderName ? [...path, folderName] : path)
        continue
      }

      const anchor = Array.from(child.children).find(item=>item.tagName === 'A') || child.querySelector('a[href]')
      if (!anchor) continue
      const rawUrl = anchor.getAttribute('href') || ''
      const url = normaliseUrl(rawUrl)
      if (!url) continue
      entries.push({
        title: text(anchor.textContent) || url,
        url,
        path:[...path]
      })
    }
  }

  const roots = Array.from(document.querySelectorAll('body > dl'))
  if (roots.length) roots.forEach(root=>walk(root, []))
  else Array.from(document.querySelectorAll('dl')).filter(dl=>!dl.parentElement?.closest('dl')).forEach(root=>walk(root, []))
  return entries
}

export function buildBookmarkImportPreview(entries, currentBookmarks=[]){
  const existingUrls = new Set((currentBookmarks || []).map(bookmark=>normaliseUrl(bookmark.url)).filter(Boolean))
  const groups = new Map()
  let duplicates = 0
  for (const entry of entries || []){
    const path = Array.isArray(entry.path) ? entry.path : []
    const key = path.join(' / ')
    if (!groups.has(key)) groups.set(key, {path, bookmarkCount:0})
    groups.get(key).bookmarkCount += 1
    const normalized = normaliseUrl(entry.url)
    if (normalized && existingUrls.has(normalized)) duplicates += 1
    if (normalized) existingUrls.add(normalized)
  }
  return {totalBookmarks:(entries || []).length, duplicates, groups:[...groups.values()]}
}
