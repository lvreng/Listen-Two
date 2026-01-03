// main.js
const { app, BrowserWindow, ipcMain, dialog, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseFile } = require('music-metadata');

let mainWindow;
let audioPlayer = null; // 用于存储音频播放器实例

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    transparent: true,
    frame: false,
    resizable: true,
    icon: path.join(__dirname, 'logo.png'), // 设置应用图标
    show: false, // 先不显示窗口，等加载完成后再显示（优化启动速度）
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // 优化启动速度
      enableRemoteModule: false,
      sandbox: false
    }
  });

  // 优化启动速度：等待窗口准备好后再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile('index.html');

  // 生产环境优化：禁用开发者工具以加快启动速度
  if (!process.env.DEBUG && process.env.NODE_ENV !== 'development') {
    // 生产环境不打开开发者工具
  } else {
    // 开发环境可以打开开发者工具
  // mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (audioPlayer) {
      audioPlayer.destroy();
      audioPlayer = null;
    }
  });

  // 监听窗口状态变化
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', false);
  });

  // 窗口移动结束后刷新背景
  let moveTimer = null;
  mainWindow.on('move', () => {
    // 清除之前的计时器
    if (moveTimer) {
      clearTimeout(moveTimer);
    }
    // 设置一个新的计时器，如果在250ms内没有新的移动事件，则发送移动结束事件
    moveTimer = setTimeout(() => {
      mainWindow.webContents.send('window-move-end');
      moveTimer = null;
    }, 250);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 窗口控制
ipcMain.on('window-control', (event, action) => {
  if (!mainWindow) return;
  
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'close':
      mainWindow.close();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
  }
});

// 定位文件
ipcMain.on('locate-file', (event, filePath) => {
  const { shell } = require('electron');
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  }
});

// 检查窗口是否最大化
ipcMain.handle('is-maximized', () => {
  if (!mainWindow) return false;
  return mainWindow.isMaximized();
});

// 捕获桌面背景 - 只截取窗口所在区域的壁纸
ipcMain.handle('capture-desktop-background', async () => {
  return new Promise((resolve) => {
    try {
      if (!mainWindow) {
        resolve(null);
        return;
      }
      
      const bounds = mainWindow.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const displayBounds = display.bounds;
      
      // 计算窗口在屏幕中的相对位置
      const windowX = bounds.x - displayBounds.x;
      const windowY = bounds.y - displayBounds.y;
      
      // 获取屏幕截图 - 使用原始屏幕尺寸
      desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: displayBounds.width, 
          height: displayBounds.height 
        }
      }).then(sources => {
        if (sources && sources.length > 0) {
          // 找到包含窗口的屏幕
          const displayId = display.id;
          let source = sources.find(s => s.id === `screen:${displayId}`);
          
          if (!source) {
            // 如果找不到，使用主屏幕
            const primaryDisplay = screen.getPrimaryDisplay();
            source = sources.find(s => s.id === `screen:${primaryDisplay.id}`);
          }
          
          if (!source) {
            // 如果还是找不到，使用第一个
            source = sources[0];
          }
          
          if (source && source.thumbnail) {
            try {
              // 裁剪出窗口所在区域（扩大一些以获得更好的模糊效果）
              const cropX = Math.max(0, windowX - bounds.width * 0.5);
              const cropY = Math.max(0, windowY - bounds.height * 0.5);
              const cropWidth = Math.min(
                bounds.width * 2, 
                displayBounds.width - cropX
              );
              const cropHeight = Math.min(
                bounds.height * 2, 
                displayBounds.height - cropY
              );
              
              // 裁剪图像
              const cropped = source.thumbnail.crop({
                x: cropX,
                y: cropY,
                width: cropWidth,
                height: cropHeight
              });
              
              // 转换为 data URL
              const dataURL = cropped.toDataURL();
              resolve(dataURL);
              return;
            } catch (cropError) {
              console.warn('裁剪图像失败，使用完整截图:', cropError);
              // 如果裁剪失败，使用完整截图
              const dataURL = source.thumbnail.toDataURL();
              resolve(dataURL);
              return;
            }
          }
        }
        resolve(null);
      }).catch(error => {
        console.error('捕获桌面背景失败:', error);
        resolve(null);
      });
    } catch (error) {
      console.error('捕获桌面背景失败:', error);
      resolve(null);
    }
  });
});

// 选择音乐文件夹
ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择音乐文件夹'
  });
  
  if (result.canceled) return null;
  
  const folderPath = result.filePaths[0];
  const files = fs.readdirSync(folderPath);
  const musicFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'].includes(ext);
  }).map(file => path.join(folderPath, file));
  
  // 检查是否有状态文件
  const stateFilePath = path.join(folderPath, '.listen-two-state.json');
  let stateData = null;
  if (fs.existsSync(stateFilePath)) {
    try {
      const stateContent = fs.readFileSync(stateFilePath, 'utf-8');
      stateData = JSON.parse(stateContent);
    } catch (error) {
      console.warn('读取状态文件失败:', error);
    }
  }
  
  return {
    files: musicFiles,
    folderPath: folderPath,
    stateData: stateData
  };
});

// 选择单个音乐文件
ipcMain.handle('select-music-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg'] }
    ],
    title: '选择音乐文件'
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 获取音频元数据
ipcMain.handle('get-audio-metadata', async (event, filePath) => {
  try {
    const metadata = await parseFile(filePath);
    
    // 提取内嵌歌词
    let lyrics = null;
    try {
      // MP3 使用 USLT 标签（Unsynchronized Lyrics）
      if (metadata.native && metadata.native.id3v2) {
        // id3v2 是一个数组，查找 USLT 标签
        for (const tag of metadata.native.id3v2) {
          if (tag.id === 'USLT') {
            // USLT 标签可能有 text 或 value 属性
            lyrics = tag.text || tag.value || (tag.data ? tag.data.toString('utf8') : null);
            if (lyrics) break;
          }
        }
        
        // 如果没有 USLT，尝试 TXXX 标签（用户定义文本）
        if (!lyrics) {
          for (const tag of metadata.native.id3v2) {
            if (tag.id === 'TXXX') {
              const description = (tag.description || '').toLowerCase();
              if (description.includes('lyrics') || description.includes('歌词')) {
                lyrics = tag.text || tag.value || (tag.data ? tag.data.toString('utf8') : null);
                if (lyrics) break;
              }
            }
          }
        }
      }
      
      // FLAC 使用 LYRICS 标签（Vorbis comment）
      if (!lyrics && metadata.native && metadata.native.vorbis) {
        // vorbis 是一个数组，查找 LYRICS 标签
        for (const tag of metadata.native.vorbis) {
          if (tag.id === 'LYRICS') {
            lyrics = tag.value || tag.text || (tag.data ? tag.data.toString('utf8') : null);
            if (lyrics) break;
          }
        }
      }
      
      // 如果还是没有，尝试从 common.lyrics 获取（某些格式可能在这里）
      if (!lyrics && metadata.common && metadata.common.lyrics) {
        lyrics = Array.isArray(metadata.common.lyrics) ? metadata.common.lyrics[0] : metadata.common.lyrics;
      }
    } catch (lyricsError) {
      console.warn('提取歌词失败:', lyricsError);
      console.warn('元数据结构:', JSON.stringify(metadata.native, null, 2));
    }
    
    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || '未知艺术家',
      album: metadata.common.album || '未知专辑',
      duration: metadata.format.duration || 0,
      picture: metadata.common.picture ? {
        data: metadata.common.picture[0].data,
        format: metadata.common.picture[0].format
      } : null,
      lyrics: lyrics || null
    };
  } catch (error) {
    console.error('读取元数据失败:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: '未知艺术家',
      album: '未知专辑',
      duration: 0,
      picture: null,
      lyrics: null
    };
  }
});

// 音频播放控制
let currentAudio = null;
let audioElement = null;

ipcMain.handle('play-audio', async (event, filePath) => {
  try {
    if (audioElement) {
      audioElement.destroy();
    }
    
    // 使用 HTML5 Audio API（通过渲染进程）
    // 主进程主要负责文件路径管理
    currentAudio = filePath;
    return { success: true, filePath };
  } catch (error) {
    console.error('播放失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pause-audio', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('audio-pause');
  }
  return { success: true };
});

ipcMain.handle('resume-audio', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('audio-resume');
  }
  return { success: true };
});

ipcMain.handle('stop-audio', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('audio-stop');
  }
  currentAudio = null;
  return { success: true };
});

ipcMain.handle('set-volume', async (event, volume) => {
  if (mainWindow) {
    mainWindow.webContents.send('audio-set-volume', volume);
  }
  return { success: true };
});

ipcMain.handle('seek-to', async (event, time) => {
  if (mainWindow) {
    mainWindow.webContents.send('audio-seek', time);
  }
  return { success: true };
});

ipcMain.handle('get-audio-info', async () => {
  return {
    currentFile: currentAudio,
    duration: 0,
    currentTime: 0
  };
});

// 读取歌词文件
ipcMain.handle('read-lyrics-file', async (event, filePath) => {
  try {
    // 尝试查找同名的 .lrc 文件
    const audioDir = path.dirname(filePath);
    const audioName = path.basename(filePath, path.extname(filePath));
    const lrcPath = path.join(audioDir, audioName + '.lrc');
    
    // 检查文件是否存在
    if (fs.existsSync(lrcPath)) {
      const content = fs.readFileSync(lrcPath, 'utf-8');
      return { success: true, content };
    } else {
      return { success: false, content: null };
    }
  } catch (error) {
    console.error('读取歌词文件失败:', error);
    return { success: false, content: null, error: error.message };
  }
});

// 保存状态文件到指定文件夹
ipcMain.handle('save-state-file', async (event, folderPath, stateData) => {
  try {
    if (!folderPath) {
      return { success: false, error: '文件夹路径为空' };
    }
    
    const stateFilePath = path.join(folderPath, '.listen-two-state.json');
    fs.writeFileSync(stateFilePath, JSON.stringify(stateData, null, 2), 'utf-8');
    return { success: true, filePath: stateFilePath };
  } catch (error) {
    console.error('保存状态文件失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取当前音乐文件夹路径（用于导出）
ipcMain.handle('get-current-music-folder', async () => {
  // 这个需要从渲染进程传递，或者从最近选择的文件夹中获取
  // 暂时返回 null，由渲染进程处理
  return null;
});
