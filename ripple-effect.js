// ripple-effect.js - 涟漪特效
(function() {
  'use strict';

  class RippleEffect extends window.PlayEffect {
    constructor(name, container) {
      super(name, container);
      this.circles = [];
      this.animationFrame = null;
      this.mainCircleSize = 210; // 主圆盘大小（需要动态获取）
      this.mainCircleOpacity = 0.24;
      this.numCircles = 8;
      this.albumCard = null;
      this.lastUpdate = null;
      this.effectElement = null;
      this.resizeObserver = null;
    }

    // 获取播放圆盘的位置和大小
    getAlbumCardInfo() {
      const albumCard = document.querySelector('.album-card');
      if (!albumCard) return null;

      const rect = albumCard.getBoundingClientRect();
      return {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        radius: rect.width / 2
      };
    }

    init() {
      // 创建特效元素容器
      this.effectElement = document.createElement('div');
      this.effectElement.className = 'ripple-effect';
      this.effectElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        mask-image: linear-gradient(to bottom, white, transparent);
        -webkit-mask-image: linear-gradient(to bottom, white, transparent);
        overflow: hidden;
      `;

      // 创建多个涟漪圆圈
      for (let i = 0; i < this.numCircles; i++) {
        const circle = document.createElement('div');
        circle.className = 'ripple-circle';
        circle.style.cssText = `
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--text-primary);
          pointer-events: none;
          transform-origin: center center;
        `;
        this.circles.push(circle);
        this.effectElement.appendChild(circle);
      }

      this.container.appendChild(this.effectElement);
    }

    start() {
      this.isActive = true;
      // 延迟一下确保圆盘已渲染
      setTimeout(() => {
        this.updateCircles();
        this.animate();
      }, 100);
      
      // 监听窗口大小变化，确保特效尺寸同步
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isActive) {
          this.updateCircles();
        }
      });
      
      // 观察圆盘元素
      const albumCard = document.querySelector('.album-card');
      if (albumCard) {
        this.resizeObserver.observe(albumCard);
      }
    }

    stop() {
      this.isActive = false;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }

    updateCircles() {
      const albumInfo = this.getAlbumCardInfo();
      if (!albumInfo) {
        // 如果圆盘还没渲染，延迟重试
        if (this.circles.length > 0) {
          setTimeout(() => this.updateCircles(), 100);
        }
        return;
      }

      // 更新主圆盘大小（以圆盘直径为基础，确保与圆盘同步）
      this.mainCircleSize = albumInfo.radius * 2;

      // 更新每个圆圈的位置和大小
      this.circles.forEach((circle, i) => {
        const size = this.mainCircleSize + i * 70;
        const opacity = Math.max(0, this.mainCircleOpacity - i * 0.03);
        const animationDelay = i * 0.06;

        circle.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 1px solid var(--text-primary);
          opacity: ${opacity};
          top: ${albumInfo.centerY}px;
          left: ${albumInfo.centerX}px;
          transform: translate(-50%, -50%) scale(1);
          transform-origin: center center;
          pointer-events: none;
          animation: ripple 2s ease ${animationDelay}s infinite;
        `;
      });
    }

    animate() {
      if (!this.isActive) return;

      // 检查圆盘位置是否变化（降低更新频率，避免过度计算）
      const now = Date.now();
      if (!this.lastUpdate || now - this.lastUpdate > 100) {
        this.updateCircles();
        this.lastUpdate = now;
      }

      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    update(params) {
      if (params.mainCircleSize !== undefined) {
        this.mainCircleSize = params.mainCircleSize;
      }
      if (params.mainCircleOpacity !== undefined) {
        this.mainCircleOpacity = params.mainCircleOpacity;
      }
      if (params.numCircles !== undefined) {
        this.numCircles = params.numCircles;
      }
      this.updateCircles();
    }

    destroy() {
      this.stop();
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.effectElement) {
        this.effectElement.remove();
        this.effectElement = null;
      }
      this.circles = [];
    }
  }

  // 导出
  if (typeof window !== 'undefined') {
    window.RippleEffect = RippleEffect;
  }
})();

