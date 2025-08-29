'use client'

import { useEffect, useState } from 'react'
import styles from './matrix-rain.module.css'

export function MatrixRainBackground() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const columns = Array.from({ length: 30 }, (_, i) => i)
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()_+-=[]{}|;:,.<>?'

  return (
    <div className={styles.matrixContainer}>
      {columns.map((col) => (
        <div 
          key={col} 
          className={styles.column}
          style={{
            '--column-index': col,
            '--random-delay': `${Math.random() * 10}s`,
            '--random-duration': `${15 + Math.random() * 10}s`
          } as React.CSSProperties}
        >
          <div className={styles.stream}>
            {Array.from({ length: 40 }, (_, i) => (
              <span 
                key={i} 
                className={styles.character}
                style={{
                  '--char-index': i,
                  '--brightness': 1 - (i * 0.025)
                } as React.CSSProperties}
              >
                {characters[Math.floor(Math.random() * characters.length)]}
              </span>
            ))}
          </div>
          <div className={styles.stream}>
            {Array.from({ length: 40 }, (_, i) => (
              <span 
                key={i} 
                className={styles.character}
                style={{
                  '--char-index': i,
                  '--brightness': 1 - (i * 0.025)
                } as React.CSSProperties}
              >
                {characters[Math.floor(Math.random() * characters.length)]}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}