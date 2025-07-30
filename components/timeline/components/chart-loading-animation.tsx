"use client"

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart } from "lucide-react";
import React from "react";

/**
 * Beautiful chart loading animation component
 * Displays an animated loading state for chart generation
 */
export const ChartLoadingAnimation: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated chart icons */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute"
          >
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute -top-2 -right-2"
          >
            <TrendingUp className="w-4 h-4 text-green-500" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute -bottom-2 -left-2"
          >
            <PieChart className="w-4 h-4 text-purple-500" />
          </motion.div>
        </div>
        
        {/* Pulsing dots */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 1.5,
                delay: i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Processing text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center"
        >
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Creating Chart
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Analyzing data and generating visualization...
          </div>
        </motion.div>
        
        {/* Animated progress bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          style={{ width: "120px", maxWidth: "120px" }}
        />
      </div>
    </div>
  );
};

/**
 * Chart completion animation component
 * Displays an animated completion state for chart generation
 */
export const ChartCompletionAnimation: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-4 p-4 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800"
    >
      <div className="flex items-center space-x-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex-shrink-0"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex-1"
        >
          <div className="text-sm font-medium text-green-700 dark:text-green-300">
            Chart Ready!
          </div>
          <div className="text-xs text-muted-foreground">
            Your visualization has been generated and is ready to view.
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};