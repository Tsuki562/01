import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

interface SoundWaveVisualizationProps {
  activeMood: string;
  isPlaying: boolean;
}

import { useMicrophone } from '../hooks/useMicrophone';

export const SoundWaveVisualization: React.FC<SoundWaveVisualizationProps> = ({ 
  activeMood, 
  isPlaying 
}) => {
  const { isRecording, audioData } = useMicrophone();
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  
  // 根据情绪获取不同的配置，调整为更温暖的色调
  const getMoodConfig = () => {
    switch (activeMood) {
      case 'happy':
        return { 
          colors: ['#93c5fd', '#60a5fa', '#3b82f6'], 
          amplitude: 20,
          frequency: 0.05,
          opacity: 0.8 // 增加不透明度
        };
      case 'sad':
        return { 
          colors: ['#a5b4fc', '#818cf8', '#6366f1'], 
          amplitude: 15,
          frequency: 0.03,
          opacity: 0.8
        };
      case 'calm':
        return { 
          colors: ['#5eead4', '#2dd4bf', '#14b8a6'], 
          amplitude: 12,
          frequency: 0.02,
          opacity: 0.8
        };
      case 'excited':
        return { 
          colors: ['#f9a8d4', '#f472b6', '#ec4899'], 
          amplitude: 25,
          frequency: 0.07,
          opacity: 0.8
        };
      default:
        return { 
          colors: ['#93c5fd', '#60a5fa', '#3b82f6'], 
          amplitude: 20,
          frequency: 0.05,
          opacity: 0.8
        };
    }
  };
  
  const moodConfig = getMoodConfig();
  
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [controls, isInView]);
  
  // 创建100个波形条
  const bars = Array.from({ length: 100 }, (_, i) => i);
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }}
      className="h-20 w-full flex items-end justify-center space-x-0.5"
    >
      {bars.map((i) => (
        <motion.div
          key={i}
          className="sound-bar w-1 rounded-t-full" // 更圆润的顶部
          style={{
            backgroundColor: moodConfig.colors[i % moodConfig.colors.length],
            opacity: moodConfig.opacity,
            boxShadow: `0 0 8px ${moodConfig.colors[i % moodConfig.colors.length]}88` // 添加柔和阴影
          }}
          animate={{
            height: (isPlaying || isRecording) 
              ? isRecording && audioData 
                ? `${5 + Math.sin(i * moodConfig.frequency + Date.now() * 0.001) * moodConfig.amplitude * (1 + audioData.volume)}px` 
                : `${5 + Math.sin(i * moodConfig.frequency + Date.now() * 0.001) * moodConfig.amplitude}px`
              : `${10 + Math.sin(i * 0.05) * 5}px`
          }}
          transition={{
            duration: isPlaying ? 0.15 : 1, // 稍微延长动画时间，更平滑
            repeat: Infinity,
            repeatType: 'reverse',
            ease: "easeInOut" // 更平滑的缓动
          }}
        />
      ))}
    </motion.div>
  );
};