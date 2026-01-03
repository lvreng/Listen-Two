// preload.js - 预加载脚本，安全地暴露 Electron API
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息到主进程
  send: (channel, data) => {
    const validChannels = ['perform-action', 'window-control', 'audio-control'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // 监听主进程消息
  on: (channel, callback) => {
    const validChannels = ['audio-progress', 'audio-ended', 'audio-error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // 移除监听器
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // 选择音乐文件夹
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  
  // 选择单个音乐文件
  selectMusicFile: () => ipcRenderer.invoke('select-music-file'),
  
  // 音频控制
  playAudio: (filePath) => ipcRenderer.invoke('play-audio', filePath),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  resumeAudio: () => ipcRenderer.invoke('resume-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  setVolume: (volume) => ipcRenderer.invoke('set-volume', volume),
  seekTo: (time) => ipcRenderer.invoke('seek-to', time),
  getAudioInfo: () => ipcRenderer.invoke('get-audio-info'),
  
  // 读取音频元数据
  getAudioMetadata: (filePath) => ipcRenderer.invoke('get-audio-metadata', filePath),
  
  // 窗口状态
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (event, isMaximized) => callback(isMaximized));
  },
  
  // 捕获桌面背景（窗口所在区域的壁纸）
  captureDesktopBackground: () => ipcRenderer.invoke('capture-desktop-background'),

  onWindowMoveEnd: (callback) => {
    ipcRenderer.on('window-move-end', () => callback());
  },
  
  // 读取歌词文件
  readLyricsFile: (filePath) => ipcRenderer.invoke('read-lyrics-file', filePath),
  
  // 保存状态文件
  saveStateFile: (folderPath, stateData) => ipcRenderer.invoke('save-state-file', folderPath, stateData),
});
