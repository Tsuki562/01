import React, { useEffect, useRef } from 'react';
import { useMicrophone } from '../hooks/useMicrophone';

interface ParticleFieldProps {
  activeMood: string;
  isPlaying: boolean;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({ activeMood, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isRecording, audioData } = useMicrophone();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置canvas尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // 粒子配置 - 调整为更温暖的色调和更柔和的效果
    const getMoodParticleConfig = () => {
      switch (activeMood) {
        case 'happy':
          return { 
            count: 40, // 减少粒子数量，避免视觉杂乱
            sizeRange: [3, 6], // 稍微增大粒子
            speedRange: [0.08, 0.4], // 稍微减慢速度
            color: '#93c5fd',
            alphaRange: [0.2, 0.5], // 降低透明度，更柔和
            gradient: true, // 使用渐变效果
            gradientColors: ['#bfdbfe', '#93c5fd', '#3b82f6'] // 温暖的蓝色渐变
          };
        case 'sad':
          return { 
            count: 35, 
            sizeRange: [4, 8], 
            speedRange: [0.04, 0.25], 
            color: '#a5b4fc',
            alphaRange: [0.15, 0.4],
            gradient: true,
            gradientColors: ['#ddd6fe', '#a5b4fc', '#818cf8']
          };
        case 'calm':
          return { 
            count: 30, 
            sizeRange: [3, 7, 7], 
            speedRange: [0.02, 0.15], 
            color: '#5eead4',
            alphaRange: [0.2, 0.5],
            gradient: true,
            gradientColors: ['#a7f3d0', '#5eead4', '#14b8a6']
          };
        case 'excited':
          return { 
            count: 50, 
            sizeRange: [2, 5], 
            speedRange: [0.15, 0.6], 
            color: '#f9a8d4',
            alphaRange: [0.3, 0.6],
            gradient: true,
            gradientColors: ['#fce7f3', '#f9a8d4', '#ec4899']
          };
        default:
          return { 
            count: 40, 
            sizeRange: [3, 6], 
            speedRange: [0.08, 0.4], 
            color: '#93c5fd',
            alphaRange: [0.2, 0.5],
            gradient: true,
            gradientColors: ['#bfdbfe', '#93c5fd', '#3b82f6']
          };
      }
    };
    
    // 创建粒子
    const createParticles = (count: number, config: any) => {
      return Array.from({ length: count }).map(() => {
        const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size,
          speed: config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]),
          alpha: config.alphaRange[0] + Math.random() * (config.alphaRange[1] - config.alphaRange[0]),
          direction: {
            x: -1 + Math.random() * 2,
            y: -1 + Math.random() * 2
          }
        };
      });
    };
    
    // 添加鼠标移动时的波纹效果
    const ripples: any[] = [];
    
    const handleMouseMove = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.random() * 100 + 50,
        speed: Math.random() * 2 + 1,
        opacity: 0.5
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    let particleConfig = getMoodParticleConfig();
    let particles = createParticles(particleConfig.count, particleConfig);
    
    // 动画循环
    let animationFrame: number;
    
    const animate = () => {
      // 确保canvas仍然有效
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 当情绪改变时，更新粒子配置
      const currentConfig = getMoodParticleConfig();
      if (currentConfig !== particleConfig) {
        particleConfig = currentConfig;
        particles = createParticles(particleConfig.count, particleConfig);
      }
      
      // 绘制和更新粒子
      particles.forEach(particle => {
        ctx.globalAlpha = particle.alpha;
        
        // 确保audioData有效，防止未定义错误
        const safeVolume = isRecording && audioData && typeof audioData.volume === 'number' 
          ? audioData.volume 
          : 0.2; // 默认中等音量
        
        // 使用音量来控制波动
        let size = particle.size;
        if (isPlaying || isRecording) {
          size = particle.size * (1 + safeVolume * 0.6 * Math.sin(Date.now() * 0.004 + particle.x * 0.01));
        }
        
        if (particleConfig.gradient && Array.isArray(particleConfig.gradientColors)) {
          try {
            // 创建径向渐变
            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, size
            );
            
            particleConfig.gradientColors.forEach((color: string, index: number) => {
              gradient.addColorStop(index / (particleConfig.gradientColors.length - 1), color);
            });
            
            ctx.fillStyle = gradient;
          } catch (error) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = particleConfig.color;
          }
        } else {
          ctx.fillStyle = particleConfig.color;
        }
        
        // 添加柔和的阴影效果
        ctx.shadowColor = particleConfig.color;
        ctx.shadowBlur = 5;
        
        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // 重置阴影
        ctx.shadowBlur = 0;
        
        // 更新位置
        particle.x += particle.direction.x * particle.speed;
        particle.y += particle.direction.y * particle.speed;
        
        // 边界检查
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.direction.x *= -1;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.direction.y *= -1;
        }
      });
      
      // 绘制波纹
      ripples.forEach((ripple, index) => {
        ctx.strokeStyle = `rgba(59, 130, 246, ${ripple.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 更新波纹
        ripple.radius += ripple.speed;
        ripple.opacity -= 0.01;
        
        // 移除消失的波纹
        if (ripple.opacity <= 0 || ripple.radius >= ripple.maxRadius) {
          ripples.splice(index, 1);
        }
      });
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    // 启动动画
    animate();
    
    // 清理函数
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeMood, isPlaying, isRecording, audioData]);
  
  return (
    <canvas
      id="backgroundCanvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};