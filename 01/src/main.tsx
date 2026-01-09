import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);

// 初始化应用逻辑
document.addEventListener('DOMContentLoaded', () => {
  // 检查浏览器兼容性
  if (!navigator.mediaDevices || !window.AudioContext) {
    console.warn('浏览器不支持音频录制功能');
    
    // 添加全局错误提示
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    errorToast.textContent = '您的浏览器不支持音频录制功能，请使用现代浏览器';
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
      errorToast.style.opacity = '0';
      errorToast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 500);
    }, 5000);
  }
  
  // 确保页面在用户交互前完全加载
  window.addEventListener('load', () => {
    console.log('Silent Language 应用已完全加载');
  });
});
