import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

function isExternalHttpLink(link){
  if (!link || link.startsWith('#')) return false
  try{
    const url = new URL(link, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:'
  }catch(e){
    return false
  }
}

function getFetchedIconUrl(link){
  return '/api/favicon?url=' + encodeURIComponent(link)
}

function FallbackIcon({title}){
  const initial = (title || '?').trim().charAt(0).toUpperCase() || '?'
  return <span className="card-icon-fallback" aria-hidden="true">{initial}</span>
}

function CardIcon({item}){
  const external = isExternalHttpLink(item.link)
  const fetchedIcon = external ? getFetchedIconUrl(item.link) : ''
  const getInitialSource = ()=>{
    if (item.iconUrl) return {type:'configured', src:item.iconUrl}
    if (item.iconSvg) return {type:'svg'}
    if (item.icon) return {type:'text'}
    if (fetchedIcon) return {type:'fetched', src:fetchedIcon}
    return {type:'fallback'}
  }
  const [source, setSource] = useState(getInitialSource)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(()=>{
    setSource(getInitialSource())
    setImageLoaded(false)
  }, [item.iconUrl, item.iconSvg, item.icon, item.link])

  function handleImageLoad(){
    setImageLoaded(true)
  }

  function handleImageError(){
    setImageLoaded(false)
    if (source.type === 'configured' && fetchedIcon){
      setSource({type:'fetched', src:fetchedIcon})
    }else{
      setSource({type:'fallback'})
    }
  }

  if (source.type === 'configured' || source.type === 'fetched'){
    return (
      <span className={'card-icon-image-shell ' + (imageLoaded ? 'is-loaded' : '')}>
        {!imageLoaded && <FallbackIcon title={item.title}/>}
        <img
          className={'card-icon-image ' + (source.type === 'fetched' ? 'card-icon-image--fetched' : 'card-icon-image--configured')}
          src={source.src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </span>
    )
  }
  if (source.type === 'svg') return <span dangerouslySetInnerHTML={{__html:item.iconSvg}} />
  if (source.type === 'text') return <span className="card-icon-text" aria-hidden="true">{item.icon}</span>
  return <FallbackIcon title={item.title} />
}

function CardContent({item}){
  return (
    <>
      <div className="card-icon"><CardIcon item={item}/></div>
      <div className="card-body"><strong>{item.title}</strong></div>
    </>
  )
}

export default function NavCard({item}){
  const link = item.link || '#'
  if (/^#/.test(link)){
    const name = link.replace(/^#/,'')
    const to = '/page/' + encodeURIComponent(name)
    return (
      <motion.div className="card glow" whileHover={{ y: -6, scale: 1.02 }} transition={{type:'spring',stiffness:300}}>
        <Link to={to} style={{display:'flex',alignItems:'center',gap:12,textDecoration:'none',color:'inherit',width:'100%'}}>
          <CardContent item={item}/>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.a className="card glow" href={link} target="_blank" rel="noopener noreferrer" whileHover={{ y: -6, scale: 1.02 }} transition={{type:'spring',stiffness:300}}>
      <CardContent item={item}/>
    </motion.a>
  )
}
