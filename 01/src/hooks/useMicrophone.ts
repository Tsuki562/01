import { useState, useEffect, useRef } from 'react';

interface AudioAnalysisData {
  volume: number;
  frequencies: number[];
  dominantFrequency: number;
  pitch: 'low' | 'mid' | 'high';
  amplitude: number;
}

interface UseMicrophoneResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioData: AudioAnalysisData | null;
  error: string | null;
  hasPermission: boolean | null;
}

// 用于存储音频数据的本地存储键
const LOCAL_STORAGE_KEY = 'silent_language_audio_preferences';

// 默认音频配置 - 调整为更适合温暖风格的参数
const DEFAULT_AUDIO_CONFIG = {
  sampleRate: 44100,
  fftSize: 1024, // 降低fftSize，使音频反应更灵敏
};

// 检测音频的音调范围 - 调整为更温暖的感知
const detectPitch = (frequency: number): 'low' | 'mid' | 'high' => {
  if (frequency < 300) return 'low'; // 稍微提高范围，让用户感知更温暖
  if (frequency < 1200) return 'mid';
  return 'high';
};

// 分析音频数据，提取有用的特征
const analyzeAudioData = (
  analyser: AnalyserNode,
  frequencyData: Uint8Array,
  timeData: Uint8Array
): AudioAnalysisData => {
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);

  // 计算音量（RMS - 均方根）
  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    const normalizedValue = (timeData[i] - 128) / 128;
    sumSquares += normalizedValue * normalizedValue;
  }
  const rms = Math.sqrt(sumSquares / timeData.length);
  
  // 计算振幅（峰值）
  let peakAmplitude = 0;
  for (let i = 0; i < timeData.length; i++) {
    const amplitude = Math.abs(timeData[i] - 128);
    if (amplitude > peakAmplitude) {
      peakAmplitude = amplitude;
    }
  }
  const normalizedAmplitude = peakAmplitude / 128;
  
  // 找到主导频率
  let maxFrequency = 0;
  let dominantFrequency = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxFrequency) {
      maxFrequency = frequencyData[i];
      dominantFrequency = i;
    }
  }
  
  // 转换为实际频率（Hz）
  const actualFrequency = (dominantFrequency * DEFAULT_AUDIO_CONFIG.sampleRate) / analyser.fftSize;
  
  return {
    volume: rms,
    frequencies: Array.from(frequencyData),
    dominantFrequency: actualFrequency,
    pitch: detectPitch(actualFrequency),
    amplitude: normalizedAmplitude,
  };
};

export const useMicrophone = (): UseMicrophoneResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<AudioAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataInitializedRef = useRef(false); // 用于跟踪数据初始化状态
  
  // 从本地存储加载用户首选项
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        // 可以在这里应用用户首选项
      }
    } catch (err) {
      console.error('Failed to load audio preferences from localStorage:', err);
    }
  }, []);
  
  // 检查浏览器兼容性
  useEffect(() => {
    if (!navigator.mediaDevices || !window.AudioContext) {
      setError('您的浏览器不支持音频录制功能，请使用现代浏览器。');
      setHasPermission(false);
    }
  }, []);
  
  // 请求麦克风权限
  const requestMicrophonePermission = async (): Promise<MediaStream> => {
    try {
      // 确保在用户交互中请求权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setHasPermission(true);
      setError(null);
      return stream;
    } catch (err) {
      setHasPermission(false);
      let errorMessage = '无法访问麦克风';
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = '用户拒绝了麦克风访问权限，请在浏览器设置中允许麦克风访问';
            break;
          case 'NotFoundError':
            errorMessage = '没有找到可用的麦克风设备';
            break;
          case 'NotReadableError':
            errorMessage = '麦克风设备被占用';
            break;
          case 'AbortError':
            errorMessage = '麦克风访问被中止';
            break;
          case 'SecurityError':
            errorMessage = '出于安全原因无法访问麦克风';
            break;
          default:
            errorMessage = `访问麦克风时出错: ${err.message}`;
        }
      } else if (err instanceof Error) {
        errorMessage = `访问麦克风时出错: ${err.message}`;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // 初始化音频分析器
  const initializeAudioAnalyzer = (stream: MediaStream) => {
    try {
      // 创建音频上下文
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // 创建分析器节点
      if (!analyserRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = DEFAULT_AUDIO_CONFIG.fftSize;
        analyser.smoothingTimeConstant = 0.9; // 增加平滑度，使视觉效果更柔和
        analyserRef.current = analyser;
      }
      
      // 创建麦克风源节点
      if (!microphoneRef.current) {
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);
      }
      
      streamRef.current = stream;
      
    } catch (err) {
      const errorMessage = `初始化音频分析器时出错: ${err instanceof Error ? err.message : '未知错误'}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // 开始音频分析循环
  const startAnalysisLoop = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    
    // 音频数据平滑处理函数
    const smoothData = (current: number, previous: number | undefined, alpha: number = 0.3) => {
      if (previous === undefined) return current;
      return previous * (1 - alpha) + current * alpha;
    };
    
    // 用于存储上一帧的音频数据，用于平滑
    let previousData: AudioAnalysisData | null = null;
    
    const analyze = () => {
      if (!analyserRef.current || !isRecording || !audioContextRef.current) return;
      
      try {
        const data = analyzeAudioData(analyser, frequencyData, timeData);
        
        // 平滑处理音频数据，使视觉效果更柔和
        if (previousData) {
          const smoothedData = {
            volume: smoothData(data.volume, previousData.volume),
            frequencies: data.frequencies.map((freq, index) => 
              smoothData(freq, previousData.frequencies[index])
            ),
            dominantFrequency: smoothData(data.dominantFrequency, previousData.dominantFrequency),
            pitch: data.pitch, // 音高保持不变
            amplitude: smoothData(data.amplitude, previousData.amplitude)
          };
          
          setAudioData(smoothedData);
          previousData = smoothedData;
        } else {
          // 首次初始化数据，确保有一个有效的音频数据对象
          const initialData = {
            ...data,
            volume: Math.max(0.1, data.volume) // 确保音量不为零
          };
          setAudioData(initialData);
          previousData = initialData;
          dataInitializedRef.current = true;
        }
      } catch (err) {
        console.error('音频分析错误:', err);
        // 即使出错也要继续循环，避免录制中断
      }
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  };
  
  // 开始录音
  const startRecording = async () => {
    if (isRecording) return;
    
    try {
      setError(null);
      setIsRecording(true);
      
      // 首先确保在用户交互中创建或恢复AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // 请求麦克风权限并初始化
      const stream = await requestMicrophonePermission();
      initializeAudioAnalyzer(stream);
      
      // 开始分析循环
      startAnalysisLoop();
      
      // 确保动画帧循环持续运行
      const keepAliveInterval = setInterval(() => {
        if (isRecording && !animationFrameRef.current) {
          startAnalysisLoop();
        }
      }, 1000);
      
      // 存储interval ID以便清理
      animationFrameRef.current = keepAliveInterval as unknown as number;
      
    } catch (err) {
      console.error('Error starting recording:', err);
      // 确保UI更新反映错误状态
      setIsRecording(false);
      // 提供更友好的错误消息
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('启动录音失败，请重试');
      }
    }
  };
  
  // 停止录音
  const stopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    dataInitializedRef.current = false;
    
    // 取消动画帧和保持活动的interval
    if (animationFrameRef.current) {
      const frameId = animationFrameRef.current;
      // 检查是否是interval ID
      if (typeof frameId === 'number' && frameId > 0) {
        try {
          // 尝试取消动画帧
          cancelAnimationFrame(frameId);
        } catch {
          // 如果失败，尝试清除interval
          clearInterval(frameId);
        }
      }
      animationFrameRef.current = null;
    }
    
    // 停止所有音轨
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 断开音频节点连接
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    // 可选：暂停音频上下文以节省资源
    if (audioContextRef.current) {
      audioContextRef.current.suspend().catch(err => {
        console.error('暂停音频上下文失败:', err);
      });
    }
    
    // 清空音频数据
    setAudioData(null);
  };
  
  // 清理资源
  useEffect(() => {
    return () => {
      stopRecording();
      
      // 彻底关闭音频上下文
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error('关闭音频上下文失败:', err);
        });
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;
    };
  }, []);
  
  return {
    isRecording,
    startRecording,
    stopRecording,
    audioData,
    error,
    hasPermission
  };
};