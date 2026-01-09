import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ColorfulShapeProps {
  mood: string;
  isPlaying: boolean;
}

import { useMicrophone } from '../hooks/useMicrophone';

export const ColorfulShape: React.FC<ColorfulShapeProps> = ({ mood, isPlaying }) => {
  const controls = useAnimation();
  const { isRecording, audioData } = useMicrophone();
  
  // 根据情绪获取形状和动画配置，调整为更温暖的色调
  const getMoodShapeConfig = () => {
    // 结合录音状态和音频数据调整动画参数
    const currentIsPlaying = isPlaying || isRecording;
    let animationSpeed = 3;
    let animationAmplitude = 1.1;
    
    // 确保audioData和volume有效，提供默认值防止undefined问题
    const safeVolume = isRecording && audioData && typeof audioData.volume === 'number' 
      ? audioData.volume 
      : 0.2; // 默认中等音量
    
    // 根据音量调整动画速度和幅度
    if (currentIsPlaying) {
      animationSpeed = 2 + safeVolume * 3; // 音量越高，动画越快
      animationAmplitude = 1 + safeVolume * 0.8; // 音量越高，动画幅度越大
    }
    
    switch (mood) {
      case 'happy':
        return {
          shape: 'circle',
          colors: ['#93c5fd', '#60a5fa', '#3b82f6'],
          scale: 1.2,
          rotate: 0,
          animation: {
            scale: currentIsPlaying ? [1, animationAmplitude, 1] : 1,
            rotate: currentIsPlaying ? [0, 5, -5, 0] : 0,
            transition: {
              duration: currentIsPlaying ? animationSpeed : 1,
              repeat: currentIsPlaying ? Infinity : 0,
              repeatType: 'reverse'
            }
          }
        };
      case 'sad':
        return {
          shape: 'rectangle',
          colors: ['#a5b4fc', '#818cf8', '#6366f1'],
          scale: 0.9,
          rotate: -5,
          animation: {
            scale: currentIsPlaying ? [0.9, 0.85 + safeVolume * 0.1, 0.9] : 0.9,
            rotate: currentIsPlaying ? [-5, -7, -5] : -5,
            transition: {
              duration: currentIsPlaying ? animationSpeed + 1 : 1,
              repeat: currentIsPlaying ? Infinity : 0,
              repeatType: 'reverse'
            }
          }
        };
      case 'calm':
        return {
          shape: 'polygon',
          colors: ['#5eead4', '#2dd4bf', '#14b8a6'],
          scale: 1,
          rotate: 0,
          animation: {
            scale: currentIsPlaying ? [1, 1.05 + safeVolume * 0.05, 1] : 1,
            rotate: currentIsPlaying ? [0, 3, -3, 0] : 0,
            transition: {
              duration: currentIsPlaying ? animationSpeed + 2 : 1,
              repeat: currentIsPlaying ? Infinity : 0,
              repeatType: 'reverse'
            }
          }
        };
      case 'excited':
        return {
          shape: 'star',
          colors: ['#f9a8d4', '#f472b6', '#ec4899'],
          scale: 1.1,
          rotate: 0,
          animation: {
            scale: currentIsPlaying ? [1.1, animationAmplitude + 0.2, 1.1] : 1.1,
            rotate: currentIsPlaying ? [0, 10, -10, 0] : 0,
            transition: {
              duration: currentIsPlaying ? Math.max(1, animationSpeed - 1) : 1,
              repeat: currentIsPlaying ? Infinity : 0,
              repeatType: 'reverse'
            }
          }
        };
      default:
        return {
          shape: 'circle',
          colors: ['#93c5fd', '#60a5fa', '#3b82f6'],
          scale: 1,
          rotate: 0,
          animation: {
            scale: currentIsPlaying ? [1, animationAmplitude, 1] : 1,
            rotate: currentIsPlaying ? [0, 5, -5, 0] : 0,
            transition: {
              duration: currentIsPlaying ? animationSpeed : 1,
              repeat: currentIsPlaying ? Infinity : 0,
              repeatType: 'reverse'
            }
          }
        };
    }
  };
  
  const config = getMoodShapeConfig();
  
  // 确保动画更新
  useEffect(() => {
    controls.start(config.animation);
  }, [controls, config.animation]);
  
  // 鼠标悬停时的效果
  useEffect(() => {
    const handleMouseEnter = () => {
      // 鼠标悬停时轻微震动效果
      controls.start({
        scale: [1, 1.02, 0.98, 1.01, 0.99, 1],
        transition: { duration: 0.5 }
      });
    };
    
    // 使用ref而不是getElementById，更可靠
    const shapeElement = document.getElementById('shapeContainer');
    if (shapeElement) {
      shapeElement.addEventListener('mouseenter', handleMouseEnter);
      
      return () => {
        shapeElement.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
  }, [controls]);
  
  // 渲染不同的形状
  const renderShape = () => {
    const safeVolume = isRecording && audioData && typeof audioData.volume === 'number' 
      ? audioData.volume 
      : 0.2; // 默认中等音量
    
    switch (config.shape) {
      case 'circle':
        return (
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80"
            animate={controls}
            style={{ scale: config.scale, rotate: config.rotate }}
          >
            {config.colors.map((color, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 rounded-full"
                style={{ 
                  backgroundColor: color, 
                  opacity: 0.5 / (index + 1),
                  filter: 'blur(3px)',
                  scale: 1 - index * 0.2
                }}
                animate={{ 
                  scale: (isPlaying || isRecording) 
                    ? [1 - index * 0.2, (1.1 - index * 0.2) + (safeVolume * 0.2), 1 - index * 0.2] 
                    : 1 - index * 0.2
                }}
                transition={{ 
                  duration: 2 + index, 
                  repeat: (isPlaying || isRecording) ? Infinity : 0,
                  repeatType: 'reverse'
                }}
              />
            ))}
          </motion.div>
        );
      
      case 'rectangle':
        return (
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80"
            animate={controls}
            style={{ scale: config.scale, rotate: config.rotate }}
          >
            {config.colors.map((color, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 rounded-2xl" // 更圆润的边角
                style={{ 
                  backgroundColor: color, 
                  opacity: 0.5 / (index + 1),
                  filter: 'blur(3px)',
                  scale: 1 - index * 0.2
                }}
                animate={{ 
                  scale: isPlaying ? [1 - index * 0.2, 1.05 - index * 0.2, 1 - index * 0.2] : 1 - index * 0.2
                }}
                transition={{ 
                  duration: 2.5 + index, 
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: 'reverse'
                }}
              />
            ))}
          </motion.div>
        );
      
      case 'polygon':
        return (
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80"
            animate={controls}
            style={{ scale: config.scale, rotate: config.rotate }}
          >
            {config.colors.map((color, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 rotate-45 rounded-2xl" // 更圆润的边角
                style={{ 
                  backgroundColor: color, 
                  opacity: 0.5 / (index + 1),
                  filter: 'blur(3px)',
                  scale: 1 - index * 0.2
                }}
                animate={{ 
                  scale: isPlaying ? [1 - index * 0.2, 1.1 - index * 0.2, 1 - index * 0.2] : 1 - index * 0.2
                }}
                transition={{ 
                  duration: 3 + index, 
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: 'reverse'
                }}
              />
            ))}
          </motion.div>
        );
      
      case 'star':
        return (
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center"
            animate={controls}
            style={{ scale: config.scale, rotate: config.rotate }}
          >
            {config.colors.map((color, index) => (
              <motion.div
                key={index}
                className="absolute"
                style={{ 
                  width: '80%', 
                  height: '80%',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  backgroundColor: color, 
                  opacity: 0.5 / (index + 1),
                  filter: 'blur(3px)',
                  scale: 1 - index * 0.2
                }}
                animate={{ 
                  scale: isPlaying ? [1 - index * 0.2, 1.15 - index * 0.2, 1 - index * 0.2] : 1 - index * 0.2
                }}
                transition={{ 
                  duration: 1.5 + index, 
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: 'reverse'
                }}
              />
            ))}
          </motion.div>
        );
      
      default:
        return (
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80"
            animate={controls}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-volume-up text-5xl mb-4 text-blue-400"></i>
                <p className="text-blue-400">准备就绪</p>
              </div>
            </div>
          </motion.div>
        );
    }
  };
  
  return (
    <div className="relative">
      {renderShape()}
      
      {/* 添加中心点光晕 - 更柔和 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ 
          opacity: isPlaying ? [0.7, 1, 0.7] : 0.7
        }}
        transition={{ 
          duration: isPlaying ? 2 : 1, 
          repeat: isPlaying ? Infinity : 0,
          repeatType: 'reverse'
        }}
      >
        <div className="w-12 h-12 bg-white rounded-full filter blur-md opacity-80 shadow-lg"></div>
      </motion.div>
      
      {/* 添加波纹效果 - 更柔和 */}
      {isPlaying && (
        <>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-white/40"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5 + i * 0.5, opacity: 0 }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};