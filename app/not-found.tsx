'use client'

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="flex h-[100vh] items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blur-circle animate-pulse-slow"></div>
        <div className="absolute top-60 -left-20 w-80 h-80 bg-blur-circle-light animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 right-40 w-72 h-72 bg-blur-circle-light animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Goethe Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 mua-pattern opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.div 
            className="text-[40vw] font-bold text-white/[0.02] select-none leading-none"
            animate={{
              x: mousePosition.x,
              y: mousePosition.y,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            Goethe
          </motion.div>
        </div>
      </div>

      <div className="container flex max-w-md flex-col items-center justify-center space-y-6 px-4 py-8 text-center relative z-10">
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated 404 */}
          <motion.div className="relative">
            <motion.h1 
              className="text-[120px] sm:text-[160px] font-bold leading-none"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.1 
              }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">404</span>
            </motion.h1>
            <motion.div
              className="absolute inset-0 text-[120px] sm:text-[160px] font-bold leading-none text-blue-500 blur-2xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.1 
              }}
            >
              404
            </motion.div>
          </motion.div>

          <motion.h2 
            className="text-2xl sm:text-3xl font-semibold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Lost in the Academic Universe
          </motion.h2>
          
          <motion.p 
            className="text-zinc-400 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {t('notFound.description', { default: "It seems you've wandered into uncharted territory. Let's navigate you back to familiar grounds." })}
          </motion.p>
        </motion.div>

        <motion.div 
          className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/" className="flex-1">
            <Button 
              variant="default" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/universities" className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-white/20 hover:bg-white/10 hover:border-white/30"
            >
              <Compass className="mr-2 h-4 w-4" />
              Universities
            </Button>
          </Link>
        </motion.div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/">
            <button className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm flex items-center gap-2">
              <ArrowLeft className="h-3 w-3" />
              Go back
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}