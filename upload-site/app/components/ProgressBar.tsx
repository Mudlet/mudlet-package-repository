'use client'

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  goal: number;
  percentage: number;
}

export function ProgressBar({ current, goal, percentage }: ProgressBarProps) {
    const getMessage = () => {
      if (percentage >= 100) return "🎉 Goal achieved! Thank you everyone!";
      if (percentage >= 75)
        return "🚀 Almost there! Keep those packages coming!";
      if (percentage >= 50)
        return "⭐ Halfway there! The community is amazing!";
      if (percentage >= 25) return "💫 Great progress! Let's keep going!";
      return "🎯 Help us reach our goal of 100 packages!";
    };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between mb-2">
        <span className="text-lg font-bold">Community packages uploaded</span>
        <span className="text-lg font-bold">{current} / {goal}</span>
      </div>
      
      <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <p className="mt-3 text-center text-lg font-medium text-gray-700">
        {getMessage()}
      </p>
    </div>
  );
}
