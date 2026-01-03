// rhythm-effect.js - 律动特效（音乐可视化）
(function() {
  'use strict';

  class RhythmEffect extends window.PlayEffect {
    constructor(name, container) {
      super(name, container);
      this.bars = [];
      this.animationFrame = null;
      this.audioContext = null;
      this.analyser = null;
      this.source = null;
      this.dataArray = null;
      this.effectElement = null;
      this.numBars = 64; // 直方条数量
      this.barWidth = 0;
      this.barGap = 6; // 直方条之间的间距（增大间距）
      this.maxHeight = 0; // 最大高度（控制栏上方）
      this.isActive = false;
      this.resizeHandler = null;
      this.controlBarObserver = null;
      this.gainNode = null; // 用于分流音频，避免中断播放
    }

    // 获取音频元素
    getAudioElement() {
      // 尝试从 window 获取
      if (window.audioElement) {
        return window.audioElement;
      }
      // 尝试从 DOM 查找
      const audio = document.querySelector('audio');
      return audio || null;
    }

    // 获取控制栏位置信息
    getControlBarInfo() {
      const controlBar = document.querySelector('.control-bar');
      if (controlBar) {
        const rect = controlBar.getBoundingClientRect();
        return {
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom
        };
      }
      // 默认值
      return {
        height: 120,
        top: window.innerHeight - 120,
        bottom: window.innerHeight
      };
    }

    // 初始化 Web Audio API
    async initAudioContext() {
      try {
        const audioElement = this.getAudioElement();
        if (!audioElement) {
          console.warn('律动特效：未找到音频元素');
          return false;
        }

        // 检查是否已经有 AudioContext（可能之前创建过但没关闭）
        if (!this.audioContext || this.audioContext.state === 'closed') {
          // 创建 AudioContext
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // 如果 AudioContext 处于 suspended 状态，尝试恢复
        if (this.audioContext.state === 'suspended') {
          try {
            await this.audioContext.resume();
          } catch (e) {
            console.warn('律动特效：无法恢复 AudioContext', e);
          }
        }
        
        // 检查全局是否有已存在的 AudioContext 和 source（从 window 获取）
        // 这样可以跨实例重用连接
        if (window.rhythmAudioContext && window.rhythmAudioSource) {
          this.audioContext = window.rhythmAudioContext;
          this.source = window.rhythmAudioSource;
          
          // 创建新的 analyser 和 gainNode
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.8;
          
          this.gainNode = this.audioContext.createGain();
          this.gainNode.gain.value = 1;
          
          // 重新连接分析器路径
          try {
            // 连接 source -> gainNode -> analyser -> destination
            this.source.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
          } catch (e) {
            console.warn('律动特效：重新连接时出错', e);
          }
          
          // 创建数据数组
          const bufferLength = this.analyser.frequencyBinCount;
          this.dataArray = new Uint8Array(bufferLength);
          return true;
        }
        
        // 检查当前实例是否已经有 source（可能之前创建过）
        if (this.source) {
          // source 已存在，检查 analyser 和 gainNode
          if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
          }
          if (!this.gainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1;
          }
          // 重新连接分析器路径
          try {
            // 连接 source -> gainNode -> analyser -> destination
            this.source.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
          } catch (e) {
            console.warn('律动特效：重新连接时出错', e);
          }
          // 创建数据数组
          const bufferLength = this.analyser.frequencyBinCount;
          this.dataArray = new Uint8Array(bufferLength);
          return true;
        }
        
        // 创建 AnalyserNode
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256; // 频率分析大小
        this.analyser.smoothingTimeConstant = 0.8; // 平滑系数
        
        // 检查音频元素是否已经有 MediaElementSource
        try {
          // 尝试创建 MediaElementSource
          this.source = this.audioContext.createMediaElementSource(audioElement);
          
          // 创建 GainNode 用于分流音频到分析器（不影响原始播放）
          this.gainNode = this.audioContext.createGain();
          this.gainNode.gain.value = 1; // 保持音量
          
          // 保存到全局，供其他实例重用
          window.rhythmAudioContext = this.audioContext;
          window.rhythmAudioSource = this.source;
          
          // 连接路径1：source -> destination（保持原始播放，这是最重要的）
          this.source.connect(this.audioContext.destination);
          
          // 连接路径2：source -> gainNode -> analyser（用于分析）
          this.source.connect(this.gainNode);
          this.gainNode.connect(this.analyser);
          // analyser 连接到 destination，用于输出
          this.analyser.connect(this.audioContext.destination);
          
        } catch (error) {
          // 如果音频元素已经连接到另一个 MediaElementSource
          if (error.name === 'InvalidStateError' || error.message.includes('already been connected')) {
            console.warn('律动特效：音频元素已连接，无法创建新的连接');
            // 无法连接，标记为未连接，特效将无法获取数据
            this.source = null;
            this.gainNode = null;
          } else {
            throw error;
          }
        }
        
        // 创建数据数组
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        return true;
      } catch (error) {
        console.error('律动特效：初始化音频上下文失败', error);
        return false;
      }
    }

    init() {
      // 创建特效元素容器
      this.effectElement = document.createElement('div');
      this.effectElement.className = 'rhythm-effect';
      this.effectElement.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
      `;

      // 创建直方条容器
      const barsContainer = document.createElement('div');
      barsContainer.className = 'rhythm-bars-container';
      barsContainer.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: ${this.barGap}px;
        padding: 0 20px;
        box-sizing: border-box;
      `;

      // 创建直方条
      for (let i = 0; i < this.numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'rhythm-bar';
        bar.style.cssText = `
          flex: 1;
          min-width: 2px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px 2px 0 0;
          transition: height 0.1s linear;
          will-change: height;
        `;
        this.bars.push(bar);
        barsContainer.appendChild(bar);
      }

      this.effectElement.appendChild(barsContainer);
      this.container.appendChild(this.effectElement);
    }

    async start() {
      this.isActive = true;
      
      // 确保特效元素已创建
      if (!this.effectElement) {
        console.warn('律动特效：特效元素未创建，重新初始化');
        this.init();
      }
      
      // 初始化音频上下文
      const initialized = await this.initAudioContext();
      if (!initialized) {
        console.warn('律动特效：无法初始化音频上下文，特效将显示静态直方条');
        // 即使初始化失败，也显示直方条（只是不会跳动）
        this.updateLayout();
        // 开始动画循环（即使没有数据也会显示静态直方条）
        this.animate();
        return;
      }

      // 更新布局（先更新布局，确保特效可见）
      this.updateLayout();
      
      // 开始动画
      this.animate();
      
      // 监听窗口大小变化
      this.resizeHandler = () => this.updateLayout();
      window.addEventListener('resize', this.resizeHandler);
      
      // 监听控制栏大小和位置变化（使用 ResizeObserver 和 MutationObserver）
      const controlBar = document.querySelector('.control-bar');
      if (controlBar) {
        // 使用 ResizeObserver 监听控制栏大小变化
        this.controlBarObserver = new ResizeObserver(() => {
          if (this.isActive) {
            this.updateLayout();
          }
        });
        this.controlBarObserver.observe(controlBar);
        
        // 使用 MutationObserver 监听控制栏位置变化（如果控制栏有动画）
        const mutationObserver = new MutationObserver(() => {
          if (this.isActive) {
            this.updateLayout();
          }
        });
        mutationObserver.observe(controlBar, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    }

    stop() {
      this.isActive = false;
      
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }

      // 重要：在 stop() 时不断开音频连接！
      // 因为 destroy() 会创建新实例，如果断开连接，新实例无法重新连接
      // 只停止动画，保持所有连接状态，让 destroy() 处理清理
      
      // 不清除任何引用，保持连接状态
      // this.dataArray = null; // 不清理，保持状态
    }

    updateLayout() {
      if (!this.effectElement) return;

      const controlBarInfo = this.getControlBarInfo();
      const barsContainer = this.effectElement.querySelector('.rhythm-bars-container');
      
      if (barsContainer) {
        // 严格绑定：底部位置 = 控制栏顶部位置（从窗口底部计算）
        const bottomPosition = window.innerHeight - controlBarInfo.top;
        barsContainer.style.bottom = `${bottomPosition}px`;
        // 设置最大高度（从控制栏顶部到窗口顶部）
        this.maxHeight = controlBarInfo.top;
      }
    }

    animate() {
      if (!this.isActive) {
        return;
      }

      // 如果没有分析器或数据数组，显示静态直方条
      if (!this.analyser || !this.dataArray) {
        // 显示静态直方条（最小高度，确保可见）
        this.bars.forEach((bar) => {
          bar.style.height = '10px';
        });
        
        // 如果音频元素存在且正在播放，尝试重新初始化
        const audioElement = this.getAudioElement();
        if (audioElement && !audioElement.paused && !this.source) {
          // 延迟重试初始化
          setTimeout(() => {
            if (this.isActive && !this.source) {
              this.initAudioContext();
            }
          }, 1000);
        }
        
        // 继续动画循环
        this.animationFrame = requestAnimationFrame(() => this.animate());
        return;
      }

      // 获取频率数据
      this.analyser.getByteFrequencyData(this.dataArray);

      // 计算每个直方条对应的频率范围
      const dataLength = this.dataArray.length;
      const barsPerDataPoint = Math.max(1, Math.floor(dataLength / this.numBars));
      
      // 更新每个直方条的高度
      // 从左到右从低到高排列（左侧是低频，右侧是高频）
      // 排除最高的6个频率（因为显示不了）
      const excludedHighFreq = 6; // 排除的最高频率数量
      const usableDataLength = dataLength - excludedHighFreq; // 可用的频率数据长度
      
      this.bars.forEach((bar, index) => {
        // 将索引直接映射到频率数据索引
        // 左侧（index = 0）对应低频（dataLength 的开头，排除最高频率后）
        // 右侧（index = numBars - 1）对应高频
        // 线性映射：从低到高
        const normalizedIndex = this.numBars > 1 ? index / (this.numBars - 1) : 0;
        // normalizedIndex = 0（左侧）对应低频，1（右侧）对应高频
        // 映射到可用的频率范围（排除最高频率）
        const frequencyIndex = Math.floor(normalizedIndex * (usableDataLength - 1));
        const clampedFrequencyIndex = Math.max(0, Math.min(usableDataLength - 1, frequencyIndex));
        
        // 计算该频率范围的平均幅度
        let sum = 0;
        const start = Math.max(0, clampedFrequencyIndex - barsPerDataPoint / 2);
        const end = Math.min(usableDataLength, clampedFrequencyIndex + barsPerDataPoint / 2);
        const count = end - start;
        
        if (count > 0) {
          for (let i = start; i < end; i++) {
            sum += this.dataArray[i];
          }
          
          // 计算平均幅度
          const average = sum / count;
          
          // 将幅度转换为高度（0-100%）
          const normalizedValue = average / 255;
          // 使用平方根来增强视觉效果
          const enhancedValue = Math.pow(normalizedValue, 0.5);
          
          // 设置高度（最小高度为 2px，最大为 maxHeight 的 80%）
          const height = Math.max(2, enhancedValue * this.maxHeight * 0.8);
          bar.style.height = `${height}px`;
        } else {
          // 如果没有数据，设置最小高度
          bar.style.height = '2px';
        }
      });

      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    update(params) {
      if (params.numBars !== undefined) {
        this.numBars = params.numBars;
      }
      if (params.barGap !== undefined) {
        this.barGap = params.barGap;
      }
      this.updateLayout();
    }

    destroy() {
      this.stop();
      
      // 移除窗口大小监听
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
        this.resizeHandler = null;
      }
      
      // 断开控制栏观察器
      if (this.controlBarObserver) {
        this.controlBarObserver.disconnect();
        this.controlBarObserver = null;
      }
      
      // 重要：不要关闭 AudioContext！
      // 一旦创建了 MediaElementSource，音频元素就不能再直接播放
      // 如果关闭 AudioContext，音频就会停止播放
      // 保持 AudioContext 打开，确保音频继续播放
      // 只在应用完全关闭时才关闭 AudioContext
      
      // 确保 source 仍然连接到 destination（如果存在）
      if (this.source && this.audioContext && this.audioContext.state !== 'closed') {
        try {
          // 检查 source 是否仍然连接到 destination
          // 如果没有，重新连接
          // 注意：无法直接检查连接状态，所以尝试重新连接
          // 如果已经连接，会抛出错误，我们忽略它
          try {
            this.source.connect(this.audioContext.destination);
          } catch (e) {
            // 如果已经连接，忽略错误
          }
        } catch (e) {
          console.warn('律动特效：确保音频连接时出错', e);
        }
      }
      
      // 不关闭 AudioContext，保持音频播放
      // this.audioContext = null; // 不设置为 null
      
      if (this.effectElement) {
        this.effectElement.remove();
        this.effectElement = null;
      }
      
      this.bars = [];
    }
  }

  // 导出
  if (typeof window !== 'undefined') {
    window.RhythmEffect = RhythmEffect;
  }
})();

