// play-effects.js - 播放特效管理器
(function() {
  'use strict';

  // 特效接口定义
  class PlayEffect {
    constructor(name, container) {
      this.name = name;
      this.container = container;
      this.isActive = false;
    }

    // 初始化特效（子类必须实现）
    init() {
      throw new Error('init() method must be implemented');
    }

    // 启动特效（子类必须实现）
    start() {
      throw new Error('start() method must be implemented');
    }

    // 停止特效（子类必须实现）
    stop() {
      throw new Error('stop() method must be implemented');
    }

    // 销毁特效（子类必须实现）
    destroy() {
      throw new Error('destroy() method must be implemented');
    }

    // 更新特效参数（可选，子类可以重写）
    update(params) {
      // 默认不执行任何操作
    }
  }

  // 特效管理器
  class PlayEffectManager {
    constructor() {
      this.effects = new Map();
      this.currentEffect = null;
      this.effectContainer = null;
    }

    // 注册特效
    registerEffect(name, EffectClass) {
      this.effects.set(name, EffectClass);
    }

    // 初始化特效容器
    initContainer() {
      if (this.effectContainer) return;

      // 创建特效容器，位于背景之上、所有组件之下
      this.effectContainer = document.createElement('div');
      this.effectContainer.className = 'play-effects-container';
      this.effectContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      `;
      
      // 插入到 app 元素内部，但在所有内容之前
      const appElement = document.getElementById('app');
      if (appElement) {
        // 确保插入到最前面
        if (appElement.firstChild) {
          appElement.insertBefore(this.effectContainer, appElement.firstChild);
        } else {
          appElement.appendChild(this.effectContainer);
        }
      } else {
        // 如果 app 元素不存在，插入到 body
        document.body.appendChild(this.effectContainer);
      }
    }

    // 切换特效
    switchEffect(effectName) {
      // 停止当前特效
      if (this.currentEffect) {
        this.currentEffect.stop();
        this.currentEffect.destroy();
        this.currentEffect = null;
      }

      // 如果选择"默认"，不启动任何特效
      if (effectName === '默认' || !effectName) {
        return;
      }

      // 启动新特效
      const EffectClass = this.effects.get(effectName);
      if (!EffectClass) {
        console.warn(`特效 "${effectName}" 未注册`);
        return;
      }

      this.initContainer();
      this.currentEffect = new EffectClass(effectName, this.effectContainer);
      this.currentEffect.init();
      this.currentEffect.start();
    }

    // 更新当前特效参数
    updateCurrentEffect(params) {
      if (this.currentEffect) {
        this.currentEffect.update(params);
      }
    }

    // 销毁管理器
    destroy() {
      if (this.currentEffect) {
        this.currentEffect.stop();
        this.currentEffect.destroy();
        this.currentEffect = null;
      }
      if (this.effectContainer) {
        this.effectContainer.remove();
        this.effectContainer = null;
      }
    }
  }

  // 导出
  if (typeof window !== 'undefined') {
    window.PlayEffect = PlayEffect;
    window.PlayEffectManager = PlayEffectManager;
  }
})();

