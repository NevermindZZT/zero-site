import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addBookmarkToHome,
  createBookmark,
  createGroup,
  deleteBookmark,
  deleteGroup,
  importBookmarks,
  loadBookmarks,
  reorderBookmarks,
  updateBookmark,
  updateGroup
} from '../services/bookmarks'
import { buildBookmarkImportPreview, parseBookmarkHtml } from '../services/bookmarkImport'

const EMPTY_BOOKMARK = {title:'', url:'', iconUrl:'', description:'', groupId:'', tags:''}
const EMPTY_GROUP = {name:'', icon:'', parentId:''}

function BookmarkIcon({bookmark}){
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const fallback = (bookmark.title || '?').trim().charAt(0).toUpperCase() || '?'
  useEffect(()=>{ setLoaded(false); setFailed(false) }, [bookmark.iconUrl, bookmark.url])
  const source = bookmark.iconUrl || (bookmark.url ? '/api/favicon?url=' + encodeURIComponent(bookmark.url) : '')
  return (
    <span className={'bookmark-icon ' + (loaded ? 'is-loaded' : '')}>
      {!loaded && <span className="bookmark-icon-fallback">{fallback}</span>}
      {source && !failed && <img src={source} alt="" loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}
    </span>
  )
}

function Modal({title, children, onClose, wide=false}){
  return (
    <div className="modal-backdrop" data-lenis-prevent role="presentation" onMouseDown={event=>{ if (event.target === event.currentTarget) onClose() }}>
      <section className={'modal-card bookmark-modal-card ' + (wide ? 'bookmark-modal-card--wide' : '')} role="dialog" aria-modal="true" aria-label={title} onWheel={event=>event.stopPropagation()}>
        <div className="modal-header">
          <div><p className="eyebrow">书签管理</p><h2>{title}</h2></div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={'关闭' + title}>×</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function GroupTree({groups, selectedGroupId, onSelect, onEdit, onDelete}){
  const byParent = useMemo(()=>{
    const map = new Map()
    groups.forEach(group=>{
      const key = group.parentId || 'root'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(group)
    })
    return map
  }, [groups])
  function render(parentId, depth=0){
    return (byParent.get(parentId || 'root') || []).map(group=>(
      <React.Fragment key={group.id}>
        <div className={'bookmark-group-row ' + (selectedGroupId === group.id ? 'is-active' : '')} style={{'--group-depth':depth}}>
          <button type="button" className="bookmark-group-select" onClick={()=>onSelect(group.id)}>{group.icon || '📁'} <span>{group.name}</span></button>
          <div className="bookmark-group-actions">
            <button type="button" onClick={()=>onEdit(group)} aria-label={'编辑分组 ' + group.name}>✎</button>
            <button type="button" onClick={()=>onDelete(group)} aria-label={'删除分组 ' + group.name}>×</button>
          </div>
        </div>
        {render(group.id, depth + 1)}
      </React.Fragment>
    ))
  }
  return render(null)
}

export default function Bookmarks(){
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [data, setData] = useState({groups:[], bookmarks:[]})
  const [selectedGroupId, setSelectedGroupId] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookmarkForm, setBookmarkForm] = useState(null)
  const [editingBookmark, setEditingBookmark] = useState(null)
  const [groupForm, setGroupForm] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [importState, setImportState] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh(){
    setLoading(true)
    try{
      const payload = await loadBookmarks()
      setData({groups:payload.groups || [], bookmarks:payload.bookmarks || []})
      setError('')
    }catch(e){ setError(e.message || '书签加载失败') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() }, [])

  const visibleBookmarks = useMemo(()=>{
    const keyword = query.trim().toLocaleLowerCase()
    return (data.bookmarks || []).filter(bookmark=>{
      const matchesGroup = selectedGroupId === 'all' || selectedGroupId === 'ungrouped' ? (selectedGroupId === 'all' || !bookmark.groupId) : bookmark.groupId === selectedGroupId
      const haystack = [bookmark.title, bookmark.url, bookmark.description, ...(bookmark.tags || [])].join(' ').toLocaleLowerCase()
      return matchesGroup && (!keyword || haystack.includes(keyword))
    })
  }, [data.bookmarks, selectedGroupId, query])

  function openBookmarkForm(bookmark=null){
    setEditingBookmark(bookmark)
    setBookmarkForm(bookmark ? {
      title:bookmark.title || '', url:bookmark.url || '', iconUrl:bookmark.iconUrl || '', description:bookmark.description || '',
      groupId:bookmark.groupId || '', tags:(bookmark.tags || []).join(', ')
    } : {...EMPTY_BOOKMARK, groupId:selectedGroupId !== 'all' && selectedGroupId !== 'ungrouped' ? selectedGroupId : ''})
  }

  async function saveBookmark(event){
    event.preventDefault()
    setSaving(true)
    try{
      const payload = {...bookmarkForm, groupId:bookmarkForm.groupId || null, tags:bookmarkForm.tags.split(',').map(tag=>tag.trim()).filter(Boolean)}
      const response = editingBookmark ? await updateBookmark(editingBookmark.id, payload) : await createBookmark(payload)
      setData(response.data)
      setBookmarkForm(null)
      setEditingBookmark(null)
    }catch(e){ setError(e.message || '书签保存失败') }
    finally{ setSaving(false) }
  }

  async function removeBookmark(bookmark){
    if (!window.confirm('确认删除“' + bookmark.title + '”吗？')) return
    try{
      const response = await deleteBookmark(bookmark.id)
      setData(response.data)
    }catch(e){ setError(e.message || '书签删除失败') }
  }

  async function sendToHome(bookmark){
    try{
      const response = await addBookmarkToHome(bookmark.id)
      setError(response.message || '已添加到首页导航')
    }catch(e){ setError(e.message || '添加到首页失败') }
  }

  function openGroupForm(group=null){
    setEditingGroup(group)
    setGroupForm(group ? {name:group.name || '', icon:group.icon || '', parentId:group.parentId || ''} : {...EMPTY_GROUP, parentId:selectedGroupId !== 'all' && selectedGroupId !== 'ungrouped' ? selectedGroupId : ''})
  }

  async function saveGroup(event){
    event.preventDefault()
    setSaving(true)
    try{
      const response = editingGroup ? await updateGroup(editingGroup.id, groupForm) : await createGroup(groupForm)
      setData(response.data)
      setGroupForm(null)
      setEditingGroup(null)
    }catch(e){ setError(e.message || '分组保存失败') }
    finally{ setSaving(false) }
  }

  async function removeGroup(group){
    if (!window.confirm('确认删除分组“' + group.name + '”吗？其中书签会移动到未分类。')) return
    try{
      const response = await deleteGroup(group.id)
      setData(response.data)
      if (selectedGroupId === group.id) setSelectedGroupId('all')
    }catch(e){ setError(e.message || '分组删除失败') }
  }

  async function moveBookmark(bookmark, direction){
    const index = visibleBookmarks.findIndex(item=>item.id === bookmark.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= visibleBookmarks.length) return
    const ids = visibleBookmarks.map(item=>item.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(target, 0, moved)
    try{
      const response = await reorderBookmarks(bookmark.groupId || null, ids)
      setData(response.data)
    }catch(e){ setError(e.message || '书签排序失败') }
  }

  function onImportFile(event){
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ()=>{
      try{
        const entries = parseBookmarkHtml(String(reader.result || ''))
        if (!entries.length) throw new Error('文件中没有找到可导入的网页书签')
        const preview = buildBookmarkImportPreview(entries, data.bookmarks)
        setImportState({entries, preview, selected:new Set((preview.groups || []).map(group=>group.path.join(' / ')))})
      }catch(e){ setError(e.message || '书签文件解析失败') }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function commitImport(){
    if (!importState) return
    setSaving(true)
    try{
      const response = await importBookmarks(importState.entries, [...importState.selected])
      setData(response.data)
      setImportState(null)
      setError('已导入 ' + response.imported + ' 条书签，跳过 ' + response.skipped + ' 条重复链接')
    }catch(e){ setError(e.message || '书签导入失败') }
    finally{ setSaving(false) }
  }

  return (
    <main className="bookmark-page container">
      <header className="bookmark-page-header">
        <div><p className="eyebrow">个人资料库</p><h1>书签</h1><p>把常用链接分组收藏，重要书签可直接添加到首页。</p></div>
        <div className="bookmark-page-header-actions">
          <button className="btn secondary" type="button" onClick={()=>navigate('/')}>返回首页</button>
          <button className="btn secondary" type="button" onClick={()=>fileInputRef.current?.click()}>导入浏览器书签</button>
          <button className="btn" type="button" onClick={()=>openBookmarkForm()}>新增书签</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".html,.htm,text/html" onChange={onImportFile}/>
        </div>
      </header>
      {error && <div className="bookmark-notice" role="status">{error}<button type="button" onClick={()=>setError('')} aria-label="关闭提示">×</button></div>}
      <div className="bookmark-layout">
        <aside className="bookmark-sidebar">
          <div className="bookmark-sidebar-title"><strong>分组</strong><button type="button" onClick={()=>openGroupForm()} aria-label="新建分组">＋</button></div>
          <button type="button" className={'bookmark-group-all ' + (selectedGroupId === 'all' ? 'is-active' : '')} onClick={()=>setSelectedGroupId('all')}>⌂ <span>全部书签</span></button>
          <button type="button" className={'bookmark-group-all ' + (selectedGroupId === 'ungrouped' ? 'is-active' : '')} onClick={()=>setSelectedGroupId('ungrouped')}>○ <span>未分类</span></button>
          <div className="bookmark-group-tree"><GroupTree groups={data.groups} selectedGroupId={selectedGroupId} onSelect={setSelectedGroupId} onEdit={openGroupForm} onDelete={removeGroup}/></div>
        </aside>
        <section className="bookmark-content">
          <div className="bookmark-toolbar"><label className="bookmark-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索标题、网址、描述或标签"/></label><span>{visibleBookmarks.length} 条书签</span></div>
          {loading ? <p className="bookmark-empty">正在加载书签…</p> : visibleBookmarks.length ? <div className="bookmark-grid">{visibleBookmarks.map((bookmark,index)=>(
            <article className="bookmark-card" key={bookmark.id}>
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="bookmark-card-link"><BookmarkIcon bookmark={bookmark}/><div><strong>{bookmark.title}</strong><span>{bookmark.url}</span>{bookmark.description && <p>{bookmark.description}</p>}{bookmark.tags?.length > 0 && <div className="bookmark-tags">{bookmark.tags.map(tag=><em key={tag}>{tag}</em>)}</div>}</div></a>
              <div className="bookmark-card-actions"><button type="button" onClick={()=>openBookmarkForm(bookmark)}>编辑</button><button type="button" onClick={()=>sendToHome(bookmark)}>到首页</button><button type="button" onClick={()=>moveBookmark(bookmark,-1)} disabled={index===0} aria-label="上移">↑</button><button type="button" onClick={()=>moveBookmark(bookmark,1)} disabled={index===visibleBookmarks.length-1} aria-label="下移">↓</button><button className="danger" type="button" onClick={()=>removeBookmark(bookmark)}>删除</button></div>
            </article>
          ))}</div> : <div className="bookmark-empty"><strong>这里还没有书签</strong><span>新增书签，或从 Chrome、Edge、Firefox 导出的 HTML 文件导入。</span><button className="btn" type="button" onClick={()=>openBookmarkForm()}>新增第一条书签</button></div>}
        </section>
      </div>
      {bookmarkForm && <Modal title={editingBookmark ? '编辑书签' : '新增书签'} onClose={()=>{ if (!saving) setBookmarkForm(null) }}><form className="modal-form" onSubmit={saveBookmark}><label>标题<input value={bookmarkForm.title} onChange={event=>setBookmarkForm({...bookmarkForm,title:event.target.value})} required maxLength="160"/></label><label>链接<input type="url" value={bookmarkForm.url} onChange={event=>setBookmarkForm({...bookmarkForm,url:event.target.value})} required placeholder="https://example.com"/></label><label>分组<select value={bookmarkForm.groupId} onChange={event=>setBookmarkForm({...bookmarkForm,groupId:event.target.value})}><option value="">未分类</option>{data.groups.map(group=><option key={group.id} value={group.id}>{group.icon || '📁'} {group.name}</option>)}</select></label><label>图标地址（可选）<input value={bookmarkForm.iconUrl} onChange={event=>setBookmarkForm({...bookmarkForm,iconUrl:event.target.value})} placeholder="留空则自动获取网站图标"/></label><label>描述（可选）<textarea value={bookmarkForm.description} onChange={event=>setBookmarkForm({...bookmarkForm,description:event.target.value})} maxLength="600"/></label><label>标签（用逗号分隔）<input value={bookmarkForm.tags} onChange={event=>setBookmarkForm({...bookmarkForm,tags:event.target.value})} placeholder="开发, 工具"/></label><div className="modal-actions"><button className="btn secondary" type="button" onClick={()=>setBookmarkForm(null)} disabled={saving}>取消</button><button className="btn" disabled={saving}>{saving ? '保存中…' : '保存书签'}</button></div></form></Modal>}
      {groupForm && <Modal title={editingGroup ? '编辑分组' : '新建分组'} onClose={()=>{ if (!saving) setGroupForm(null) }}><form className="modal-form" onSubmit={saveGroup}><label>分组名称<input value={groupForm.name} onChange={event=>setGroupForm({...groupForm,name:event.target.value})} required maxLength="80"/></label><label>图标（可选）<input value={groupForm.icon} onChange={event=>setGroupForm({...groupForm,icon:event.target.value})} placeholder="例如：📁" maxLength="12"/></label><label>上级分组<select value={groupForm.parentId} onChange={event=>setGroupForm({...groupForm,parentId:event.target.value})}><option value="">顶级分组</option>{data.groups.filter(group=>group.id !== editingGroup?.id).map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="modal-actions"><button className="btn secondary" type="button" onClick={()=>setGroupForm(null)} disabled={saving}>取消</button><button className="btn" disabled={saving}>{saving ? '保存中…' : '保存分组'}</button></div></form></Modal>}
      {importState && <Modal title="导入浏览器书签" onClose={()=>{ if (!saving) setImportState(null) }} wide><p className="modal-description">共发现 {importState.preview.totalBookmarks} 条书签、{importState.preview.groups.length} 个分组，其中 {importState.preview.duplicates} 条链接已存在。默认跳过重复链接。</p><div className="import-group-list">{importState.preview.groups.map(group=>{ const key=group.path.join(' / '); return <label key={key || 'ungrouped'}><input type="checkbox" checked={importState.selected.has(key)} onChange={event=>{ const next=new Set(importState.selected); event.target.checked?next.add(key):next.delete(key); setImportState({...importState,selected:next}) }}/><span>{key || '未分类'} <em>{group.bookmarkCount} 条</em></span></label> })}</div><div className="modal-actions"><button className="btn secondary" type="button" onClick={()=>setImportState(null)} disabled={saving}>取消</button><button className="btn" type="button" disabled={saving || !importState.selected.size} onClick={commitImport}>{saving ? '导入中…' : '导入所选书签'}</button></div></Modal>}
    </main>
  )
}
