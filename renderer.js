// renderer.js - 优化启动速度，延迟加载非关键功能
(function() {
  'use strict';
  
  function initApp() {
    if (typeof Vue === 'undefined') {
      console.error('Vue 未加载！');
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = '<div style="color: white; padding: 20px; text-align: center;"><h2>错误：Vue 未加载</h2></div>';
      }
      return;
    }
    
    const { createApp, ref, computed, onMounted, onUnmounted, nextTick, watchEffect, watch, h } = Vue;

const App = {
  setup() {
        // 状态管理
        const isPlaying = ref(false);
        const currentTime = ref(0);
        const duration = ref(0);
        const volume = ref(0.7);
        const isMuted = ref(false);
        const playMode = ref('sequence');
        const currentIndex = ref(-1);
        const playlist = ref([]);
        const currentSong = ref(null);
        const searchKeyword = ref(''); // 搜索关键词
        const isLoading = ref(false);
        const isDraggingProgress = ref(false);
        const showPlaylist = ref(true);
        const showSidebar = ref(true);
        const showLyrics = ref(true); // 控制歌词栏显示/隐藏
        const logoRotation = ref(0); // 图标旋转角度
        const isRotating = ref(false); // 是否正在旋转
        const contextMenuVisible = ref(false);
        const contextMenuX = ref(0);
        const contextMenuY = ref(0);
        const contextMenuItem = ref(null);
        const isMaximized = ref(false);
        const backgroundMode = ref('cover'); // 'cover' 或 'desktop'
        const desktopBackgroundMode = ref('locked'); // 'locked' 或 'dynamic'
        // 播放特效相关状态
        const playEffects = ref(['涟漪', '流星', '律动', '默认']);
        const currentEffectIndex = ref(3); // 默认选中"默认"
        const effectListOffset = ref(playEffects.value.length + currentEffectIndex.value); // 初始偏移量，指向中间组并加上当前索引
        const effectListRef = ref(null); // 用于存储 effect-list 元素的引用
        
        // 初始化特效管理器
        let playEffectManager = null;
        if (window.PlayEffectManager) {
          playEffectManager = new window.PlayEffectManager();
          // 注册所有特效
          if (window.RippleEffect) {
            playEffectManager.registerEffect('涟漪', window.RippleEffect);
          }
          if (window.RhythmEffect) {
            playEffectManager.registerEffect('律动', window.RhythmEffect);
          }
          if (window.MeteorEffect) {
            playEffectManager.registerEffect('流星', window.MeteorEffect);
          }
          // 后续可以在这里注册其他特效
        }
        // 歌单相关状态
        const playlists = ref([]); // 歌单列表 [{ id, name, songs: [filePath...] }]
        const selectedPlaylistId = ref('local'); // 当前选中的歌单ID，'local' 表示本地音乐
        const allSongs = ref([]); // 所有本地音乐（用于"本地音乐"歌单）
        const currentMusicFolderPath = ref(null); // 当前选择的音乐文件夹路径
        // 浮动面板状态
        const floatingPanelOpen = ref(false);
        const floatingPanelUpdateTrigger = ref(0);
        const floatingPanelState = window.FloatingPanel ? window.FloatingPanel.createState(() => {
          // 触发 Vue 重新渲染
          floatingPanelUpdateTrigger.value++;
        }) : null;
        // 创建歌单输入框
        const showCreatePlaylistDialog = ref(false);
        const newPlaylistNameInput = ref('');
        // 确认对话框
        const showConfirmDialog = ref(false);
        const confirmDialogMessage = ref('');
        const confirmDialogTitle = ref('');
        const confirmDialogCallback = ref(null);
        // 歌词相关状态
        const lyrics = ref([]); // 歌词数组 [{ time: 秒数, text: '歌词内容' }]
        const currentLyricIndex = ref(-1); // 当前显示的歌词索引
        let moveRefreshInterval = null;
        
        let audioElement = null;
        let progressUpdateInterval = null;
        let blurBgImage1 = null;
        let blurBgImage2 = null;
        let desktopBgImage1 = null;
        let desktopBgImage2 = null;
        let activeBgIndex = 1;
        let activeCoverIndex = 1;
        let appElement = null;




        // 获取完整状态数据（用于导出和保存）
        const getStateData = () => {
          // 确保所有数据都是可序列化的
          const getImageSrc = (img) => {
            if (!img || !img.src) return null;
            const src = img.src;
            // 如果是 blob URL，返回 null（无法序列化）
            if (src.startsWith('blob:')) return null;
            // 如果是 data URL，直接返回
            if (src.startsWith('data:')) return src;
            // 其他情况返回 null
            return null;
          };
          
          // 确保歌单数据是可序列化的
          const serializePlaylists = (playlists) => {
            return playlists.map(pl => ({
              id: pl.id,
              name: pl.name,
              songs: Array.isArray(pl.songs) ? pl.songs.map(s => typeof s === 'string' ? s : String(s)) : []
            }));
          };
          
          // 确保 allSongs 是字符串数组
          const serializeAllSongs = (songs) => {
            return songs.map(s => typeof s === 'string' ? s : String(s));
          };
          
          // 确保播放列表是字符串数组
          const serializePlaylist = (playlist) => {
            return playlist.map(item => {
              if (typeof item === 'string') return item;
              if (item && typeof item.filePath === 'string') return item.filePath;
              return String(item);
            });
          };
          
            const state = {
              // 背景设置
              backgroundMode: backgroundMode.value,
              desktopBackgroundMode: desktopBackgroundMode.value,
              
              // 播放设置
            volume: typeof volume.value === 'number' ? volume.value : 0,
            isMuted: typeof isMuted.value === 'boolean' ? isMuted.value : false,
            playMode: typeof playMode.value === 'string' ? playMode.value : 'sequence',
              
              // 播放列表和当前歌曲
            playlist: serializePlaylist(playlist.value),
            currentIndex: typeof currentIndex.value === 'number' ? currentIndex.value : 0,
            currentTime: typeof currentTime.value === 'number' ? currentTime.value : 0,
              
            // 背景图片（只保存 data URL，blob URL 会被忽略）
            desktopBg1: getImageSrc(desktopBgImage1),
            desktopBg2: getImageSrc(desktopBgImage2),
            coverBg1: getImageSrc(blurBgImage1),
            coverBg2: getImageSrc(blurBgImage2),
            activeBgIndex: typeof activeBgIndex === 'number' ? activeBgIndex : 1,
            activeCoverIndex: typeof activeCoverIndex === 'number' ? activeCoverIndex : 1,
              
              // 当前歌曲信息
              currentSong: currentSong.value ? {
              title: currentSong.value.title || '',
              artist: currentSong.value.artist || '',
              album: currentSong.value.album || '',
              filePath: currentSong.value.filePath || '',
              coverUrl: currentSong.value.coverUrl && currentSong.value.coverUrl.startsWith('data:') 
                ? currentSong.value.coverUrl 
                : null
              } : null,
              
              // UI 状态
            showPlaylist: typeof showPlaylist.value === 'boolean' ? showPlaylist.value : false,
            showLyrics: typeof showLyrics.value === 'boolean' ? showLyrics.value : false,
              
              // 歌单数据
            playlists: serializePlaylists(playlists.value),
            selectedPlaylistId: typeof selectedPlaylistId.value === 'string' ? selectedPlaylistId.value : 'local',
            allSongs: serializeAllSongs(allSongs.value)
            };
            
          // 使用 JSON 序列化/反序列化来确保数据可克隆
          try {
            return JSON.parse(JSON.stringify(state));
          } catch (error) {
            console.warn('状态数据序列化失败，返回原始数据:', error);
            return state;
          }
        };

        // 保存状态到 localStorage
        const saveState = () => {
          try {
            const state = getStateData();
            localStorage.setItem('musicPlayerState', JSON.stringify(state));
          } catch (error) {
            console.warn('保存状态失败:', error);
          }
        };

        // 导出状态到文件
        const exportStateToFile = async () => {
          try {
            if (!window.electronAPI) {
              alert('electronAPI 未加载');
              return;
            }
            
            // 如果没有选择音乐文件夹，提示用户先选择
            if (!currentMusicFolderPath.value) {
              const result = await window.electronAPI.selectMusicFolder();
              if (result && result.folderPath) {
                currentMusicFolderPath.value = result.folderPath;
              } else {
                alert('请先选择音乐文件夹');
                return;
              }
            }
            
            // 获取完整状态数据
            const stateData = getStateData();
            
            // 保存到文件
            const result = await window.electronAPI.saveStateFile(currentMusicFolderPath.value, stateData);
            if (result.success) {
              alert('导出成功！状态已保存到音乐文件夹');
            } else {
              alert('导出失败: ' + (result.error || '未知错误'));
            }
          } catch (error) {
            console.error('导出状态失败:', error);
            alert('导出失败: ' + error.message);
          }
        };

        // 从状态数据恢复（用于从文件恢复）
        const restoreStateFromData = async (stateData) => {
          try {
            // 恢复背景模式
            if (stateData.backgroundMode) {
              backgroundMode.value = stateData.backgroundMode;
            }
            if (stateData.desktopBackgroundMode) {
              desktopBackgroundMode.value = stateData.desktopBackgroundMode;
            }
            
            // 恢复活跃索引
            if (stateData.activeBgIndex !== undefined) {
              activeBgIndex = stateData.activeBgIndex;
            }
            if (stateData.activeCoverIndex !== undefined) {
              activeCoverIndex = stateData.activeCoverIndex;
            }
            
            // 恢复背景图片
            if (desktopBgImage1 && stateData.desktopBg1) {
              desktopBgImage1.src = stateData.desktopBg1;
            }
            if (desktopBgImage2 && stateData.desktopBg2) {
              desktopBgImage2.src = stateData.desktopBg2;
            }
            if (blurBgImage1 && stateData.coverBg1) {
              blurBgImage1.src = stateData.coverBg1;
            }
            if (blurBgImage2 && stateData.coverBg2) {
              blurBgImage2.src = stateData.coverBg2;
            }
            
            // 恢复播放设置
            if (stateData.volume !== undefined) {
              volume.value = stateData.volume;
            }
            if (stateData.isMuted !== undefined) {
              isMuted.value = stateData.isMuted;
            }
            if (stateData.playMode) {
              playMode.value = stateData.playMode;
            }
            
            // 恢复歌单数据（优先）
            if (stateData.playlists && Array.isArray(stateData.playlists)) {
              playlists.value = stateData.playlists;
            }
            if (stateData.selectedPlaylistId) {
              selectedPlaylistId.value = stateData.selectedPlaylistId;
            }
            if (stateData.allSongs && Array.isArray(stateData.allSongs)) {
              allSongs.value = stateData.allSongs;
            }
            
            // 恢复播放列表
            if (stateData.playlist && stateData.playlist.length > 0) {
              playlist.value = stateData.playlist.map((filePath, index) => ({
                filePath,
                index
              }));
            } else {
              // 如果没有保存的播放列表，根据选中的歌单更新
              updatePlaylistFromSelected();
            }
            
            // 恢复当前歌曲和播放进度
            if (stateData.currentSong && stateData.currentIndex >= 0 && stateData.currentIndex < playlist.value.length) {
              currentIndex.value = stateData.currentIndex;
              currentSong.value = stateData.currentSong;
              
              // 恢复播放位置
              initAudio();
              if (audioElement && stateData.currentTime !== undefined) {
                const fileUrl = stateData.currentSong.filePath.startsWith('file://') 
                  ? stateData.currentSong.filePath 
                  : `file:///${stateData.currentSong.filePath.replace(/\\/g, '/')}`;
                audioElement.src = fileUrl;
                audioElement.volume = volume.value;
                audioElement.load();
                
                // 等待元数据加载后设置播放位置
                audioElement.addEventListener('loadedmetadata', () => {
                  if (stateData.currentTime !== undefined && stateData.currentTime > 0) {
                    audioElement.currentTime = stateData.currentTime;
                  }
                }, { once: true });
              }
              
              // 恢复封面背景
              if (stateData.currentSong.coverUrl && stateData.currentSong.coverUrl.startsWith('data:')) {
                updateBlurBackground(stateData.currentSong.coverUrl);
              }
            }
            
            // 恢复UI状态
            if (stateData.showPlaylist !== undefined) {
              showPlaylist.value = stateData.showPlaylist;
            }
            if (stateData.showLyrics !== undefined) {
              showLyrics.value = stateData.showLyrics;
            }
            
            // 保存到 localStorage
            saveState();
          } catch (error) {
            console.error('从状态数据恢复失败:', error);
            throw error;
          }
        };

        // 从 localStorage 恢复状态
        const restoreState = async () => {
          try {
            const savedState = localStorage.getItem('musicPlayerState');
            if (!savedState) return false;
            
            const state = JSON.parse(savedState);
            
            // 恢复背景模式（先恢复模式，再恢复图片）
            if (state.backgroundMode) {
              backgroundMode.value = state.backgroundMode;
            }
            if (state.desktopBackgroundMode) {
              desktopBackgroundMode.value = state.desktopBackgroundMode;
            }
            
            // 恢复活跃索引
            if (state.activeBgIndex) {
              activeBgIndex = state.activeBgIndex;
            }
            if (state.activeCoverIndex) {
              activeCoverIndex = state.activeCoverIndex;
            }
            
            // 首先恢复背景图片（立即显示，防止空白）
            // 先隐藏所有背景，然后只显示应该显示的
            if (desktopBgImage1) desktopBgImage1.classList.remove('active');
            if (desktopBgImage2) desktopBgImage2.classList.remove('active');
            if (blurBgImage1) blurBgImage1.classList.remove('active');
            if (blurBgImage2) blurBgImage2.classList.remove('active');
            
            // 恢复桌面背景图片
            if (state.desktopBg1 && desktopBgImage1) {
              desktopBgImage1.src = state.desktopBg1;
            }
            if (state.desktopBg2 && desktopBgImage2) {
              desktopBgImage2.src = state.desktopBg2;
            }
            
            // 恢复封面背景图片
            if (state.coverBg1 && blurBgImage1) {
              blurBgImage1.src = state.coverBg1;
            }
            if (state.coverBg2 && blurBgImage2) {
              blurBgImage2.src = state.coverBg2;
            }
            
            // 检查封面背景是否有效（必须是 data URL，blob URL 重启后会失效）
            const hasValidCoverBg = (state.coverBg1 && state.coverBg1.startsWith('data:')) || 
                                   (state.coverBg2 && state.coverBg2.startsWith('data:'));
            
            // 检查桌面背景是否有效
            const hasValidDesktopBg = (state.desktopBg1 && state.desktopBg1.startsWith('data:')) || 
                                     (state.desktopBg2 && state.desktopBg2.startsWith('data:'));
            
            // 根据背景模式决定显示哪个背景
            // 如果封面模式但封面背景无效，回退到桌面背景
            const shouldShowCover = state.backgroundMode === 'cover' && 
                                    state.currentSong?.coverUrl && 
                                    hasValidCoverBg;
            
            if (shouldShowCover) {
              // 显示封面背景
              if (desktopBgImage1) desktopBgImage1.classList.remove('active');
              if (desktopBgImage2) desktopBgImage2.classList.remove('active');
              
              const activeCover = activeCoverIndex === 1 ? blurBgImage1 : blurBgImage2;
              if (activeCover && activeCover.src && activeCover.src.startsWith('data:')) {
                // 立即显示，即使图片还在加载
                activeCover.classList.add('active');
                
                // 添加错误处理，如果封面背景加载失败，回退到桌面背景
                activeCover.onerror = () => {
                  console.warn('封面背景加载失败，回退到桌面背景');
                  activeCover.classList.remove('active');
                  // 回退到桌面背景
                  if (hasValidDesktopBg) {
                    const activeDesktop = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
                    if (activeDesktop && activeDesktop.src && activeDesktop.src.startsWith('data:')) {
                      activeDesktop.classList.add('active');
                    }
                  }
                  // 如果桌面背景也无效，需要捕获新背景
                  if (!hasValidDesktopBg && window.electronAPI) {
                    captureBackground();
                  }
                  activeCover.onerror = null;
                };
              } else {
                // 封面背景无效，回退到桌面背景
                if (hasValidDesktopBg) {
                  const activeDesktop = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
                  if (activeDesktop && activeDesktop.src && activeDesktop.src.startsWith('data:')) {
                    activeDesktop.classList.add('active');
                  }
                }
              }
            } else {
              // 显示桌面背景（封面模式但封面无效，或桌面模式）
              if (blurBgImage1) blurBgImage1.classList.remove('active');
              if (blurBgImage2) blurBgImage2.classList.remove('active');
              
              const activeDesktop = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
              if (activeDesktop && activeDesktop.src && activeDesktop.src.startsWith('data:')) {
                // 立即显示，即使图片还在加载
                activeDesktop.classList.add('active');
              } else if (!hasValidDesktopBg) {
                // 桌面背景也无效，需要捕获新背景（在 onMounted 中处理）
              }
            }
            
            // 恢复播放设置
            if (state.volume !== undefined) {
              volume.value = state.volume;
            }
            if (state.isMuted !== undefined) {
              isMuted.value = state.isMuted;
            }
            if (state.playMode) {
              playMode.value = state.playMode;
            }
            
            // 恢复 UI 状态
            if (state.showPlaylist !== undefined) {
              showPlaylist.value = state.showPlaylist;
            }
            if (state.showLyrics !== undefined) {
              showLyrics.value = state.showLyrics;
            }
            
            // 恢复歌单数据
            if (state.playlists) {
              playlists.value = state.playlists;
            }
            if (state.selectedPlaylistId) {
              selectedPlaylistId.value = state.selectedPlaylistId;
            }
            if (state.allSongs) {
              allSongs.value = state.allSongs;
            }
            
            // 恢复播放列表（优先恢复保存的播放列表，而不是根据歌单更新）
            if (state.playlist && state.playlist.length > 0) {
              playlist.value = state.playlist.map((filePath, index) => ({
                filePath,
                index
              }));
            } else {
              // 如果没有保存的播放列表，才根据选中的歌单更新
              updatePlaylistFromSelected();
            }
              
            // 恢复当前歌曲和播放进度
              if (state.currentSong && state.currentIndex >= 0 && state.currentIndex < playlist.value.length) {
                currentIndex.value = state.currentIndex;
                currentSong.value = state.currentSong;
              
              // 恢复封面背景（如果当前歌曲有封面且是封面模式）
              if (state.backgroundMode === 'cover' && state.currentSong.coverUrl) {
                // 确保封面URL是data URL（持久化）
                if (state.currentSong.coverUrl.startsWith('data:')) {
                  // 更新封面背景
                  updateBlurBackground(state.currentSong.coverUrl);
                }
              }
                
                // 恢复播放位置（但不自动播放）
                initAudio(); // 确保音频元素已初始化
                if (audioElement && state.currentTime !== undefined) {
                  // 先加载音频文件
                  const fileUrl = state.currentSong.filePath.startsWith('file://') 
                    ? state.currentSong.filePath 
                    : `file:///${state.currentSong.filePath.replace(/\\/g, '/')}`;
                  audioElement.src = fileUrl;
                  audioElement.volume = volume.value;
                  audioElement.load();
                  
                  // 等待元数据加载后设置播放位置
                  audioElement.addEventListener('loadedmetadata', () => {
                    if (state.currentTime !== undefined && state.currentTime < audioElement.duration) {
                      audioElement.currentTime = state.currentTime;
                      currentTime.value = state.currentTime;
                    }
                    duration.value = audioElement.duration;
                  }, { once: true });
              }
            }
            
            return true;
          } catch (error) {
            console.warn('恢复状态失败:', error);
            return false;
          }
        };

        // 捕获背景函数，实现交叉淡入淡出
        const captureBackground = async () => {
          if (!window.electronAPI || !desktopBgImage1 || !desktopBgImage2) return;
          try {
            const desktopBg = await window.electronAPI.captureDesktopBackground();
            if (desktopBg) {
              const activeImg = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
              const inactiveImg = activeBgIndex === 1 ? desktopBgImage2 : desktopBgImage1;

              inactiveImg.onload = () => {
                activeImg.classList.remove('active');
                inactiveImg.classList.add('active');
                activeBgIndex = activeBgIndex === 1 ? 2 : 1;
                inactiveImg.onload = null; // 清理事件监听器，防止内存泄漏
                saveState(); // 保存新的背景图片
              };
              inactiveImg.src = desktopBg;
            }
          } catch (error) {
            // 忽略错误，避免在快速移动时控制台刷屏
          }
        };

        // 监听特效切换
        watch(() => currentEffectIndex.value, (newIndex) => {
          if (playEffectManager) {
            const effectName = playEffects.value[newIndex];
            playEffectManager.switchEffect(effectName);
          }
        });

        // 初始化模糊背景和窗口状态
        onMounted(async () => {
          blurBgImage1 = document.getElementById('blurBgImage1');
          blurBgImage2 = document.getElementById('blurBgImage2');
          desktopBgImage1 = document.getElementById('desktopBgImage1');
          desktopBgImage2 = document.getElementById('desktopBgImage2');
          appElement = document.getElementById('app');
          
          // 首先尝试恢复保存的状态（立即显示保存的背景，防止白屏）
          const stateRestored = await restoreState();
          
          // 初始化特效管理器并启动默认特效（等待 DOM 渲染完成）
          if (playEffectManager) {
            // 等待圆盘渲染完成
            await nextTick();
            setTimeout(() => {
              const effectName = playEffects.value[currentEffectIndex.value];
              playEffectManager.switchEffect(effectName);
            }, 300);
          }
          
          // 等待一小段时间确保背景图片开始加载
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 完全加载成功后再刷新背景（如果需要）
          if (window.electronAPI) {
            // 检查是否有有效的背景图片（必须是 data URL）
            const hasValidDesktopBg = (desktopBgImage1?.src && desktopBgImage1.src.startsWith('data:')) || 
                                     (desktopBgImage2?.src && desktopBgImage2.src.startsWith('data:'));
            const hasValidCoverBg = (blurBgImage1?.src && blurBgImage1.src.startsWith('data:')) || 
                                   (blurBgImage2?.src && blurBgImage2.src.startsWith('data:'));
            
            // 检查当前是否有背景显示
            const hasActiveBg = desktopBgImage1?.classList.contains('active') || 
                               desktopBgImage2?.classList.contains('active') || 
                               blurBgImage1?.classList.contains('active') || 
                               blurBgImage2?.classList.contains('active');
            
            // 如果没有有效的背景或没有背景显示，立即捕获桌面背景
            if (!hasValidDesktopBg && !hasValidCoverBg || !hasActiveBg) {
              try {
                const desktopBg = await window.electronAPI.captureDesktopBackground();
                if (desktopBg && desktopBgImage1) {
                  desktopBgImage1.src = desktopBg;
                  setTimeout(() => {
                    desktopBgImage1.classList.add('active');
                    activeBgIndex = 1;
                    saveState(); // 保存新捕获的背景
                  }, 100);
                }
              } catch (error) {
                console.warn('获取桌面背景失败:', error);
              }
            } else if (stateRestored && hasValidDesktopBg) {
              // 有保存的背景，等待完全加载后再刷新（如果需要）
              // 延迟刷新，确保用户看到保存的背景
              setTimeout(async () => {
                // 如果桌面背景模式是动态的，则刷新
                if (desktopBackgroundMode.value === 'dynamic') {
                  try {
                    await captureBackground();
                  } catch (error) {
                    console.warn('刷新桌面背景失败:', error);
                  }
                }
              }, 2000); // 2秒后再刷新，确保用户看到保存的背景
            }

            // 检查初始窗口状态
            window.electronAPI.isMaximized().then(maximized => {
              isMaximized.value = maximized;
              updateWindowStyle();
            });
            
            // 监听窗口状态变化（仅用于更新窗口样式）
            window.electronAPI.onWindowStateChange((maximized) => {
              isMaximized.value = maximized;
              updateWindowStyle();
            });

            // 监听窗口移动结束事件，如果处于动态模式则刷新背景
            window.electronAPI.onWindowMoveEnd(() => {
              if (desktopBackgroundMode.value === 'dynamic') {
                captureBackground();
              }
            });
          }
          
          // 注册键盘事件和状态保存
          document.addEventListener('keydown', handleKeyDown);
          document.addEventListener('click', (e) => {
            // 如果点击的是创建歌单按钮、添加到歌单菜单、创建歌单对话框、确认对话框或删除按钮，不隐藏菜单
            if (e.target.closest('.create-playlist-btn') || 
                e.target.closest('.add-to-playlist-menu') ||
                e.target.closest('.add-to-playlist-btn') ||
                e.target.closest('.create-playlist-dialog') ||
                e.target.closest('.confirm-dialog') ||
                e.target.closest('.delete-song-btn')) {
              return;
            }
            hideContextMenu();
            hideAddToPlaylistMenu();
          });
          
          // 使用 nextTick 和 watchEffect 确保按钮事件正确绑定
          let createBtnClickHandler = null;
          let createBtnMousedownHandler = null;
          
          const setupCreatePlaylistButton = () => {
            nextTick(() => {
              const createBtn = document.querySelector('.create-playlist-btn');
              
              if (createBtn) {
                // 如果已经绑定过，先移除旧的监听器
                if (createBtnClickHandler) {
                  createBtn.removeEventListener('click', createBtnClickHandler, true);
                }
                if (createBtnMousedownHandler) {
                  createBtn.removeEventListener('mousedown', createBtnMousedownHandler, true);
                }
                
                console.log('找到创建歌单按钮，绑定原生事件', createBtn);
                
                // 创建新的点击处理器
                createBtnClickHandler = (e) => {
                  console.log('原生事件监听器被触发', e);
                  e.stopPropagation();
                  e.preventDefault();
                  showCreatePlaylistDialogHandler(e);
                };
                
                // 创建新的 mousedown 处理器
                createBtnMousedownHandler = (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                };
                
                // 绑定原生点击事件（使用捕获阶段，确保优先触发）
                createBtn.addEventListener('click', createBtnClickHandler, true);
                createBtn.addEventListener('mousedown', createBtnMousedownHandler, true);
              }
            });
          };
          
          // 立即设置一次
          setupCreatePlaylistButton();
          
          // 使用 watchEffect 监听 DOM 变化，确保在每次渲染后重新绑定
          watchEffect(() => {
            // 访问响应式数据以触发 watchEffect
            const _ = playlists.value;
            setupCreatePlaylistButton();
          });
          
          // 定期保存状态（每5秒）
          const saveInterval = setInterval(() => {
            saveState();
          }, 5000);
          
          // 窗口关闭前保存状态
          window.addEventListener('beforeunload', () => {
            clearInterval(saveInterval);
            saveState();
            // 清理特效管理器
            if (playEffectManager) {
              playEffectManager.destroy();
            }
          });
        });

        // 组件卸载时清理
        onUnmounted(() => {
          if (playEffectManager) {
            playEffectManager.destroy();
          }
        });

        // 更新窗口样式
        const updateWindowStyle = () => {
          if (appElement) {
            // 使用 requestAnimationFrame 确保同步更新，避免闪烁
            requestAnimationFrame(() => {
            if (isMaximized.value) {
              appElement.classList.add('fullscreen');
                // 同时给 html 和 body 添加 fullscreen class，用于移除 clip-path 圆角
                document.documentElement.classList.add('fullscreen');
                document.body.classList.add('fullscreen');
            } else {
              appElement.classList.remove('fullscreen');
                // 移除 html 和 body 的 fullscreen class
                document.documentElement.classList.remove('fullscreen');
                document.body.classList.remove('fullscreen');
            }
            });
          }
        };

        // 切换背景模式
        const toggleBackgroundMode = () => {
          backgroundMode.value = backgroundMode.value === 'cover' ? 'desktop' : 'cover';
          // 切换后立即更新背景
          updateBlurBackground(currentSong.value?.coverUrl);
          saveState(); // 保存状态
        };

        // 切换桌面背景模式
        const toggleDesktopBackgroundMode = () => {
          desktopBackgroundMode.value = desktopBackgroundMode.value === 'locked' ? 'dynamic' : 'locked';
          saveState(); // 保存状态
        };

        // 更新模糊背景，实现封面背景的交叉淡入淡出
        const updateBlurBackground = (coverUrl) => {
          if (!blurBgImage1 || !blurBgImage2 || !desktopBgImage1 || !desktopBgImage2) return;

          const showCover = backgroundMode.value === 'cover' && coverUrl;

          if (showCover) {
            // 模式为 'cover' 且有封面：显示封面背景，隐藏两个桌面背景
            desktopBgImage1.classList.remove('active');
            desktopBgImage2.classList.remove('active');

            // 实现封面背景的交叉淡入淡出
            if (coverUrl) {
              const activeCoverImg = activeCoverIndex === 1 ? blurBgImage1 : blurBgImage2;
              const inactiveCoverImg = activeCoverIndex === 1 ? blurBgImage2 : blurBgImage1;

              inactiveCoverImg.onload = () => {
                activeCoverImg.classList.remove('active');
                inactiveCoverImg.classList.add('active');
                activeCoverIndex = activeCoverIndex === 1 ? 2 : 1;
                
                // 将封面背景转换为 data URL 保存（blob URL 重启后会失效）
                try {
                  // 创建一个临时 canvas 来转换图片为 data URL
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = inactiveCoverImg.naturalWidth || 1000;
                  canvas.height = inactiveCoverImg.naturalHeight || 1000;
                  ctx.drawImage(inactiveCoverImg, 0, 0);
                  const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                  
                  // 更新图片 src 为 data URL（这样保存状态时会保存 data URL）
                  inactiveCoverImg.src = dataURL;
                  
                  // 清理 canvas
                  canvas.width = 0;
                  canvas.height = 0;
                } catch (error) {
                  console.warn('转换封面背景为 data URL 失败:', error);
                  // 如果转换失败，至少保存当前的 src（可能是 blob URL，但总比没有好）
                }
                
                inactiveCoverImg.onload = null; // 清理事件监听器，防止内存泄漏
                saveState(); // 保存新的封面背景
              };
              
              // 设置错误处理
              inactiveCoverImg.onerror = () => {
                console.warn('封面背景加载失败');
                inactiveCoverImg.onerror = null;
                // 如果封面背景加载失败，回退到桌面背景
                inactiveCoverImg.classList.remove('active');
                const activeDesktop = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
                if (activeDesktop && activeDesktop.src) {
                  activeDesktop.classList.add('active');
                }
              };
              
              inactiveCoverImg.src = coverUrl;
            }
          } else {
            // 模式为 'desktop' 或无封面：显示当前活跃的桌面背景，隐藏封面背景
            blurBgImage1.classList.remove('active');
            blurBgImage2.classList.remove('active');

            const activeDesktopBg = activeBgIndex === 1 ? desktopBgImage1 : desktopBgImage2;
            activeDesktopBg.classList.add('active');
          }
        };

        // 计算属性
        // 过滤后的播放列表（根据搜索关键词）
        const filteredPlaylist = computed(() => {
          if (!searchKeyword.value.trim()) {
            return playlist.value;
          }
          const keyword = searchKeyword.value.trim().toLowerCase();
          return playlist.value.filter(item => {
            const fileName = item.filePath.split(/[/\\]/).pop().toLowerCase();
            return fileName.includes(keyword);
          });
        });

        const progressPercent = computed(() => {
          if (duration.value === 0) return 0;
          return (currentTime.value / duration.value) * 100;
        });

        const volumePercent = computed(() => volume.value * 100);

        const formatTime = (seconds) => {
          if (!seconds || isNaN(seconds)) return '0:00';
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // 初始化音频元素
        const initAudio = () => {
          if (!audioElement) {
            audioElement = new Audio();
            audioElement.volume = volume.value;
            // 暴露 audioElement 到 window，供特效使用
            window.audioElement = audioElement;
            
            audioElement.addEventListener('loadedmetadata', () => {
              duration.value = audioElement.duration;
            });
            
            audioElement.addEventListener('timeupdate', () => {
              if (!isDraggingProgress.value) {
                currentTime.value = audioElement.currentTime;
              }
            });
            
            audioElement.addEventListener('ended', () => {
              handleNext();
            });
            
            audioElement.addEventListener('error', (e) => {
              console.error('音频加载错误:', e);
              isLoading.value = false;
              isPlaying.value = false;
            });
            
            audioElement.addEventListener('canplay', () => {
              isLoading.value = false;
            });
          }
        };

        // 加载并播放音乐
        const loadAndPlay = async (filePath, index) => {
          try {
            if (!filePath) {
              console.error('文件路径为空');
              return;
            }
            
            isLoading.value = true;
            currentIndex.value = index;
            
            // 获取元数据（延迟加载，不阻塞UI）
            let metadata;
            try {
              metadata = window.electronAPI ? await window.electronAPI.getAudioMetadata(filePath) : {
                title: filePath.split(/[/\\]/).pop().replace(/\.[^/.]+$/, ''),
                artist: '未知艺术家',
                album: '未知专辑',
                duration: 0,
                picture: null
              };
            } catch (metaError) {
              console.warn('读取元数据失败，使用默认值:', metaError);
              metadata = {
                title: filePath.split(/[/\\]/).pop().replace(/\.[^/.]+$/, ''),
                artist: '未知艺术家',
                album: '未知专辑',
                duration: 0,
                picture: null
              };
            }
            
            // 创建对象URL用于播放
            const fileUrl = filePath.startsWith('file://') ? filePath : `file:///${filePath.replace(/\\/g, '/')}`;
            
            if (audioElement) {
              audioElement.pause();
              audioElement.src = '';
            }
            
            initAudio();
            audioElement.src = fileUrl;
            
            // 处理封面图片（转换为 data URL 以便持久化）
            let coverUrl = null;
            try {
              if (metadata.picture && metadata.picture.data) {
                // 将封面图片转换为 data URL，以便持久化保存
                const blob = new Blob([metadata.picture.data], { type: `image/${metadata.picture.format || 'jpeg'}` });
                // 使用 FileReader 转换为 data URL
                const reader = new FileReader();
                coverUrl = await new Promise((resolve, reject) => {
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            } catch (coverError) {
              console.warn('处理封面图片失败:', coverError);
            }
            
            currentSong.value = {
              ...metadata,
              filePath,
              coverUrl: coverUrl || null  // 没有封面时设为 null，coverUrl 现在是 data URL
            };
            
            // 更新模糊背景（平滑过渡）- 有封面时显示封面模糊背景
            updateBlurBackground(coverUrl);
            
            // 加载歌词（从元数据中读取内嵌歌词）
            if (metadata.lyrics) {
              lyrics.value = parseLRC(metadata.lyrics);
              currentLyricIndex.value = -1;
            } else {
              // 如果没有内嵌歌词，尝试从外部 .lrc 文件读取
              await loadLyrics(filePath);
            }
            
            // 延迟保存状态，等待封面背景加载完成
            setTimeout(() => {
              saveState();
            }, 1000);
            
            await audioElement.load();
            await play();
          } catch (error) {
            console.error('加载音乐失败:', error);
            isLoading.value = false;
            isPlaying.value = false;
            // 确保UI不会因为错误而消失
            if (!currentSong.value) {
              currentSong.value = {
                title: '加载失败',
                artist: '请重试',
                album: '',
                filePath: '',
                coverUrl: null
              };
            }
          }
        };

        // 播放控制
        const play = async () => {
          if (!audioElement || !currentSong.value) return;
          try {
            await audioElement.play();
            isPlaying.value = true;
            startProgressUpdate();
          } catch (error) {
            console.error('播放失败:', error);
            isPlaying.value = false;
          }
        };

        const pause = () => {
          if (audioElement) {
            audioElement.pause();
            isPlaying.value = false;
            stopProgressUpdate();
          }
        };

        const togglePlay = () => {
          if (!currentSong.value) {
            if (playlist.value.length > 0) {
              loadAndPlay(playlist.value[0].filePath, 0);
            }
            return;
          }
          
          if (isPlaying.value) {
            pause();
          } else {
            play();
          }
        };

        const stop = () => {
          if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            isPlaying.value = false;
            currentTime.value = 0;
            stopProgressUpdate();
          }
        };

        // 解析 LRC 歌词文件
        const parseLRC = (lrcContent) => {
          const lines = lrcContent.split('\n');
          const lyricsList = [];
          
          // 匹配时间标签的正则表达式 [mm:ss.xx] 或 [mm:ss]
          const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
          
          lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // 匹配所有时间标签
            const timeTags = [];
            let match;
            while ((match = timeRegex.exec(line)) !== null) {
              const minutes = parseInt(match[1], 10);
              const seconds = parseInt(match[2], 10);
              const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
              const time = minutes * 60 + seconds + milliseconds / 1000;
              timeTags.push(time);
            }
            
            // 获取歌词文本（移除所有时间标签）
            const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
            
            // 如果有时间标签和歌词文本，添加到列表
            if (timeTags.length > 0 && text) {
              timeTags.forEach(time => {
                lyricsList.push({ time, text });
              });
            }
          });
          
          // 按时间排序
          lyricsList.sort((a, b) => a.time - b.time);
          
          return lyricsList;
        };

        // 加载歌词文件
        const loadLyrics = async (filePath) => {
          try {
            if (!window.electronAPI) {
              lyrics.value = [];
              currentLyricIndex.value = -1;
              return;
            }
            
            const result = await window.electronAPI.readLyricsFile(filePath);
            if (result.success && result.content) {
              lyrics.value = parseLRC(result.content);
              currentLyricIndex.value = -1;
            } else {
              lyrics.value = [];
              currentLyricIndex.value = -1;
            }
          } catch (error) {
            console.warn('加载歌词失败:', error);
            lyrics.value = [];
            currentLyricIndex.value = -1;
          }
        };

        // 更新当前歌词索引
        const updateCurrentLyric = () => {
          if (lyrics.value.length === 0) {
            currentLyricIndex.value = -1;
            return;
          }
          
          const currentTimeValue = currentTime.value;
          
          // 找到当前时间对应的歌词索引
          let index = -1;
          for (let i = lyrics.value.length - 1; i >= 0; i--) {
            if (currentTimeValue >= lyrics.value[i].time) {
              index = i;
              break;
            }
          }
          
          if (index !== currentLyricIndex.value) {
            currentLyricIndex.value = index;
            // 滚动到当前歌词
            nextTick(() => {
              const lyricElement = document.querySelector(`.lyric-line[data-index="${index}"]`);
              if (lyricElement) {
                lyricElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            });
          }
        };

        // 进度更新
        const startProgressUpdate = () => {
          if (progressUpdateInterval) return;
          progressUpdateInterval = setInterval(() => {
            if (audioElement && !isDraggingProgress.value) {
              currentTime.value = audioElement.currentTime;
              // 更新当前歌词索引
              updateCurrentLyric();
            }
          }, 100);
        };

        const stopProgressUpdate = () => {
          if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
            progressUpdateInterval = null;
          }
        };

        // 上一首/下一首
        const handlePrevious = () => {
          if (playlist.value.length === 0) return;
          let newIndex = currentIndex.value - 1;
          if (newIndex < 0) newIndex = playlist.value.length - 1;
          loadAndPlay(playlist.value[newIndex].filePath, newIndex);
        };

        const handleNext = () => {
          if (playlist.value.length === 0) return;
          let newIndex;
          if (playMode.value === 'random') {
            newIndex = Math.floor(Math.random() * playlist.value.length);
          } else {
            newIndex = currentIndex.value + 1;
            if (newIndex >= playlist.value.length) {
              if (playMode.value === 'loop') {
                newIndex = 0;
              } else {
                stop();
                return;
              }
            }
          }
          loadAndPlay(playlist.value[newIndex].filePath, newIndex);
        };

        // 选择文件夹
        const selectFolder = async () => {
          try {
            if (!window.electronAPI) {
              alert('electronAPI 未加载');
              return;
            }
            const result = await window.electronAPI.selectMusicFolder();
            if (result && result.files && result.files.length > 0) {
              // 保存当前音乐文件夹路径
              currentMusicFolderPath.value = result.folderPath;
              
              // 检查是否有状态文件需要恢复
              if (result.stateData) {
                try {
                  // 恢复状态数据
                  await restoreStateFromData(result.stateData);
                  console.log('从状态文件恢复成功');
                } catch (error) {
                  console.warn('从状态文件恢复失败:', error);
                  // 恢复失败，继续使用新选择的文件
                }
              }
              
              // 更新本地音乐列表
              allSongs.value = result.files;
              // 如果当前选中的是本地音乐，更新播放列表
              if (selectedPlaylistId.value === 'local') {
                playlist.value = result.files.map((filePath, index) => ({
                  filePath,
                  index
                }));
              }
              saveState(); // 保存播放列表
            }
          } catch (error) {
            console.error('选择文件夹失败:', error);
            alert('选择文件夹失败: ' + error.message);
          }
        };

        // 选择单个文件
        const selectFile = async () => {
          if (!window.electronAPI) {
            alert('electronAPI 未加载');
            return;
          }
          const filePath = await window.electronAPI.selectMusicFile();
          if (filePath) {
            playlist.value = [{ filePath, index: 0 }];
            loadAndPlay(filePath, 0);
          }
        };

        // 进度条控制 - 拖动时不暂停
        const handleProgressClick = (e) => {
          if (!audioElement || !duration.value) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          const newTime = percent * duration.value;
          audioElement.currentTime = newTime;
          currentTime.value = newTime;
        };

        const handleProgressDragStart = (e) => {
          isDraggingProgress.value = true;
        };

        const handleProgressDrag = (e) => {
          if (!audioElement || !duration.value || !isDraggingProgress.value) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const newTime = percent * duration.value;
          currentTime.value = newTime;
        };

        const handleProgressDragEnd = (e) => {
          if (audioElement && isDraggingProgress.value) {
            audioElement.currentTime = currentTime.value;
            isDraggingProgress.value = false;
            saveState(); // 保存播放位置
          }
        };

        // 音量控制 - 支持滚轮
        const setVolumeValue = (newVolume) => {
          volume.value = Math.max(0, Math.min(1, newVolume));
          if (audioElement) {
            audioElement.volume = volume.value;
          }
          isMuted.value = volume.value === 0;
          saveState(); // 保存音量设置
        };

        const handleVolumeClick = (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          setVolumeValue(percent);
        };

        const handleVolumeWheel = (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          setVolumeValue(volume.value + delta);
        };

        const toggleMute = () => {
          if (isMuted.value) {
            setVolumeValue(0.7);
          } else {
            setVolumeValue(0);
          }
        };

        // 切换播放模式
        const togglePlayMode = () => {
          const modes = ['sequence', 'loop', 'random'];
          const current = modes.indexOf(playMode.value);
          playMode.value = modes[(current + 1) % modes.length];
          saveState(); // 保存播放模式
        };

        // 从播放列表选择
        const selectFromPlaylist = (index) => {
          loadAndPlay(playlist.value[index].filePath, index);
        };

        // 歌单相关函数
        // 根据选中的歌单更新播放列表
        const updatePlaylistFromSelected = () => {
          if (selectedPlaylistId.value === 'local') {
            // 显示本地音乐
            playlist.value = allSongs.value.map((filePath, index) => ({
              filePath,
              index
            }));
          } else {
            // 显示选中歌单的音乐
            const selectedPlaylist = playlists.value.find(p => p.id === selectedPlaylistId.value);
            if (selectedPlaylist) {
              playlist.value = selectedPlaylist.songs.map((filePath, index) => ({
                filePath,
                index
              }));
            } else {
              playlist.value = [];
            }
          }
          saveState();
        };

        // 切换歌单
        const selectPlaylist = (playlistId) => {
          selectedPlaylistId.value = playlistId;
          updatePlaylistFromSelected();
        };

        // 显示创建歌单对话框
        const showCreatePlaylistDialogHandler = (e) => {
          console.log('showCreatePlaylistDialogHandler 被调用', e);
          if (e) {
            e.stopPropagation();
            e.preventDefault();
          }
          newPlaylistNameInput.value = '';
          showCreatePlaylistDialog.value = true;
          // 使用 nextTick 确保输入框获得焦点
          nextTick(() => {
            const input = document.querySelector('.create-playlist-input');
            if (input) {
              input.focus();
              input.select();
            }
          });
        };

        // 确认创建歌单
        const confirmCreatePlaylist = () => {
          const name = newPlaylistNameInput.value.trim();
          if (name) {
            const newPlaylist = {
              id: Date.now().toString(),
              name: name,
              songs: []
            };
            playlists.value.push(newPlaylist);
            selectedPlaylistId.value = newPlaylist.id;
            updatePlaylistFromSelected();
            saveState();
            console.log('歌单创建成功:', newPlaylist);
            showCreatePlaylistDialog.value = false;
            newPlaylistNameInput.value = '';
          }
        };

        // 取消创建歌单
        const cancelCreatePlaylist = () => {
          showCreatePlaylistDialog.value = false;
          newPlaylistNameInput.value = '';
        };

        // 显示确认对话框
        const showConfirmDialogHandler = (title, message, callback) => {
          confirmDialogTitle.value = title;
          confirmDialogMessage.value = message;
          confirmDialogCallback.value = callback;
          showConfirmDialog.value = true;
        };

        // 确认对话框确认
        const confirmDialogConfirm = () => {
          if (confirmDialogCallback.value) {
            confirmDialogCallback.value();
          }
          showConfirmDialog.value = false;
          confirmDialogCallback.value = null;
        };

        // 确认对话框取消
        const confirmDialogCancel = () => {
          showConfirmDialog.value = false;
          confirmDialogCallback.value = null;
        };

        // 删除歌单
        const deletePlaylist = (playlistId, e) => {
          e.stopPropagation();
          const playlist = playlists.value.find(p => p.id === playlistId);
          const playlistName = playlist ? playlist.name : '这个歌单';
          showConfirmDialogHandler(
            '删除歌单',
            `确定要删除"${playlistName}"吗？此操作不可恢复。`,
            () => {
              playlists.value = playlists.value.filter(p => p.id !== playlistId);
              if (selectedPlaylistId.value === playlistId) {
                selectedPlaylistId.value = 'local';
              }
              updatePlaylistFromSelected();
              saveState();
            }
          );
        };

        // 删除歌曲
        const deleteSong = (index, e) => {
          e.stopPropagation();
          if (!playlist.value[index]) return;
          
          const item = playlist.value[index];
          const songName = item.filePath.split(/[/\\]/).pop();
          const filePath = item.filePath;
          
          if (selectedPlaylistId.value === 'local') {
            // 从本地音乐删除
            showConfirmDialogHandler(
              '删除歌曲',
              `确定要从本地音乐中移除"${songName}"吗？`,
              () => {
                try {
                  // 先保存当前索引，用于后续调整
                  const oldIndex = currentIndex.value;
                  
                  // 从 allSongs 中删除
                  allSongs.value = allSongs.value.filter(fp => fp !== filePath);
                  
                  // 如果删除的是当前播放的歌曲，停止播放
                  if (oldIndex === index) {
                    if (audioElement) {
                      audioElement.pause();
                      audioElement.src = '';
                    }
                    currentSong.value = null;
                    currentIndex.value = -1;
                    isPlaying.value = false;
                  } else if (oldIndex > index) {
                    // 如果删除的歌曲在当前播放歌曲之前，调整索引
                    currentIndex.value = oldIndex - 1;
                  }
                  
                  // 重新生成播放列表（从更新后的 allSongs）
                  updatePlaylistFromSelected();
                  saveState();
                } catch (error) {
                  console.error('删除歌曲失败:', error);
                }
              }
            );
          } else {
            // 从自定义歌单删除
            const targetPlaylist = playlists.value.find(p => p.id === selectedPlaylistId.value);
            if (targetPlaylist) {
              showConfirmDialogHandler(
                '移除歌曲',
                `确定要从"${targetPlaylist.name}"中移除"${songName}"吗？`,
                () => {
                  try {
                    // 先保存当前索引，用于后续调整
                    const oldIndex = currentIndex.value;
                    
                    // 从歌单的 songs 数组中删除
                    targetPlaylist.songs = targetPlaylist.songs.filter(fp => fp !== filePath);
                    
                    // 如果删除的是当前播放的歌曲，停止播放
                    if (oldIndex === index) {
                      if (audioElement) {
                        audioElement.pause();
                        audioElement.src = '';
                      }
                      currentSong.value = null;
                      currentIndex.value = -1;
                      isPlaying.value = false;
                    } else if (oldIndex > index) {
                      // 如果删除的歌曲在当前播放歌曲之前，调整索引
                      currentIndex.value = oldIndex - 1;
                    }
                    
                    // 重新生成播放列表（从更新后的歌单）
                    updatePlaylistFromSelected();
                    saveState();
                  } catch (error) {
                    console.error('移除歌曲失败:', error);
                  }
                }
              );
            }
          }
        };

        // 显示浮动面板
        const showFloatingPanel = (e, item) => {
          if (!floatingPanelState) return;
          e.stopPropagation();
          // 获取整个播放列表项的 rect，而不是标题的 rect
          const playlistItem = e.currentTarget.closest('.playlist-item');
          const rect = playlistItem ? playlistItem.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
          const songName = item.filePath.split(/[/\\]/).pop();
          floatingPanelState.open(rect, songName, item);
          floatingPanelOpen.value = true;
          floatingPanelUpdateTrigger.value++;
        };

        // 添加歌曲到歌单
        const addSongToPlaylist = (playlistId, song) => {
          if (!song) return;
          const targetPlaylist = playlists.value.find(p => p.id === playlistId);
          if (targetPlaylist) {
            const filePath = song.filePath;
            if (!targetPlaylist.songs.includes(filePath)) {
              targetPlaylist.songs.push(filePath);
              saveState();
            }
          }
        };

        // 删除歌曲（适配浮动面板）
        const deleteSongFromFloatingPanel = (song) => {
          if (!song) return;
          const index = playlist.value.findIndex(item => item.filePath === song.filePath);
          if (index === -1) return;
          
          const songName = song.filePath.split(/[/\\]/).pop();
          const filePath = song.filePath;
          
          if (selectedPlaylistId.value === 'local') {
            // 从本地音乐删除
            showConfirmDialogHandler(
              '删除歌曲',
              `确定要从本地音乐中移除"${songName}"吗？`,
              () => {
                try {
                  const oldIndex = currentIndex.value;
                  allSongs.value = allSongs.value.filter(fp => fp !== filePath);
                  
                  if (oldIndex === index) {
                    if (audioElement) {
                      audioElement.pause();
                      audioElement.src = '';
                    }
                    currentSong.value = null;
                    currentIndex.value = -1;
                    isPlaying.value = false;
                  } else if (oldIndex > index) {
                    currentIndex.value = oldIndex - 1;
                  }
                  
                  updatePlaylistFromSelected();
                  saveState();
                } catch (error) {
                  console.error('删除歌曲失败:', error);
                }
              }
            );
          } else {
            // 从自定义歌单删除
            const targetPlaylist = playlists.value.find(p => p.id === selectedPlaylistId.value);
            if (targetPlaylist) {
              showConfirmDialogHandler(
                '移除歌曲',
                `确定要从"${targetPlaylist.name}"中移除"${songName}"吗？`,
                () => {
                  try {
                    const oldIndex = currentIndex.value;
                    targetPlaylist.songs = targetPlaylist.songs.filter(fp => fp !== filePath);
                    
                    if (oldIndex === index) {
                      if (audioElement) {
                        audioElement.pause();
                        audioElement.src = '';
                      }
                      currentSong.value = null;
                      currentIndex.value = -1;
                      isPlaying.value = false;
                    } else if (oldIndex > index) {
                      currentIndex.value = oldIndex - 1;
                    }
                    
                    updatePlaylistFromSelected();
                    saveState();
                  } catch (error) {
                    console.error('移除歌曲失败:', error);
                  }
                }
              );
            }
          }
        };


        // 窗口控制
        const handleWindowControl = (action) => {
          if (window.electronAPI) {
            window.electronAPI.send('window-control', action);
          }
        };

        // 右键菜单
        const showContextMenu = (e, item, index) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          contextMenuVisible.value = true;
          contextMenuX.value = e.clientX;
          contextMenuY.value = e.clientY;
          contextMenuItem.value = { item, index };
        };

        const hideContextMenu = () => {
          contextMenuVisible.value = false;
        };

        const handleContextMenuAction = (action) => {
          if (!contextMenuItem.value) return;
          const { item, index } = contextMenuItem.value;
          
          switch(action) {
            case 'play':
              selectFromPlaylist(index);
              break;
            case 'add-to-queue':
              // 添加到队列（可以扩展）
              break;
            case 'locate':
              // 定位文件（可以扩展）
              if (window.electronAPI) {
                window.electronAPI.send('locate-file', item.filePath);
              }
              break;
          }
          hideContextMenu();
        };

        // 键盘快捷键
        const handleKeyDown = (e) => {
          // 空格键播放/暂停
          if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            togglePlay();
          }
          // 左方向键上一首
          else if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            handlePrevious();
          }
          // 右方向键下一首
          else if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            handleNext();
          }
          // 上方向键增加音量
          else if (e.code === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            setVolumeValue(Math.min(1, volume.value + 0.1));
          }
          // 下方向键降低音量
          else if (e.code === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            setVolumeValue(Math.max(0, volume.value - 0.1));
          }
        };

        onUnmounted(() => {
          document.removeEventListener('keydown', handleKeyDown);
          // 注意：全局 click 监听器使用匿名函数，无法直接移除
          stopProgressUpdate();
          saveState(); // 组件卸载前保存状态
          // 清理特效管理器
          if (playEffectManager) {
            playEffectManager.destroy();
          }
          if (audioElement) {
            audioElement.pause();
            audioElement.src = '';
          }
        });

        // 渲染函数
        return () => h('div', { id: 'app-container' }, [
          // 标题栏
          h('div', { class: 'title-bar' }, [
            h('div', { 
              class: 'title-text',
              style: { cursor: 'pointer', userSelect: 'none' },
              onClick: () => {
                const wasExpanded = showSidebar.value;
                showSidebar.value = !showSidebar.value;
                // 触发旋转动画
                if (!isRotating.value) {
                  isRotating.value = true;
                  // 展开时顺时针，收起时逆时针
                  logoRotation.value = wasExpanded 
                    ? logoRotation.value - 360  // 收起：逆时针
                    : logoRotation.value + 360;  // 展开：顺时针
                  setTimeout(() => {
                    isRotating.value = false;
                  }, 500); // 动画持续时间
                }
              },
              title: showSidebar.value ? '点击收起侧边栏' : '点击展开侧边栏'
            }, [
              h('img', {
                src: 'logo.png',
                class: 'app-logo',
                style: {
                  width: '20px',
                  height: '20px',
                  marginRight: '8px',
                  transform: `rotate(${logoRotation.value}deg)`,
                  transition: isRotating.value ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }
              }),
              h('span', null, 'Listen Two'),
              
            ]),
            h('div', { class: 'title-controls' }, [
              h('button', {
                class: 'control-btn minimize',
                onClick: () => handleWindowControl('minimize'),
                title: '最小化'
              }),
              h('button', {
                class: 'control-btn maximize',
                onClick: () => handleWindowControl('maximize'),
                title: '最大化/还原'
              }),
              h('button', {
                class: 'control-btn close',
                onClick: () => handleWindowControl('close'),
                title: '关闭'
              })
            ])
          ]),
          
          // 主内容区
          h('div', { class: 'main-content' }, [
            // 左侧边栏：歌单列表
            h('div', { class: ['sidebar', { 'collapsed': !showSidebar.value }] }, [
              h('div', { class: 'sidebar-header' }, [
                h('h3', null, '歌单'),
                h('div', { style: 'display: flex; gap: 8px; align-items: center;' }, [
                  h('button', {
                    class: 'create-playlist-btn',
                    onClick: (e) => {
                      console.log('按钮 onClick 被触发', e);
                      e.stopPropagation();
                      e.preventDefault();
                      showCreatePlaylistDialogHandler(e);
                      return false;
                    },
                    onMousedown: (e) => {
                      console.log('按钮 onMousedown 被触发', e);
                      e.stopPropagation();
                      e.preventDefault();
                    },
                    title: '创建歌单',
                    type: 'button'
                  }, '+'),
                  h('button', {
                    class: 'export-playlist-btn',
                    onClick: async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      await exportStateToFile();
                      return false;
                    },
                    title: '导出歌单和状态',
                    type: 'button',
                    style: {
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }
                  }, '💾')
                ])
              ]),
              h('div', { class: 'sidebar-content' }, [
                h('div', {
                  class: ['playlist-item-sidebar', { 'active': selectedPlaylistId.value === 'local' }],
                  onClick: () => selectPlaylist('local')
                }, [
                  h('span', { class: 'playlist-icon' }, '🎵'),
                  h('span', { class: 'playlist-name' }, '本地音乐'),
                  h('span', { class: 'playlist-count' }, `(${allSongs.value.length})`)
                ]),
                ...playlists.value.map(p => 
                  h('div', {
                    key: `playlist-${p.id}`,
                    class: ['playlist-item-sidebar', { 'active': selectedPlaylistId.value === p.id }],
                    onClick: () => selectPlaylist(p.id)
                  }, [
                    h('span', { class: 'playlist-icon' }, '📋'),
                    h('span', { class: 'playlist-name' }, p.name),
                    h('span', { class: 'playlist-count' }, `(${p.songs.length})`),
                    h('button', {
                      class: 'delete-playlist-btn',
                      onClick: (e) => deletePlaylist(p.id, e),
                      title: '删除歌单'
                    }, '×')
                  ])
                )
              ]),
              // 设置项：显示/隐藏歌词栏和背景模式
              h('div', { 
                class: 'sidebar-settings',
                style: 'margin-top: auto; padding: 12px; border-top: 1px solid var(--glass-border);'
              }, [
                h('div', {
                  class: 'playlist-item-sidebar',
                  style: 'cursor: pointer;',
                  onClick: () => {
                    showLyrics.value = !showLyrics.value;
                    saveState();
                  }
                }, [
                  h('span', { class: 'playlist-icon' }, showLyrics.value ? '👁️' : '👁️‍🗨️'),
                  h('span', { class: 'playlist-name' }, showLyrics.value ? '显示歌词' : '隐藏歌词')
                ]),
                h('div', {
                  class: 'playlist-item-sidebar',
                  style: 'cursor: pointer;',
                  onClick: () => {
                    toggleBackgroundMode();
                    saveState();
                  }
                }, [
                  h('span', { class: 'playlist-icon' }, backgroundMode.value === 'cover' ? '🖼️' : '🖥️'),
                  h('span', { class: 'playlist-name' }, backgroundMode.value === 'cover' ? '封面背景' : '桌面背景')
                ]),
                // 播放特效选项
                h('div', {
                  class: 'play-effect-item',
                  onWheel: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const delta = e.deltaY > 0 ? 1 : -1;
                    const newIndex = (currentEffectIndex.value + delta + playEffects.value.length) % playEffects.value.length;
                    currentEffectIndex.value = newIndex;
                    effectListOffset.value += delta;
                  }
                }, [
                  h('span', { class: 'playlist-icon' }, '✨'),
                  h('span', { class: 'playlist-name' }, '播放特效'),
                  h('div', {
                    class: 'effect-selector',
                    style: {
                      overflow: 'hidden',
                      height: '24px',
                      position: 'relative',
                      flex: 1,
                      minWidth: 0
                    }
                  }, [
                    h('div', {
                      class: 'effect-list',
                      ref: (el) => { effectListRef.value = el; },
                      style: {
                        position: 'relative',
                        height: '100%',
                        transform: `translateY(${-effectListOffset.value * 24}px)`,
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      },
                      onTransitionend: () => {
                        // 当动画结束后，如果位置超出中间组范围，无缝重置到中间组（无动画）
                        if (effectListRef.value) {
                          const middleGroupStart = playEffects.value.length;
                          const middleGroupEnd = playEffects.value.length * 2 - 1;
                          
                          if (effectListOffset.value < middleGroupStart) {
                            // 超出上边界，重置到中间组
                            effectListOffset.value += playEffects.value.length;
                            // 使用 nextTick 确保 Vue 更新后再操作 DOM
                            nextTick(() => {
                              if (effectListRef.value) {
                                // 移除transition，立即设置新位置
                                effectListRef.value.style.transition = 'none';
                                effectListRef.value.style.transform = `translateY(${-effectListOffset.value * 24}px)`;
                                // 强制重排，然后恢复过渡
                                void effectListRef.value.offsetHeight;
                                effectListRef.value.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                              }
                            });
                          } else if (effectListOffset.value > middleGroupEnd) {
                            // 超出下边界，重置到中间组
                            effectListOffset.value -= playEffects.value.length;
                            // 使用 nextTick 确保 Vue 更新后再操作 DOM
                            nextTick(() => {
                              if (effectListRef.value) {
                                // 移除transition，立即设置新位置
                                effectListRef.value.style.transition = 'none';
                                effectListRef.value.style.transform = `translateY(${-effectListOffset.value * 24}px)`;
                                // 强制重排，然后恢复过渡
                                void effectListRef.value.offsetHeight;
                                effectListRef.value.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                              }
                            });
                          }
                        }
                      }
                    }, [
                      // 渲染三组特效以实现无缝循环（前一组、当前组、后一组）
                      ...Array.from({ length: 3 }, (_, groupIndex) => 
                        playEffects.value.map((effect, index) => {
                          const virtualIndex = index + groupIndex * playEffects.value.length;
                          const actualIndex = index;
                          const isActive = actualIndex === currentEffectIndex.value;
                          
                          // 计算与当前索引的距离（考虑循环）
                          const currentVirtualIndex = currentEffectIndex.value + playEffects.value.length;
                          let distance = Math.abs(virtualIndex - currentVirtualIndex);
                          distance = Math.min(distance, playEffects.value.length - distance);
                          
                          // 计算缩放和透明度（距离越远，越小越虚）
                          const scale = isActive ? 1 : Math.max(0.75, 1 - distance * 0.12);
                          const opacity = isActive ? 1 : Math.max(0.4, 1 - distance * 0.3);
                          
                          return h('div', {
                            key: `effect-${groupIndex}-${index}`,
                            class: 'effect-name',
                            style: {
                              position: 'absolute',
                              right: 0,
                              top: `${virtualIndex * 24}px`,
                              height: '24px',
                              lineHeight: '24px',
                              fontSize: '14px',
                              fontFamily: 'inherit',
                              opacity: opacity,
                              transform: `scale(${scale})`,
                              transformOrigin: 'right center',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              whiteSpace: 'nowrap',
                              fontWeight: isActive ? 600 : 400,
                              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                              userSelect: 'none',
                              pointerEvents: 'none'
                            }
                          }, effect);
                        })
                      ).flat()
                    ])
                  ])
                ])
              ])
            ]),
            // 中间：专辑封面和歌曲信息
            h('div', { class: 'left-panel' }, [
              h('div', { class: 'album-card' }, 
                currentSong.value?.coverUrl
                  ? h('img', {
                      class: ['album-art', { 'rotating': isPlaying.value }],
                      src: currentSong.value.coverUrl,
                      alt: '专辑封面'
                    })
                  : h('div', {
                      class: ['vinyl-record', { 'rotating': isPlaying.value }]
                    })
              ),
              showLyrics.value && h('div', { class: 'song-info-card' }, [
                // 歌词显示区域（只显示歌词，不显示歌曲信息）
                h('div', { class: 'lyrics-container' }, 
                  lyrics.value.length > 0
                    ? lyrics.value.map((lyric, index) => 
                        h('div', {
                          key: `lyric-${index}`,
                          class: ['lyric-line', { 'active': index === currentLyricIndex.value }],
                          'data-index': index
                        }, lyric.text)
                      )
                    : h('div', { class: 'lyrics-empty' }, '暂无歌词')
                )
              ])
            ]),
            
            // 右侧：播放列表
            h('div', { class: ['right-panel', { 'collapsed': !showPlaylist.value }] }, [
              h('div', { class: 'playlist-header' }, [
                h('h3', null, '播放列表'),
                showPlaylist.value ? h('input', {
                  type: 'text',
                  class: 'search-input',
                  placeholder: '搜索歌曲...',
                  value: searchKeyword.value,
                  onInput: (e) => searchKeyword.value = e.target.value,
                  onKeydown: (e) => {
                    if (e.key === 'Escape') {
                      searchKeyword.value = '';
                      e.target.blur();
                    }
                  }
                }) : null,
                h('button', {
                  class: 'toggle-playlist',
                  onClick: () => showPlaylist.value = !showPlaylist.value
                }, showPlaylist.value ? '◀' : '▶')
              ]),
              h('div', { class: 'playlist-content' }, 
                playlist.value.length === 0 
                  ? h('div', { class: 'empty-playlist' }, [
                      h('p', null, '🎵 播放列表为空'),
                      h('button', { class: 'select-btn', onClick: selectFolder }, '选择文件夹'),
                      h('button', { class: 'select-btn', onClick: selectFile }, '选择文件')
                    ])
                  : filteredPlaylist.value.length === 0 && searchKeyword.value.trim()
                    ? h('div', { class: 'empty-playlist' }, [
                        h('p', null, `🔍 未找到包含"${searchKeyword.value}"的歌曲`)
                      ])
                    : filteredPlaylist.value.map((item, filteredIndex) => {
                        // 使用原始索引，而不是过滤后的索引
                        const originalIndex = item.index;
                        return h('div', {
                          key: `playlist-${originalIndex}`,
                          class: ['playlist-item', { 'active': originalIndex === currentIndex.value }],
                          onContextmenu: (e) => showContextMenu(e, item, originalIndex)
                      }, [
                        h('button', {
                          class: 'play-hover-btn',
                          onClick: (e) => {
                            e.stopPropagation();
                              selectFromPlaylist(originalIndex);
                          }
                        }, '▶'),
                          h('span', { class: 'playlist-index' }, originalIndex + 1),
                        h('span', { 
                          class: 'playlist-title',
                          style: 'cursor: pointer;',
                          onClick: (e) => showFloatingPanel(e, item)
                        }, item.filePath.split(/[/\\]/).pop())
                        ]);
                      })
              )
            ])
          ]),
          
          // 底部：控制栏
          h('div', { class: 'control-bar' }, [
            // 播放控制按钮
            h('div', { class: 'play-controls' }, [
              h('button', {
                class: 'control-button',
                onClick: togglePlayMode,
                title: playMode.value === 'sequence' ? '顺序播放' : playMode.value === 'loop' ? '循环播放' : '随机播放'
              }, playMode.value === 'sequence' ? '⇢' : playMode.value === 'loop' ? '⟲' : '⇄'),
              h('button', {
                class: 'control-button prev',
                onClick: handlePrevious,
                disabled: playlist.value.length === 0,
                title: '上一首 (Ctrl+←)'
              }, '⏴'),
              h('button', {
                class: ['control-button', 'play-pause', { 'loading': isLoading.value }],
                onClick: togglePlay,
                disabled: !currentSong.value && playlist.value.length === 0,
                title: '播放/暂停 (空格)'
              }, isLoading.value ? '◐' : isPlaying.value ? '⏸' : '▶'),
              h('button', {
                class: 'control-button next',
                onClick: handleNext,
                disabled: playlist.value.length === 0,
                title: '下一首 (Ctrl+→)'
              }, '⏵'),
              h('button', {
                class: 'control-button',
                onClick: selectFolder,
                title: '添加文件夹'
              }, '📁'),
              h('button', {
                class: ['control-button', { 'active': desktopBackgroundMode.value === 'dynamic' }],
                onClick: toggleDesktopBackgroundMode,
                title: '切换桌面背景刷新模式 (动态/锁定)'
              }, desktopBackgroundMode.value === 'dynamic' ? '🔄' : '🔒')
            ]),
            
            // 进度条
            h('div', { class: 'progress-section' }, [
              h('span', { class: 'time-display' }, formatTime(currentTime.value)),
              h('div', {
                class: 'progress-bar',
                onClick: handleProgressClick,
                onMousedown: handleProgressDragStart,
                onMousemove: handleProgressDrag,
                onMouseup: handleProgressDragEnd,
                onMouseleave: handleProgressDragEnd
              }, [
                h('div', { class: 'progress-track' }),
                h('div', {
                  class: 'progress-fill',
                  style: { width: `${progressPercent.value}%` }
                }),
                h('div', {
                  class: 'progress-handle',
                  style: { left: `${progressPercent.value}%` }
                })
              ]),
              h('span', { class: 'time-display' }, formatTime(duration.value))
            ]),
            
            // 音量控制
            h('div', { class: 'volume-section' }, [
              h('button', {
                class: 'control-button',
                onClick: toggleMute,
                title: isMuted.value ? '取消静音' : '静音'
              }, isMuted.value ? '🔇' : '🔊'),
              h('div', {
                class: 'volume-bar',
                onClick: handleVolumeClick,
                onWheel: handleVolumeWheel,
                onMousemove: (e) => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setVolumeValue(percent);
                  }
                }
              }, [
                h('div', { class: 'volume-track' }),
                h('div', {
                  class: 'volume-fill',
                  style: { width: `${volumePercent.value}%` }
                })
              ]),
              h('span', { class: 'volume-text' }, `${Math.round(volumePercent.value)}%`)
            ])
          ]),
          
          // 右键菜单
          h('div', {
            class: ['context-menu', { 'visible': contextMenuVisible.value }],
            style: {
              left: `${contextMenuX.value}px`,
              top: `${contextMenuY.value}px`
            },
            onClick: (e) => e.stopPropagation()
          }, [
            h('div', {
              class: 'context-menu-item',
              onClick: () => handleContextMenuAction('play')
            }, '播放'),
            h('div', {
              class: 'context-menu-item',
              onClick: () => handleContextMenuAction('add-to-queue')
            }, '添加到队列'),
            h('div', {
              class: 'context-menu-item',
              onClick: () => handleContextMenuAction('locate')
            }, '定位文件')
          ]),
          
          // 浮动面板（使用 updateTrigger 确保响应式更新）
          (() => {
            // 访问 updateTrigger 以建立响应式依赖
            if (floatingPanelState && window.FloatingPanel) {
              const _ = floatingPanelUpdateTrigger.value; // 建立响应式依赖
              return window.FloatingPanel.createComponent(
            floatingPanelState,
            playlists.value,
            addSongToPlaylist,
            deleteSongFromFloatingPanel,
            showConfirmDialogHandler,
            () => {
              floatingPanelOpen.value = false;
            }
              )(h);
            }
            return null;
          })(),
          
          // 创建歌单对话框
          h('div', {
            class: ['create-playlist-dialog', { 'visible': showCreatePlaylistDialog.value }],
            onClick: (e) => {
              // 点击背景关闭对话框
              if (e.target.classList.contains('create-playlist-dialog')) {
                cancelCreatePlaylist();
              }
            }
          }, [
            h('div', {
              class: 'create-playlist-dialog-content',
              onClick: (e) => e.stopPropagation()
            }, [
              h('div', { class: 'create-playlist-dialog-header' }, '创建歌单'),
              h('input', {
                class: 'create-playlist-input',
                type: 'text',
                placeholder: '请输入歌单名称',
                value: newPlaylistNameInput.value,
                onInput: (e) => {
                  newPlaylistNameInput.value = e.target.value;
                },
                onKeydown: (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmCreatePlaylist();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelCreatePlaylist();
                  }
                }
              }),
              h('div', { class: 'create-playlist-dialog-buttons' }, [
                h('button', {
                  class: 'create-playlist-dialog-btn cancel',
                  onClick: cancelCreatePlaylist
                }, '取消'),
                h('button', {
                  class: 'create-playlist-dialog-btn confirm',
                  onClick: confirmCreatePlaylist,
                  disabled: !newPlaylistNameInput.value.trim()
                }, '创建')
              ])
            ])
          ]),
          
          // 确认对话框（独立于创建歌单对话框）
          h('div', {
            class: ['confirm-dialog', { 'visible': showConfirmDialog.value }],
            onClick: (e) => {
              // 点击背景关闭对话框
              if (e.target.classList.contains('confirm-dialog')) {
                confirmDialogCancel();
              }
            }
          }, [
            h('div', {
              class: 'confirm-dialog-content',
              onClick: (e) => e.stopPropagation()
            }, [
              h('div', { class: 'confirm-dialog-header' }, confirmDialogTitle.value),
              h('div', { class: 'confirm-dialog-message' }, confirmDialogMessage.value),
              h('div', { class: 'confirm-dialog-buttons' }, [
                h('button', {
                  class: 'confirm-dialog-btn cancel',
                  onClick: confirmDialogCancel
                }, '取消'),
                h('button', {
                  class: 'confirm-dialog-btn confirm',
                  onClick: confirmDialogConfirm
                }, '确定')
              ])
            ])
          ])
        ]);
      }
    };

    // 挂载应用
    const mountApp = () => {
      try {
        const app = createApp(App);
        app.mount('#app');
        console.log('Vue 应用已成功挂载');
      } catch (error) {
        console.error('Vue 应用挂载失败:', error);
        const appEl = document.getElementById('app');
        if (appEl) {
          appEl.innerHTML = '<div style="color: white; padding: 20px;">加载失败: ' + error.message + '</div>';
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountApp);
    } else {
      mountApp();
    }
  }

  // 快速启动 - 延迟非关键功能
  if (typeof Vue !== 'undefined') {
    initApp();
  } else {
    setTimeout(() => {
      if (typeof Vue !== 'undefined') {
        initApp();
      } else {
        console.error('Vue 加载超时');
        const app = document.getElementById('app');
        if (app) {
          app.innerHTML = '<div style="color: white; padding: 20px; text-align: center;"><h2>Vue 加载失败</h2><p>请检查网络连接</p></div>';
        }
      }
    }, 50); // 减少等待时间，加快启动
  }
})();
