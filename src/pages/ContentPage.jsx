import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function ContentPage(){
  const { name } = useParams()
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setErr(null)
      const api = `/api/pages/${encodeURIComponent(name)}`
      console.debug('ContentPage: loading', name, 'api', api)
      try{
        const res = await fetch(api)
        console.debug('ContentPage: fetched', api, res && res.status)
        if (res && res.ok){ const text = await res.text(); if (mounted) setHtml(text || '<p>(页面为空)</p>'); setLoading(false); return }
        throw new Error('not found')
      }catch(e){ console.warn('ContentPage load error', e); if (mounted){ setErr('页面未找到或读取失败'); setLoading(false) } }
    }
    load()
    return ()=>{ mounted = false }
  },[name])

  if (loading) return <div className="container"><p>加载中…</p></div>
  if (err) return <div className="container"><p>{err}</p></div>
  if (!html) return <div className="container"><p>页面没有内容。</p></div>

  return (
    <main className="container">
      <article className="content-page" dangerouslySetInnerHTML={{__html: html}} />
    </main>
  )
}
