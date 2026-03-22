import React from 'react'
import { motion } from 'framer-motion'

export default function NavCard({item}){
  return (
    <motion.a className="card glow" href={item.link || '#'} whileHover={{ y: -6, scale: 1.02 }} transition={{type:'spring',stiffness:300}}>
      <div className="card-icon">
        {item.iconUrl ? <img src={item.iconUrl} alt=""/> : (item.iconSvg ? <span dangerouslySetInnerHTML={{__html:item.iconSvg}}/> : item.icon)}
      </div>
      <div className="card-body"><strong>{item.title}</strong></div>
    </motion.a>
  )
}
