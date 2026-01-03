// floating-panel.js - 浮动面板组件（Vue.js 实现）
(function() {
  'use strict';

  // 捕获并裁切应用背景
  function captureAppBackground(rect, panelWidth, panelHeight) {
    try {
      // 查找应用背景元素（桌面背景或封面背景）
      const blurBg1 = document.getElementById('desktopBgImage1');
      const blurBg2 = document.getElementById('desktopBgImage2');
      const coverBg1 = document.getElementById('blurBgImage1');
      const coverBg2 = document.getElementById('blurBgImage2');
      
      // 找到当前激活的背景
      let activeBg = null;
      if (blurBg1 && blurBg1.classList.contains('active')) activeBg = blurBg1;
      else if (blurBg2 && blurBg2.classList.contains('active')) activeBg = blurBg2;
      else if (coverBg1 && coverBg1.classList.contains('active')) activeBg = coverBg1;
      else if (coverBg2 && coverBg2.classList.contains('active')) activeBg = coverBg2;
      
      if (!activeBg || !activeBg.complete) return null;
      
      // 创建 canvas 来裁切背景
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = panelWidth;
      canvas.height = panelHeight;
      
      // 计算裁切区域（面板在背景中的位置）
      const bgRect = activeBg.getBoundingClientRect();
      const scaleX = activeBg.naturalWidth / bgRect.width;
      const scaleY = activeBg.naturalHeight / bgRect.height;
      
      // 面板在窗口中的位置
      const panelLeft = rect.left;
      const panelTop = rect.bottom;
      
      // 计算在背景图片中的源坐标
      const sourceX = (panelLeft - bgRect.left) * scaleX;
      const sourceY = (panelTop - bgRect.top) * scaleY;
      const sourceWidth = panelWidth * scaleX;
      const sourceHeight = panelHeight * scaleY;
      
      // 裁切并绘制到 canvas
      ctx.drawImage(
        activeBg,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, panelWidth, panelHeight
      );
      
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
      console.warn('捕获应用背景失败:', error);
      return null;
    }
  }

  // 将下拉框范围内的播放列表项设置为透明（排除触发项本身）
  function hidePlaylistItemsInRange(panelLeft, panelTop, panelWidth, panelHeight, triggerRect) {
    const playlistItems = document.querySelectorAll('.playlist-item');
    const hiddenItems = [];
    
    playlistItems.forEach(item => {
      // 跳过已经被标记为隐藏的项（避免重复处理）
      if (item.hasAttribute('data-original-opacity')) {
        return;
      }
      
      const rect = item.getBoundingClientRect();
      
      // 检查是否是触发项本身（通过比较位置和尺寸）
      // 注意：触发项应该在 open() 时已经被隐藏了，这里再次检查确保不重复隐藏
      if (triggerRect && 
          Math.abs(rect.left - triggerRect.left) < 1 && 
          Math.abs(rect.top - triggerRect.top) < 1 &&
          Math.abs(rect.width - triggerRect.width) < 1 &&
          Math.abs(rect.height - triggerRect.height) < 1) {
        // 这是触发项本身，不隐藏（已经在 open() 时隐藏了）
        return;
      }
      
      // 检查是否在下拉框范围内
      const itemTop = rect.top;
      const itemBottom = rect.bottom;
      const itemLeft = rect.left;
      const itemRight = rect.right;
      
      // 如果播放列表项与下拉框有重叠（且不是触发项本身）
      if (itemTop < panelTop + panelHeight && itemBottom > panelTop && 
          itemLeft < panelLeft + panelWidth && itemRight > panelLeft) {
        // 保存原始透明度
        const originalOpacity = window.getComputedStyle(item).opacity;
        item.setAttribute('data-original-opacity', originalOpacity);
        // 设置为完全透明
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        hiddenItems.push(item);
      }
    });
    
    return hiddenItems;
  }

  // 恢复播放列表项的可见性
  function restorePlaylistItems(hiddenItems) {
    if (!hiddenItems || hiddenItems.length === 0) return;
    hiddenItems.forEach(item => {
      if (!item || !item.parentNode) return; // 确保元素还在 DOM 中
      try {
        const originalOpacity = item.getAttribute('data-original-opacity') || '1';
        item.style.opacity = originalOpacity;
        item.style.pointerEvents = '';
        item.removeAttribute('data-original-opacity');
        // 恢复播放键和序号的可见性
        const playBtn = item.querySelector('.play-hover-btn');
        const indexSpan = item.querySelector('.playlist-index');
        if (playBtn && playBtn.style.opacity === '0') {
          playBtn.style.opacity = '';
        }
        if (indexSpan && indexSpan.style.opacity === '0') {
          indexSpan.style.opacity = '';
        }
      } catch (error) {
        console.warn('恢复播放列表项可见性失败:', error);
      }
    });
  }

  // 恢复所有被隐藏的播放列表项（全局恢复函数）
  // 这个函数会强制恢复所有播放列表项及其子元素的可见性，无论它们是否被标记
  // 使用强制恢复，不依赖任何条件检查
  function restoreAllPlaylistItems() {
    try {
      const playlistItems = document.querySelectorAll('.playlist-item');
      playlistItems.forEach(item => {
        if (!item || !item.parentNode) return; // 确保元素还在 DOM 中
        
        try {
          // 强制恢复播放列表项本身的可见性（移除所有可能的隐藏状态）
          item.style.opacity = '';
          item.style.pointerEvents = '';
          item.removeAttribute('data-original-opacity');
          
          // 强制恢复所有子元素的可见性
          const playBtn = item.querySelector('.play-hover-btn');
          const indexSpan = item.querySelector('.playlist-index');
          const titleElement = item.querySelector('.playlist-title');
          
          if (playBtn) {
            playBtn.style.opacity = '';
            playBtn.style.pointerEvents = '';
            playBtn.removeAttribute('data-original-opacity');
          }
          
          if (indexSpan) {
            indexSpan.style.opacity = '';
            indexSpan.style.pointerEvents = '';
            indexSpan.removeAttribute('data-original-opacity');
          }
          
          // 强制恢复标题元素的可见性（这是关键！）
          if (titleElement) {
            titleElement.style.opacity = '';
            titleElement.style.pointerEvents = '';
            titleElement.removeAttribute('data-original-opacity');
          }
        } catch (error) {
          console.warn('恢复播放列表项可见性失败:', error);
        }
      });
    } catch (error) {
      console.warn('恢复所有播放列表项失败:', error);
    }
  }

  // 浮动面板状态管理
  function createFloatingPanelState(updateCallback) {
    const state = {
      isOpen: false,
      isClosing: false,
      isInitial: true, // 初始状态，用于从触发元素高度开始展开
      triggerRect: null,
      title: '',
      targetSong: null,
      uniqueId: `floating-panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      backgroundImage: null,
      hiddenItems: [], // 存储被隐藏的播放列表项
      titleElement: null, // 存储原始标题元素
      titleRect: null // 存储原始标题元素的位置
    };

    const notifyUpdate = () => {
      if (updateCallback) {
        updateCallback();
      }
    };

    return {
      open: (rect, title, song) => {
        state.triggerRect = rect;
        state.title = title;
        state.targetSong = song;
        state.isOpen = true;
        state.isClosing = false;
        state.isInitial = true;
        state.uniqueId = `floating-panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        state.backgroundImage = null;
        
        // 找到触发项并获取标题元素的位置
        const playlistItems = document.querySelectorAll('.playlist-item');
        playlistItems.forEach(item => {
          const itemRect = item.getBoundingClientRect();
          // 检查是否是触发项（位置和尺寸匹配）
          if (Math.abs(itemRect.left - rect.left) < 1 && 
              Math.abs(itemRect.top - rect.top) < 1 &&
              Math.abs(itemRect.width - rect.width) < 1 &&
              Math.abs(itemRect.height - rect.height) < 1) {
            // 这是触发项，找到标题元素
            const titleElement = item.querySelector('.playlist-title');
            if (titleElement) {
              const titleRect = titleElement.getBoundingClientRect();
              state.titleElement = titleElement;
              state.titleRect = {
                left: titleRect.left,
                top: titleRect.top,
                width: titleRect.width,
                height: titleRect.height
              };
              // 隐藏原位置的标题元素，避免与下拉窗口中的标题重叠
              // 下拉窗口中的标题会从原位置（通过绝对定位）动画移动到新位置
              titleElement.style.opacity = '0';
              titleElement.style.pointerEvents = 'none';
            }
            // 隐藏整个触发项的其他部分（按钮、索引等）
            if (!item.hasAttribute('data-original-opacity')) {
              const originalOpacity = window.getComputedStyle(item).opacity;
              item.setAttribute('data-original-opacity', originalOpacity);
              // 只隐藏非标题部分，标题已经单独处理
              const playBtn = item.querySelector('.play-hover-btn');
              const indexSpan = item.querySelector('.playlist-index');
              if (playBtn) playBtn.style.opacity = '0';
              if (indexSpan) indexSpan.style.opacity = '0';
              item.style.pointerEvents = 'none';
              state.hiddenItems.push(item);
            }
          }
        });
        
        notifyUpdate();
        // 延迟一帧后设置为展开状态，触发高度动画
        setTimeout(() => {
          state.isInitial = false;
          notifyUpdate();
        }, 10);
      },
      close: () => {
        // 立即恢复所有播放列表项的可见性（使用全局恢复函数，确保不遗漏）
        // 多次调用确保恢复，不依赖任何条件
        restoreAllPlaylistItems();
        
        // 恢复标题元素（如果还存在）
        if (state.titleElement) {
          try {
            state.titleElement.style.opacity = '';
            state.titleElement.style.pointerEvents = '';
            state.titleElement.removeAttribute('data-original-opacity');
          } catch (error) {
            // 忽略错误，继续执行
          }
        }
        
        state.hiddenItems = [];
        state.titleElement = null;
        state.titleRect = null;
        state.isClosing = true;
        notifyUpdate();
        
        // 延迟清理状态，等待动画完成
        setTimeout(() => {
          // 再次强制恢复所有项（防止遗漏）
          restoreAllPlaylistItems();
          
          state.hiddenItems = [];
          state.titleElement = null;
          state.titleRect = null;
        state.isOpen = false;
          state.isClosing = false;
          state.isInitial = true;
        state.triggerRect = null;
        state.title = '';
        state.targetSong = null;
          state.backgroundImage = null;
          
          // 最后一次强制恢复（在清理状态后）
          restoreAllPlaylistItems();
          
          // 额外延迟恢复，处理 DOM 重新渲染的情况（如背景切换、Vue 重新渲染等）
          setTimeout(() => {
            restoreAllPlaylistItems();
          }, 50);
          
          // 再延迟一次，确保 Vue 重新渲染后也能恢复
          setTimeout(() => {
            restoreAllPlaylistItems();
          }, 200);
          
          notifyUpdate();
        }, 400);
      },
      setBackground: (bg) => {
        state.backgroundImage = bg;
        // 背景切换时，如果面板已关闭，强制恢复所有元素
        // 因为背景切换可能导致 DOM 重新渲染，导致之前隐藏的元素无法恢复
        if (!state.isOpen && !state.isClosing) {
          // 立即恢复
          restoreAllPlaylistItems();
          // 延迟恢复，等待 DOM 更新完成
          setTimeout(() => {
            restoreAllPlaylistItems();
          }, 50);
          setTimeout(() => {
            restoreAllPlaylistItems();
          }, 150);
        }
        notifyUpdate();
      },
      setHiddenItems: (items) => {
        state.hiddenItems = items;
      },
      getState: () => ({ ...state })
    };
  }

  // 创建浮动面板组件
  function createFloatingPanelComponent(panelState, playlists, addSongToPlaylist, deleteSong, showConfirmDialogHandler, onClose) {
    return (h) => {
      const state = panelState.getState();
      
      // 只有在打开或正在关闭时才渲染
      if (!state.isOpen && !state.isClosing) {
        // 强制恢复所有隐藏项（使用全局恢复函数）
        // 立即执行，不等待
        restoreAllPlaylistItems();
        // 延迟执行，确保 Vue 重新渲染后也能恢复
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 0);
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 50);
        return null;
      }
      
      // 如果没有触发元素信息，也不渲染
      if (!state.triggerRect) {
        // 强制恢复所有隐藏项（使用全局恢复函数）
        // 立即执行，不等待
        restoreAllPlaylistItems();
        // 延迟执行，确保 Vue 重新渲染后也能恢复
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 0);
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 50);
        return null;
      }
      
      const handleClose = () => {
        panelState.close();
        if (onClose) onClose();
      };

      // 计算面板尺寸和位置
      const panelPadding = 8;
      
      // 计算内容高度：标题栏 + 添加到歌单项 + 歌单列表 + 分隔线 + 移除项
      const headerHeight = state.triggerRect ? state.triggerRect.height : 40;
      const addToPlaylistHeight = 40;
      const playlistItemHeight = 40;
      const separatorHeight = 1;
      const removeItemHeight = 40;
      const padding = 8; // 上下padding
      const estimatedHeight = headerHeight + addToPlaylistHeight + (playlists.length * playlistItemHeight) + separatorHeight + removeItemHeight + padding * 2;
      
      // 面板宽度等于触发元素（整个播放列表项）宽度（完全对齐）
      // getBoundingClientRect() 返回的 width 包括：内容 + padding + border，但不包括 margin
      // 播放列表项有 margin-bottom: 6px，但这是垂直方向的，不影响宽度
      // 确保左右都对齐：使用 triggerRect 的完整宽度和 left 位置
      const panelWidth = state.triggerRect ? state.triggerRect.width : 280;
      // 使用 triggerRect 的 left，确保左边对齐；右边自动对齐因为宽度相同
      // 注意：triggerRect.left 是相对于视口的，已经考虑了所有父元素的定位
      let panelLeft = state.triggerRect ? state.triggerRect.left : window.innerWidth / 2;
      // 从选中框的顶部开始下拉，确保是一个整体
      let panelTop = state.triggerRect ? state.triggerRect.top : window.innerHeight / 2;

      // 确保面板不超出窗口
      // 注意：为了保持宽度完全对齐，我们不应该改变宽度，只调整位置
      // 但如果必须调整，确保左右都对齐
      const originalPanelLeft = panelLeft;
      if (panelLeft + panelWidth > window.innerWidth) {
        panelLeft = window.innerWidth - panelWidth - panelPadding;
      }
      if (panelLeft < panelPadding) {
        panelLeft = panelPadding;
      }
      // 如果位置被调整了，说明无法完全对齐，但尽量保持宽度一致
      if (panelTop + estimatedHeight > window.innerHeight) {
        panelTop = state.triggerRect ? state.triggerRect.top - estimatedHeight - panelPadding : window.innerHeight / 2 - estimatedHeight / 2;
      }

      // 隐藏下拉框范围内的播放列表项（实时更新，因为高度在变化）
      // 只在打开且未关闭时隐藏，关闭时立即恢复
      if (state.isClosing || (!state.isOpen && !state.isClosing)) {
        // 关闭时或已关闭：立即强制恢复所有隐藏项（使用全局恢复函数）
        restoreAllPlaylistItems();
        // 延迟执行，确保 Vue 重新渲染后也能恢复
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 0);
        setTimeout(() => {
          restoreAllPlaylistItems();
        }, 50);
        panelState.setHiddenItems([]);
      } else if (state.isOpen && !state.isClosing) {
        // 打开时：先恢复之前的隐藏项（如果有），然后隐藏新范围内的项
        if (state.hiddenItems && state.hiddenItems.length > 0) {
          restorePlaylistItems(state.hiddenItems);
        }
        // 计算当前高度
        const currentHeight = state.isInitial ? (state.triggerRect ? state.triggerRect.height : 40) : estimatedHeight;
        // 隐藏新范围内的项（排除触发项本身）
        const hiddenItems = hidePlaylistItemsInRange(panelLeft, panelTop, panelWidth, currentHeight, state.triggerRect);
        panelState.setHiddenItems(hiddenItems);
      }

      // 不需要捕获背景，直接使用透明背景露出下面的应用背景

      // 计算初始高度（触发元素的高度）
      const triggerHeight = state.triggerRect ? state.triggerRect.height : 40;
      const isExpanding = state.isOpen && !state.isClosing && !state.isInitial;
      const isCollapsing = state.isClosing;
      const isInitial = state.isInitial;
      const transformOrigin = 'top center';
      
      // 计算当前高度：初始状态和收起时使用触发元素高度，展开时使用完整高度
      const currentHeight = (isInitial || isCollapsing) ? triggerHeight : estimatedHeight;

      return h('div', [
        // 背景遮罩（无模糊，仅用于点击关闭，z-index 低于面板但高于播放列表）
        h('div', {
          class: 'floating-panel-backdrop',
          onClick: handleClose,
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999, // 低于面板但高于播放列表
            background: 'transparent',
            backdropFilter: 'none', // 明确设置为无模糊
            WebkitBackdropFilter: 'none', // WebKit 前缀
            pointerEvents: 'all'
          }
        }),
        // 面板内容（下拉展开效果，透明背景露出最底层的应用背景）
        // z-index 设置为高于播放列表（播放列表通常在 z-index 较低），但能露出最底层背景
        h('div', {
          class: 'floating-panel-content',
          key: state.uniqueId,
          style: {
            position: 'fixed',
            zIndex: 10000, // 非常高的 z-index，确保在播放列表之上，但背景透明能露出最底层
            left: `${panelLeft}px`,
            top: `${panelTop}px`,
            width: `${panelWidth}px`,
            height: `${currentHeight}px`,
            background: 'transparent', // 完全透明，露出最底层的应用背景
            border: isInitial ? 'none' : '1px solid var(--glass-border)',
            borderRadius: isInitial ? '0' : '12px', // 下拉框始终使用圆角
            boxShadow: isInitial ? 'none' : 'var(--shadow-lg)',
            overflow: 'hidden',
            transformOrigin: transformOrigin,
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s, borderRadius 0.2s, boxShadow 0.2s',
            opacity: isCollapsing ? 0 : 1,
            pointerEvents: 'auto' // 确保可以交互
          },
          onClick: (e) => e.stopPropagation(),
          onMouseleave: handleClose,
          // 在高度变化时更新隐藏的播放列表项
          onTransitionend: (e) => {
            // 只处理高度变化的过渡
            if (e.propertyName === 'height') {
              if (state.isOpen && !state.isClosing) {
                // 展开时：先恢复之前的隐藏项，然后重新计算并隐藏
                if (state.hiddenItems && state.hiddenItems.length > 0) {
                  restorePlaylistItems(state.hiddenItems);
                }
                const currentHeight = state.isInitial ? (state.triggerRect ? state.triggerRect.height : 40) : estimatedHeight;
                const hiddenItems = hidePlaylistItemsInRange(panelLeft, panelTop, panelWidth, currentHeight, state.triggerRect);
                panelState.setHiddenItems(hiddenItems);
              } else if (state.isClosing) {
                // 关闭时：强制恢复所有隐藏项（使用全局恢复函数）
                restoreAllPlaylistItems();
                // 延迟执行，确保 Vue 重新渲染后也能恢复
                setTimeout(() => {
                  restoreAllPlaylistItems();
                }, 0);
                setTimeout(() => {
                  restoreAllPlaylistItems();
                }, 50);
                panelState.setHiddenItems([]);
              }
            }
          }
        }, [
          // 背景遮罩层（无模糊，确保文字可读，但不遮挡最底层背景）
          h('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.15)',
              backdropFilter: 'none', // 移除模糊效果
              WebkitBackdropFilter: 'none', // WebKit 前缀
              zIndex: 0,
              opacity: isInitial ? 0 : 1,
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
            }
          }),
          // 内容容器
          h('div', {
            style: {
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              opacity: (isExpanding || isInitial) ? 1 : (isCollapsing ? 0 : 1),
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
            }
          }, [
            // 标题栏（包含歌曲名称，文字从选中框位置滑动并变大）
            h('div', {
              class: 'floating-panel-header',
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isInitial ? '12px' : '12px 16px', // 初始状态与选中框 padding 一致（12px）
                height: `${triggerHeight}px`,
                minHeight: `${triggerHeight}px`,
                borderBottom: isInitial ? 'none' : '1px solid var(--glass-border)',
                background: isInitial ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                opacity: (isExpanding || isInitial) ? 1 : (isCollapsing ? 0 : 1),
                transform: isExpanding ? 'translateY(0)' : (isCollapsing ? 'translateY(-10px)' : 'translateY(0)'),
                transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.15s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.15s, border-bottom 0.2s, background 0.2s, padding 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }
            }, [
              h('div', {
                class: 'floating-panel-title',
                key: `title-${state.uniqueId}`, // 使用 uniqueId 确保动画正确
                style: {
                  fontSize: isInitial ? '14px' : '16px', // 展开时略微变大
                fontWeight: 600,
                color: 'var(--text-primary)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  // 如果标题元素存在，从原位置动画移动到当前位置
                  ...(state.titleRect && isInitial ? {
                    position: 'absolute',
                    left: `${state.titleRect.left - panelLeft}px`,
                    top: `${state.titleRect.top - panelTop}px`,
                    width: `${state.titleRect.width}px`,
                    transform: 'translate(0, 0)',
                    transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  } : {
                    transition: 'font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }),
                  // 展开后，标题应该位于正常位置（相对于 header）
                  ...(state.titleRect && !isInitial ? {
                    position: 'relative',
                    left: '0',
                    top: '0',
                    width: 'auto',
                    transform: 'translate(0, 0)',
                    transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  } : {})
              }
            }, state.title),
            h('button', {
              class: 'floating-panel-close',
              style: {
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                  marginLeft: '8px',
                  opacity: isExpanding ? 1 : 0,
                  transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s, all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              },
              onClick: handleClose,
              onMouseenter: (e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.transform = 'scale(1.1)';
              },
              onMouseleave: (e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }, '←')
          ]),
            // 面板主体（渐入动画，仅在展开时显示，无滚动条）
            !isInitial && h('div', {
            class: 'floating-panel-body',
            style: {
                flex: 1,
                overflow: 'visible', // 移除滚动条，适应长度一次展示完
                padding: '4px 0',
                opacity: isExpanding ? 1 : 0,
                transform: isExpanding ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s'
            }
          }, [
            // 添加到歌单选项
            h('div', {
              class: 'floating-panel-item',
              style: {
                padding: '10px 16px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              },
              onClick: (e) => e.stopPropagation(),
              onMouseenter: (e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateX(4px)';
              },
              onMouseleave: (e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }, '添加到歌单'),
            // 歌单列表
              ...playlists.map((p, idx) => 
              h('div', {
                key: `floating-playlist-${p.id}`,
                class: 'floating-panel-item',
                style: {
                  padding: '10px 16px 10px 32px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                    gap: '8px',
                    opacity: isExpanding ? 1 : 0,
                    transform: isExpanding ? 'translateX(0)' : 'translateX(-10px)',
                    transition: `opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${0.25 + idx * 0.05}s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${0.25 + idx * 0.05}s, all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                },
                onClick: (e) => {
                  e.stopPropagation();
                  if (state.targetSong) {
                    addSongToPlaylist(p.id, state.targetSong);
                    handleClose();
                  }
                },
                onMouseenter: (e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                },
                onMouseleave: (e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }, [
                h('span', { style: 'fontSize: 12px;' }, '📋'),
                h('span', null, p.name)
              ])
            ),
            // 如果没有歌单
            playlists.length === 0 && h('div', {
              class: 'floating-panel-empty',
              style: {
                padding: '20px 16px',
                textAlign: 'center',
                fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              }
            }, '暂无歌单，请先创建'),
            // 分隔线
            playlists.length > 0 && h('div', {
              style: {
                height: '1px',
                background: 'var(--glass-border)',
                  margin: '4px 0',
                  opacity: isExpanding ? 1 : 0,
                  transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.3s'
              }
            }),
            // 移除选项
            h('div', {
              class: 'floating-panel-item floating-panel-remove',
              style: {
                padding: '10px 16px',
                fontSize: '14px',
                color: '#ff5f56',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                  gap: '8px',
                  opacity: isExpanding ? 1 : 0,
                  transform: isExpanding ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${0.3 + playlists.length * 0.05}s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${0.3 + playlists.length * 0.05}s, all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              },
              onClick: (e) => {
                e.stopPropagation();
                if (state.targetSong) {
                    // 直接调用删除函数，它内部已经有确认对话框
                      deleteSong(state.targetSong);
                    handleClose();
                }
              },
              onMouseenter: (e) => {
                  e.currentTarget.style.background = 'rgba(255, 95, 86, 0.2)';
                e.currentTarget.style.transform = 'translateX(4px)';
              },
              onMouseleave: (e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }, [
              h('span', { style: 'fontSize: 12px;' }, '🗑️'),
              h('span', null, '移除')
              ])
            ])
          ])
        ])
      ]);
    };
  }

  // 导出
  if (typeof window !== 'undefined') {
    window.FloatingPanel = {
      createState: createFloatingPanelState,
      createComponent: createFloatingPanelComponent
    };
  }
})();

