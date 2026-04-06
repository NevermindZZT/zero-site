import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function NavCard({item}){
  const link = item.link || '#'
  if (/^#/.test(link)){
    const name = link.replace(/^#/,'')
    const to = `/page/${encodeURIComponent(name)}`
    return (
      <motion.div className="card glow" whileHover={{ y: -6, scale: 1.02 }} transition={{type:'spring',stiffness:300}}>
        <Link to={to} style={{display:'flex',alignItems:'center',gap:12,textDecoration:'none',color:'inherit',width:'100%'}}>
          <div className="card-icon">{item.iconUrl ? <img src={item.iconUrl} alt=""/> : (item.iconSvg ? <span dangerouslySetInnerHTML={{__html:item.iconSvg}}/> : item.icon)}</div>
          <div className="card-body"><strong>{item.title}</strong></div>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.a className="card glow" href={link} target="_blank" rel="noopener noreferrer" whileHover={{ y: -6, scale: 1.02 }} transition={{type:'spring',stiffness:300}}>
      <div className="card-icon">
        {item.iconUrl ? <img src={item.iconUrl} alt=""/> : (item.iconSvg ? <span dangerouslySetInnerHTML={{__html:item.iconSvg}}/> : item.icon)}
      </div>
      <div className="card-body"><strong>{item.title}</strong></div>
    </motion.a>
  )
}
