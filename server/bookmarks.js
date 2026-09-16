const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MAX_GROUPS = 200
const MAX_BOOKMARKS = 5000
const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 600
const MAX_TAGS = 20

function now(){ return new Date().toISOString() }

function stripHtml(value){
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function readAttribute(tag, name){
  const expression = new RegExp(name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", 'i')
  const match = tag.match(expression)
  return match ? (match[1] || match[2] || match[3] || '') : ''
}

function isHttpUrl(value){
  try{
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  }catch(e){
    return false
  }
}

function normaliseUrl(value){
  try{
    const url = new URL(value)
    url.hash = ''
    if (url.pathname === '/') url.pathname = ''
    return url.toString().replace(/\/$/, '')
  }catch(e){
    return value
  }
}

function isSafeIconUrl(value){
  if (!value) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true
  return isHttpUrl(value)
}

function createStore(filePath){
  function ensureFile(){
    fs.mkdirSync(path.dirname(filePath), {recursive:true})
    if (!fs.existsSync(filePath)){
      write({version:1, groups:[], bookmarks:[]})
    }
  }

  function read(){
    ensureFile()
    try{
      const value = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      return {
        version: 1,
        groups: Array.isArray(value.groups) ? value.groups : [],
        bookmarks: Array.isArray(value.bookmarks) ? value.bookmarks : []
      }
    }catch(e){
      throw new Error('书签数据文件无法读取')
    }
  }

  function write(data){
    fs.mkdirSync(path.dirname(filePath), {recursive:true})
    const tempPath = filePath + '.' + process.pid + '.' + Date.now() + '.tmp'
    try{
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      try{
        fs.renameSync(tempPath, filePath)
      }catch(e){
        if (e && (e.code === 'EEXIST' || e.code === 'EPERM')){
          fs.rmSync(filePath, {force:true})
          fs.renameSync(tempPath, filePath)
        }else throw e
      }
    }finally{
      if (fs.existsSync(tempPath)) fs.rmSync(tempPath, {force:true})
    }
  }

  return {read, write}
}

function validateGroup(input){
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return {error:'请输入分组名称'}
  if (name.length > 80) return {error:'分组名称不能超过 80 个字符'}
  const icon = typeof input.icon === 'string' ? input.icon.trim().slice(0, 12) : ''
  const parentId = typeof input.parentId === 'string' && input.parentId ? input.parentId : null
  return {value:{name, icon, parentId}}
}

function validateBookmark(input){
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  const iconUrl = typeof input.iconUrl === 'string' ? input.iconUrl.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const groupId = typeof input.groupId === 'string' && input.groupId ? input.groupId : null
  const tags = Array.isArray(input.tags) ? input.tags.map(tag=>String(tag).trim()).filter(Boolean).slice(0, MAX_TAGS) : []
  if (!title) return {error:'请输入书签标题'}
  if (title.length > MAX_TITLE_LENGTH) return {error:'书签标题过长'}
  if (!isHttpUrl(url)) return {error:'书签链接必须是有效的 http(s) 地址'}
  if (!isSafeIconUrl(iconUrl)) return {error:'图标地址必须是站内路径或有效的 http(s) 地址'}
  if (description.length > MAX_DESCRIPTION_LENGTH) return {error:'书签描述过长'}
  return {value:{title, url, iconUrl, description, groupId, tags}}
}

function sortGroups(groups){
  return [...groups].sort((a,b)=>(a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name, 'zh-CN'))
}

function sortBookmarks(bookmarks){
  return [...bookmarks].sort((a,b)=>(a.sortOrder || 0) - (b.sortOrder || 0) || a.title.localeCompare(b.title, 'zh-CN'))
}

function nextSortOrder(items){
  return items.reduce((max, item)=>Math.max(max, Number(item.sortOrder) || 0), -1) + 1
}

function setOrders(items, ids){
  if (!Array.isArray(ids) || ids.length !== items.length) return null
  const map = new Map(items.map(item=>[item.id, item]))
  const used = new Set()
  const ordered = []
  for (const id of ids){
    const item = map.get(id)
    if (!item || used.has(id)) return null
    used.add(id)
    ordered.push(item)
  }
  return ordered.map((item, index)=>({...item, sortOrder:index, updatedAt:now()}))
}

function parseBookmarkHtml(html){
  const source = String(html || '')
  if (!source.trim()) return []
  const tokens = source.match(/<\/?DL\b[^>]*>|<H3\b[^>]*>[\s\S]*?<\/H3\s*>|<A\b[^>]*>[\s\S]*?<\/A\s*>/gi) || []
  const stack = []
  let pendingGroup = null
  const entries = []

  for (const token of tokens){
    if (/^<H3\b/i.test(token)){
      pendingGroup = stripHtml(token)
      continue
    }
    if (/^<DL\b/i.test(token)){
      if (pendingGroup){
        stack.push(pendingGroup)
        pendingGroup = null
      }else{
        stack.push(null)
      }
      continue
    }
    if (/^<\/DL/i.test(token)){
      stack.pop()
      continue
    }
    if (/^<A\b/i.test(token)){
      const href = stripHtml(readAttribute(token, 'href'))
      if (!isHttpUrl(href)) continue
      entries.push({
        title: stripHtml(token) || href,
        url: href,
        path: stack.filter(Boolean),
        iconUrl: '',
        description: ''
      })
    }
  }
  return entries
}

function pathKey(pathParts){ return pathParts.join(' / ') }

function createGroupPath(data, pathParts){
  let parentId = null
  for (const part of pathParts){
    const name = String(part || '').trim()
    if (!name) continue
    let group = data.groups.find(item=>item.name === name && (item.parentId || null) === parentId)
    if (!group){
      group = {
        id: crypto.randomUUID(),
        name,
        icon:'',
        parentId,
        sortOrder: nextSortOrder(data.groups.filter(item=>(item.parentId || null) === parentId)),
        createdAt:now(),
        updatedAt:now()
      }
      data.groups.push(group)
    }
    parentId = group.id
  }
  return parentId
}

function createBookmarkService(filePath){
  const store = createStore(filePath)

  function summary(){
    const data = store.read()
    return {groups:sortGroups(data.groups), bookmarks:sortBookmarks(data.bookmarks)}
  }

  function createGroup(input){
    const validation = validateGroup(input)
    if (validation.error) return validation
    const data = store.read()
    const value = validation.value
    if (data.groups.length >= MAX_GROUPS) return {error:'分组数量已达到上限'}
    if (value.parentId && !data.groups.some(group=>group.id === value.parentId)) return {error:'父分组不存在'}
    if (data.groups.some(group=>group.name === value.name && (group.parentId || null) === value.parentId)) return {error:'同级分组名称已存在'}
    const group = {...value, id:crypto.randomUUID(), sortOrder:nextSortOrder(data.groups.filter(item=>(item.parentId || null) === value.parentId)), createdAt:now(), updatedAt:now()}
    data.groups.push(group)
    store.write(data)
    return {group, data:summary()}
  }

  function updateGroup(id, input){
    const validation = validateGroup(input)
    if (validation.error) return validation
    const data = store.read()
    const index = data.groups.findIndex(group=>group.id === id)
    if (index < 0) return {error:'分组不存在', status:404}
    const value = validation.value
    if (value.parentId === id) return {error:'分组不能设为自身的子分组'}
    if (value.parentId && !data.groups.some(group=>group.id === value.parentId)) return {error:'父分组不存在'}
    let parentCursor = value.parentId
    const visited = new Set()
    while (parentCursor && !visited.has(parentCursor)){
      if (parentCursor === id) return {error:'分组不能移动到自身的子分组中'}
      visited.add(parentCursor)
      const parent = data.groups.find(group=>group.id === parentCursor)
      parentCursor = parent && parent.parentId
    }
    if (data.groups.some(group=>group.id !== id && group.name === value.name && (group.parentId || null) === value.parentId)) return {error:'同级分组名称已存在'}
    data.groups[index] = {...data.groups[index], ...value, updatedAt:now()}
    store.write(data)
    return {group:data.groups[index], data:summary()}
  }

  function deleteGroup(id){
    const data = store.read()
    if (!data.groups.some(group=>group.id === id)) return {error:'分组不存在', status:404}
    const descendantIds = new Set([id])
    let changed = true
    while (changed){
      changed = false
      for (const group of data.groups){
        if (group.parentId && descendantIds.has(group.parentId) && !descendantIds.has(group.id)){
          descendantIds.add(group.id)
          changed = true
        }
      }
    }
    data.groups = data.groups.filter(group=>!descendantIds.has(group.id))
    data.bookmarks = data.bookmarks.map(bookmark=>descendantIds.has(bookmark.groupId) ? {...bookmark, groupId:null, updatedAt:now()} : bookmark)
    store.write(data)
    return {data:summary()}
  }

  function reorderGroups(ids){
    const data = store.read()
    const ordered = setOrders(data.groups, ids)
    if (!ordered) return {error:'分组顺序数据无效'}
    data.groups = ordered
    store.write(data)
    return {data:summary()}
  }

  function createBookmark(input){
    const validation = validateBookmark(input)
    if (validation.error) return validation
    const data = store.read()
    const value = validation.value
    if (data.bookmarks.length >= MAX_BOOKMARKS) return {error:'书签数量已达到上限'}
    if (value.groupId && !data.groups.some(group=>group.id === value.groupId)) return {error:'目标分组不存在'}
    const normalized = normaliseUrl(value.url)
    if (data.bookmarks.some(bookmark=>normaliseUrl(bookmark.url) === normalized)) return {error:'该链接已存在'}
    const bookmark = {...value, id:crypto.randomUUID(), sortOrder:nextSortOrder(data.bookmarks.filter(item=>(item.groupId || null) === value.groupId)), createdAt:now(), updatedAt:now()}
    data.bookmarks.push(bookmark)
    store.write(data)
    return {bookmark, data:summary()}
  }

  function updateBookmark(id, input){
    const validation = validateBookmark(input)
    if (validation.error) return validation
    const data = store.read()
    const index = data.bookmarks.findIndex(bookmark=>bookmark.id === id)
    if (index < 0) return {error:'书签不存在', status:404}
    const value = validation.value
    if (value.groupId && !data.groups.some(group=>group.id === value.groupId)) return {error:'目标分组不存在'}
    const normalized = normaliseUrl(value.url)
    if (data.bookmarks.some(bookmark=>bookmark.id !== id && normaliseUrl(bookmark.url) === normalized)) return {error:'该链接已存在'}
    data.bookmarks[index] = {...data.bookmarks[index], ...value, updatedAt:now()}
    store.write(data)
    return {bookmark:data.bookmarks[index], data:summary()}
  }

  function deleteBookmark(id){
    const data = store.read()
    const index = data.bookmarks.findIndex(bookmark=>bookmark.id === id)
    if (index < 0) return {error:'书签不存在', status:404}
    const [bookmark] = data.bookmarks.splice(index, 1)
    store.write(data)
    return {bookmark, data:summary()}
  }

  function reorderBookmarks(groupId, ids){
    const data = store.read()
    const targetGroupId = groupId || null
    const withinGroup = data.bookmarks.filter(bookmark=>(bookmark.groupId || null) === targetGroupId)
    const ordered = setOrders(withinGroup, ids)
    if (!ordered) return {error:'书签顺序数据无效'}
    const orderMap = new Map(ordered.map(bookmark=>[bookmark.id, bookmark]))
    data.bookmarks = data.bookmarks.map(bookmark=>orderMap.get(bookmark.id) || bookmark)
    store.write(data)
    return {data:summary()}
  }

  function importPreview(html){
    const data = store.read()
    const entries = parseBookmarkHtml(html)
    const existingUrls = new Set(data.bookmarks.map(bookmark=>normaliseUrl(bookmark.url)))
    const groups = new Map()
    let duplicates = 0
    for (const entry of entries){
      const key = pathKey(entry.path)
      if (!groups.has(key)) groups.set(key, {path:entry.path, bookmarkCount:0})
      groups.get(key).bookmarkCount += 1
      if (existingUrls.has(normaliseUrl(entry.url))) duplicates += 1
    }
    return {entries, totalBookmarks:entries.length, duplicates, groups:[...groups.values()]}
  }

  function importBookmarks(input){
    const preview = importPreview(input.html)
    const selectedKeys = Array.isArray(input.selectedPaths) ? new Set(input.selectedPaths) : null
    const duplicateStrategy = input.duplicateStrategy === 'allow' ? 'allow' : 'skip'
    const data = store.read()
    const existingUrls = new Set(data.bookmarks.map(bookmark=>normaliseUrl(bookmark.url)))
    let imported = 0
    let skipped = 0
    for (const entry of preview.entries){
      const key = pathKey(entry.path)
      if (selectedKeys && !selectedKeys.has(key)) continue
      const normalized = normaliseUrl(entry.url)
      if (duplicateStrategy === 'skip' && existingUrls.has(normalized)){
        skipped += 1
        continue
      }
      if (data.bookmarks.length >= MAX_BOOKMARKS) break
      const groupId = createGroupPath(data, entry.path)
      data.bookmarks.push({
        id:crypto.randomUUID(),
        groupId,
        title:entry.title.slice(0, MAX_TITLE_LENGTH),
        url:entry.url,
        iconUrl:'',
        description:'',
        tags:[],
        sortOrder:nextSortOrder(data.bookmarks.filter(item=>(item.groupId || null) === groupId)),
        createdAt:now(),
        updatedAt:now()
      })
      existingUrls.add(normalized)
      imported += 1
    }
    store.write(data)
    return {imported, skipped, data:summary()}
  }

  return {summary, createGroup, updateGroup, deleteGroup, reorderGroups, createBookmark, updateBookmark, deleteBookmark, reorderBookmarks, importPreview, importBookmarks}
}

module.exports = {createBookmarkService}
