import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundWaveVisualization } from '../components/SoundWaveVisualization';
import { ParticleField } from '../components/ParticleField';
import { ColorfulShape } from '../components/ColorfulShape';
import { useMicrophone } from '../hooks/useMicrophone';
import { toast } from 'sonner';

export default function Home() {
  const [activeMood, setActiveMood] = useState<string>('happy');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 使用麦克风hook
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    audioData, 
    error, 
    hasPermission 
  } = useMicrophone();

  // 模拟声音可视化效果
  const playVisualSound = () => {
    setIsPlaying(true);
    setTimeout(() => {
      setIsPlaying(false);
    }, 5000);
  };

  // 随机选择一个情绪
  const randomMood = () => {
    const moods = ['happy', 'sad', 'calm', 'excited'];
    const randomIndex = Math.floor(Math.random() * moods.length);
    setActiveMood(moods[randomIndex]);
    playVisualSound();
  };
  
   // 处理麦克风权限错误和其他错误
  useEffect(() => {
    if (error) {
      // 确保在用户界面上显示错误信息
      toast.error(error);
      // 重置录音状态，避免UI状态不一致
      stopRecording();
    }
  }, [error, stopRecording]);
  
  // 根据真实音频数据更新视觉效果
  useEffect(() => {
    if (isRecording && audioData) {
      // 确保有有效的音量数据
      const volume = audioData.volume || 0;
      const pitch = audioData.pitch || 'mid';
      
      // 根据音量和音调更新情绪
      if (volume > 0.6) {
        // 高音量
        if (pitch === 'high') {
          setActiveMood('excited');
        } else {
          setActiveMood('happy');
        }
      } else if (volume < 0.3) {
        // 低音量
        if (pitch === 'low') {
          setActiveMood('calm');
        } else {
          setActiveMood('sad');
        }
      }
      
      // 设置为正在播放状态，触发视觉效果
      setIsPlaying(true);
    } else if (!isRecording && !isAudioPlaying) {
      // 当停止录音和音频播放时，保持背景动画
      setIsPlaying(false);
    }
  }, [audioData, isRecording, isAudioPlaying]);

  // 背景动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      // 轻微的背景动画效果，即使没有用户交互也保持活力
      if (!isPlaying && !isRecording && !isAudioPlaying) {
        const moods = ['happy', 'sad', 'calm', 'excited'];
        const randomIndex = Math.floor(Math.random() * moods.length);
        setActiveMood(moods[randomIndex]);
      }
    }, 15000); // 每15秒变化一次

    return () => clearInterval(interval);
  }, [isPlaying, isRecording, isAudioPlaying]);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
      if (!validTypes.includes(file.type)) {
        toast.error('请上传有效的音频文件 (MP3, WAV, OGG)');
        return;
      }
      
      // 验证文件大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        toast.error('文件大小不能超过10MB');
        return;
      }
      
      setAudioFile(file);
      setShowAudioPlayer(true);
      
      // 保存到本地存储
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const audioDataUrl = e.target?.result as string;
        try {
          localStorage.setItem('lastUploadedAudio', audioDataUrl);
          localStorage.setItem('lastUploadedAudioName', file.name);
        } catch (error) {
          console.error('无法保存音频到本地存储:', error);
          toast.warning('无法保存音频到本地存储');
        }
        
        // 创建音频元素
        if (audioElementRef.current) {
          audioElementRef.current.src = audioDataUrl;
          
          // 设置音频事件监听
          audioElementRef.current.onplay = () => {
            setIsAudioPlaying(true);
          };
          
          audioElementRef.current.onpause = audioElementRef.current.onended = () => {
            setIsAudioPlaying(false);
          };
          
          // 设置音频名称
          audioElementRef.current.title = file.name;
        }
      };
      
      fileReader.onerror = (error) => {
        console.error('文件读取错误:', error);
        toast.error('文件读取失败，请重试');
      };
      
      fileReader.readAsDataURL(file);
    }
  };

  // 页面加载时从本地存储恢复音频
  useEffect(() => {
    try {
      const savedAudioData = localStorage.getItem('lastUploadedAudio');
      if (savedAudioData && audioElementRef.current) {
        audioElementRef.current.src = savedAudioData;
        setShowAudioPlayer(true);
        
        // 设置音频事件监听
        audioElementRef.current.onplay = () => {
          setIsAudioPlaying(true);
        };
        
        audioElementRef.current.onpause = audioElementRef.current.onended = () => {
          setIsAudioPlaying(false);
        };
      }
    } catch (err) {
      console.error('无法从本地存储加载音频:', err);
    }
  }, []);
  
  // 创建初始化音频上下文的函数，在用户首次交互时调用
  const initializeAudioOnFirstInteraction = () => {
    if (!window.AudioContext) return;
    
    try {
      const tempAudioContext = new AudioContext();
      tempAudioContext.suspend();
    } catch (error) {
      console.log('AudioContext 初始化备用方案');
    }
  };
  
  // 在组件挂载时设置一次性点击监听器，确保在用户交互中初始化音频上下文
  useEffect(() => {
    const handleFirstClick = () => {
      initializeAudioOnFirstInteraction();
      document.body.removeEventListener('click', handleFirstClick);
    };
    
    document.body.addEventListener('click', handleFirstClick, { once: true });
    
    return () => {document.body.removeEventListener('click', handleFirstClick);
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-800 font-sans overflow-hidden">
      {/* 粒子背景 */}
      <ParticleField activeMood={activeMood} isPlaying={isPlaying || isRecording || isAudioPlaying} />
      
      {/* 首页标题区（Hero Section） */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden z-10">
        {/* 柔和的背景渐变装饰 */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-100/20 blur-3xl"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-5xl mx-auto"
        >
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-glow bg-gradient-to-r from-blue-600 via-teal-400 to-green-300 bg-clip-text text-transparent"
            animate={{ 
              textShadow: ['0 0 5px rgba(125, 211, 252, 0.4)', '0 0 10px rgba(125, 211, 252, 0.6)', '0 0 5px rgba(125, 211, 252, 0.4)']
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              repeatType: 'reverse'
            }}
          >
            无声的语言 | Silent Language
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl mb-10 text-blue-700 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            让沟通不止于声音，让视觉成为语言。
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              id="randomVisualizationBtn"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.2), 0 0 15px rgba(125, 211, 252, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={randomMood}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-full font-medium text-lg hover:from-blue-600 hover:to-teal-500 transition-all shadow-lg flex items-center justify-center"
            >
              <i className="fas fa-play mr-2"></i> 体验声音可视化
            </motion.button>
            
            <motion.button
              id="microphoneBtn"
              whileHover={{ scale: 1.05, boxShadow: isRecording ? '0 10px 25px -5px rgba(239, 68, 68, 0.2), 0 0 15px rgba(252, 165, 165, 0.3)' : '0 10px 25px -5px rgba(16, 185, 129, 0.2), 0 0 15px rgba(110, 231, 183, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    // 确保在用户交互中调用
                    await startRecording();
                  }
                } catch (err) {
                  console.error('麦克风操作失败:', err);
                  toast.error('麦克风操作失败，请重试');
                }
              }}
              className={`px-8 py-4 ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-400 to-orange-400' 
                  : 'bg-gradient-to-r from-green-400 to-emerald-400'
              } text-white rounded-full font-medium text-lg transition-all shadow-lg flex items-center justify-center`}
            >
              {isRecording ? (
                <>
                  <i className="fas fa-microphone-slash mr-2"></i> 停止麦克风
                </>
              ) : (
                <>
                  <i className="fas fa-microphone mr-2"></i> 使用麦克风
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
        
         {/* 装饰性波形图 */}
         <motion.div
           id="soundWaveContainer"
           className="absolute bottom-10 w-full max-w-3xl"
           initial={{ opacity: 0, y: 50 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 1, duration: 1 }}
         >
           <SoundWaveVisualization activeMood={activeMood} isPlaying={isPlaying || isRecording || isAudioPlaying} />
         </motion.div>
         
         {/* 麦克风状态指示器 */}
         {isRecording && (
           <motion.div 
             id="microphoneStatus"
             className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500/20 bg-blur px-4 py-2 rounded-full border border-green-400/30 backdrop-blur-md"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
           >
             <div className="flex items-center text-green-800">
               <motion.div 
                 className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 1, repeat: Infinity }}
               />
               <span>麦克风已激活</span>
             </div>
           </motion.div>
         )}
        
        {/* 向下滚动指示 */}
        <motion.div 
          className="absolute bottom-5"
          animate={{ 
            y: [0, 10, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop'
          }}
        >
          <i className="fas fa-chevron-down text-2xl text-blue-400"></i>
        </motion.div>
      </section>

      {/* 声音互动体验区 */}
      <section id="soundInteraction" className="relative py-20 px-4 bg-white/70 bg-blur">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              声音互动体验
            </h2>
            <p className="text-lg text-blue-700 max-w-2xl mx-auto">
              录制您的声音，AI将把它转化为独特的视觉体验
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             {/* 控制面板 */}
            <div className="bg-white/80 rounded-2xl p-8 shadow-lg border border-blue-100">
              <h3 className="text-xl font-semibold mb-6 text-blue-800">声音输入</h3>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    id="recordBtn"
                    whileHover={{ scale: 1.03, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (isRecording) {
                        stopRecording();
                      } else {
                        try {
                          await startRecording();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : '录制失败，请重试');
                        }
                      }
                    }}
                    className={`flex-1 px-6 py-3 ${
                      isRecording 
                        ? 'bg-gradient-to-r from-red-500 to-orange-400' 
                        : 'bg-gradient-to-r from-blue-500 to-teal-400'
                    } text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all shadow-md flex items-center justify-center`}
                  >
                    {isRecording ? (
                      <>
                        <i className="fas fa-stop mr-2"></i> 停止录制
                      </>
                    ) : (
                      <>
                        <i className="fas fa-circle mr-2"></i> 录制声音
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    id="uploadBtn"
                    whileHover={{ scale: 1.03, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // 确保在用户交互中触发文件选择
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md flex items-center justify-center"
                  >
                    <i className="fas fa-upload mr-2"></i> 上传音频
                  </motion.button>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  id="audioFileInput" 
                  accept="audio/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                <div id="audioPlayer" className={showAudioPlayer ? 'block' : 'hidden'}>
                  <audio 
                    id="audioElement" 
                    ref={audioElementRef} 
                    controls 
                    className="w-full rounded-lg bg-blue-50 p-2 border border-blue-100"
                  ></audio>
                </div>
                {(isRecording || isAudioPlaying) && (
                  <div id="audioAnalysis" className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-medium text-blue-700 mb-2">音频分析</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-600">音量</p>
                        <div className="h-2 bg-blue-100 rounded-full mt-1">
                          <div id="volumeBar" className="h-full bg-blue-500 rounded-full" style={{ width: `${audioData?.volume ? audioData.volume * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">音调</p>
                        <div id="pitchIndicator" className="text-sm text-blue-500 mt-1">
                          {audioData?.pitch === 'low' ? '低沉' : audioData?.pitch === 'mid' ? '中等' : audioData?.pitch === 'high' ? '高亢' : '检测中...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 可视化区域 */}
            <div id="visualizationContainer" className="aspect-square bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-blue-100 shadow-lg">
              <div id="shapeContainer" className="absolute inset-0 flex items-center justify-center">
                {(isRecording || isAudioPlaying || isPlaying) ? (
                  <AnimatePresence mode="wait">
                    <ColorfulShape 
                      key={activeMood} 
                      mood={activeMood} 
                      isPlaying={isPlaying || isRecording || isAudioPlaying} 
                    />
                  </AnimatePresence>
                ) : (
                  <div className="text-center text-blue-400 text-center animate-float">
                    <i className="fas fa-volume-up text-5xl mb-4"></i>
                    <p>点击录制或上传音频开始体验</p>
                  </div>
                )}
              </div>
              <div id="visualizationStatus" className="absolute bottom-4 left-0 right-0 text-center">
                <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/70 bg-blur border border-blue-100 text-blue-700">
                  {isRecording ? '麦克风分析中' : isAudioPlaying ? '播放中' : isPlaying ? '视觉体验中' : '准备就绪'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 项目简介（About Section） */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
              关于我们的项目
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-teal-400 mx-auto"></div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-blue-100"
          >
            <p className="text-lg md:text-xl leading-relaxed text-blue-800">
              Silent Language 是一个融合人工智能与无障碍设计的概念项目，
              它让听障人士通过视觉图形「看到」声音的情绪与节奏，
              以光与形的方式重新诠释沟通的意义。
            </p>
          </motion.div>
        </div>
        
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-blue-100/30 blur-2xl"></div>
        </div>
      </section>

      {/* 视觉演示区（Visualization Showcase） */}
      <section className="relative py-24 px-4 bg-gradient-to-br from-blue-50 to-teal-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
              视觉声音体验
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-teal-400 mx-auto mb-6"></div>
            <p className="text-lg text-blue-700 max-w-2xl mx-auto">
              探索不同情绪的声音如何转化为独特的视觉表现
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            {/* 视觉演示区 */}
            <motion.div
              className="aspect-square bg-white rounded-2xl overflow-hidden relative flex items-center justify-center border border-blue-100 shadow-xl"
              whileHover={{ boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04), 0 0 30px rgba(125, 211, 252, 0.1)' }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* 动态几何图形 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <ColorfulShape 
                    key={activeMood} 
                    mood={activeMood} 
                    isPlaying={isPlaying || isRecording || isAudioPlaying} 
                  />
                </AnimatePresence>
              </div>
              
              {/* 当前情绪指示器 */}
              <motion.div
                className="absolute bottom-4 left-0 right-0 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/80 backdrop-blur-sm border border-blue-100 text-blue-700 shadow-sm">
                  {activeMood === 'happy' && '欢快的声音'}
                  {activeMood === 'sad' && '忧郁的声音'}
                  {activeMood === 'calm' && '低沉的声音'}
                  {activeMood === 'excited' && '高亢的声音'}
                </span>
              </motion.div>
            </motion.div>
            
            {/* 控制面板 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col justify-center"
            >
              <h3 className="text-2xl font-semibold mb-6 text-blue-800">情绪声音选择</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { id: 'happy', label: '欢快', color: 'from-yellow-400 to-orange-400' },
                  { id: 'sad', label: '忧郁', color: 'from-blue-400 to-indigo-400' },
                  { id: 'calm', label: '低沉', color: 'from-teal-400 to-green-400' },
                  { id: 'excited', label: '高亢', color: 'from-pink-400 to-purple-400' }
                ].map((mood) => (
                  <motion.button
                    key={mood.id}
                    whileHover={{ scale: 1.03, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveMood(mood.id);
                      playVisualSound();
                    }}
                    className={`px-4 py-4 rounded-xl font-medium text-white flex items-center justify-center border ${
                      activeMood === mood.id 
                        ? `bg-gradient-to-br ${mood.color} border-white/30 shadow-lg` 
                        : 'bg-white/70 border-gray-100 text-gray-700 hover:bg-white'
                    } transition-all shadow-md`}
                  >
                    {activeMood === mood.id && (
                      <i className="fas fa-check-circle mr-2"></i>
                    )}
                    {mood.label}
                  </motion.button>
                ))}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.2), 0 0 15px rgba(125, 211, 252, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={randomMood}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all flex items-center justify-center shadow-lg"
              >
                 <i className="fas fa-random mr-2"></i> 随机体验
              </motion.button>
              
              {/* 麦克风状态提示 */}
              {isRecording && (
                <motion.div
                  className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                      <i className="fas fa-info text-blue-600"></i>
                    </div>
                    <div>
                      <h4 className="text-blue-700 font-medium mb-1">麦克风已激活</h4>
                      <p className="text-sm text-blue-600">
                        系统正在分析环境声音，尝试说话或播放音乐来体验实时视觉效果。
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
        
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNmMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNnoiIGZpbGw9IiMyZGRhYmIiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        </div>
      </section>

      {/* 设计理念（Design Concept） */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
              设计理念
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-teal-400 mx-auto"></div>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {[
              {
                title: "包容与平等",
                description: "让听障人士拥有全新的「视觉沟通方式」",
                icon: "fa-universal-access"
              },
              {
                title: "科技与人文融合",
                description: "以AI为桥梁，让声音转化为艺术",
                icon: "fa-robot"
              },
              {
                title: "情绪共鸣",
                description: "不同色彩代表不同的情绪能量",
                icon: "fa-heart"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
                whileHover={{ 
                  y: -5, 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
                }}
                className="bg-white p-8 rounded-2xl border border-blue-100 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center mb-6 shadow-md">
                  <i className={`fas ${item.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-xl font-bold mb-3 text-blue-800">{item.title}</h3>
                <p className="text-blue-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-teal-100/30 blur-3xl"></div></div>
      </section>

      {/* 未来展望（Future Vision） */}
      <section className="relative py-24 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
              未来展望
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-teal-400 mx-auto"></div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="bg-white p-8 md:p-12 rounded-2xl border border-blue-100 shadow-xl"
          >
            <p className="text-lg md:text-xl leading-relaxed text-blue-800 text-center">
              未来，这套系统可以延伸至音乐表演、公共空间、教育场景，
              让声音的美以视觉形式传递给每一个人。
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              {['音乐表演', '公共空间', '教育场景'].map((scene, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)'
                  }}
                  className="bg-white p-6 rounded-xl border border-blue-100 text-center shadow-md"
                >
                  <h3 className="text-lg font-semibold text-blue-800">{scene}</h3>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-purple-100/30 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-100/30 blur-3xl"></div>
        </div>
      </section>

      {/* 页脚（Footer） */}
      <footer className="relative py-12 px-4 bg-gradient-to-t from-blue-100 to-transparent border-t border-blue-100">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.p 
            className="text-blue-700"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            © 2025 Silent Language Project | Designed for Inclusive AI Future
          </motion.p>
        </div>
      </footer>
    </div>
  );
}