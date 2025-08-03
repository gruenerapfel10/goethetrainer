'use client'

import { usePageTransition } from '@/context/page-transition-context'
import { motion, AnimatePresence } from 'framer-motion'

export function PageTransitionOverlay() {
  const { isTransitioning, transitionData } = usePageTransition()

  return (
    <AnimatePresence>
      {isTransitioning && transitionData?.position && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background overlay */}
          <motion.div
            className="absolute inset-0 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Expanding card animation */}
          <motion.div
            className="absolute bg-white rounded-lg shadow-2xl"
            initial={{
              top: transitionData.position.top,
              left: transitionData.position.left,
              width: transitionData.position.width,
              height: transitionData.position.height,
            }}
            animate={{
              top: '50%',
              left: '50%',
              width: '90vw',
              height: '80vh',
              x: '-45%',
              y: '-40%',
            }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}