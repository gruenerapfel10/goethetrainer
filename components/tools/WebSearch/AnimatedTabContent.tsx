'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  value: string;
  selected: string;
}

export function AnimatedTabContent({ 
  children, 
  value, 
  selected 
}: AnimatedTabContentProps) {
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 1, x: 10 }}
      animate={{
        opacity: value === selected ? 1 : 0,
        x: value === selected ? 0 : 10,
        pointerEvents: value === selected ? 'auto' : 'none',
      }}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
      }}
      className={cn(
        'absolute top-0 left-0 right-0',
        value === selected ? 'relative' : 'hidden'
      )}
    >
      {children}
    </motion.div>
  );
}