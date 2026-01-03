// meteor-effect.js - 流星特效
(function() {
  'use strict';

  class MeteorEffect extends window.PlayEffect {
    constructor(name, container) {
      super(name, container);
      this.meteors = [];
      this.animationFrame = null;
      this.effectElement = null;
      this.numMeteors = 50; // 流星数量（增加流量）
      this.minDelay = 0.1; // 最小延迟（秒）
      this.maxDelay = 0.8; // 最大延迟（秒）
      this.minDuration = 2; // 最小持续时间（秒）
      this.maxDuration = 8; // 最大持续时间（秒）
      this.angle = 225; // 角度（从上方斜向左下，45度）
      this.isActive = false;
      this.meteorInterval = null;
    }

    init() {
      // 创建特效元素容器
      this.effectElement = document.createElement('div');
      this.effectElement.className = 'meteor-effect';
      this.effectElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
      `;

      // 添加 CSS 动画样式
      if (!document.getElementById('meteor-effect-styles')) {
        const style = document.createElement('style');
        style.id = 'meteor-effect-styles';
        style.textContent = `
          @keyframes meteor {
            0% {
              transform: translateX(0) translateY(0);
            }
            100% {
              transform: translateX(-530px) translateY(530px);
            }
          }
          @keyframes meteor-opacity {
            0% {
              opacity: 1;
            }
            30% {
              opacity: 0.9;
            }
            60% {
              opacity: 0.5;
            }
            90% {
              opacity: 0.2;
            }
            100% {
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      this.container.appendChild(this.effectElement);
    }

    createMeteor() {
      const meteor = document.createElement('div');
      meteor.className = 'meteor';
      
      // 随机颜色（彩色）
      const colors = [
        '#ff6b9d', // 粉红
        '#4ecdc4', // 青色
        '#ffe66d', // 黄色
        '#95e1d3', // 薄荷绿
        '#f38181', // 珊瑚红
        '#a8e6cf', // 浅绿
        '#ffd3a5', // 橙色
        '#c7ceea', // 淡紫
        '#ffaaa5', // 浅红
        '#a8dadc', // 天蓝
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // 随机位置（从整个上侧和右侧上半部分入射）
      // 可以从上侧任意位置或右侧上半部分开始
      let startX, startY;
      const randomType = Math.random();
      if (randomType < 0.6) {
        // 60%概率从上侧入射
        startX = Math.random() * window.innerWidth;
        startY = -50 - Math.random() * 100;
      } else {
        // 40%概率从右侧上半部分入射
        startX = window.innerWidth + 50 + Math.random() * 100;
        startY = Math.random() * (window.innerHeight * 0.5); // 上半部分
      }
      
      // 真随机：使用多个随机数组合，避免重复模式
      const r1 = Math.random();
      const r2 = Math.random();
      const r3 = Math.random();
      const r4 = Math.random();
      const r5 = Math.random();
      const r6 = Math.random();
      
      // 随机延迟和持续时间（真随机，避免重复）
      const delay = r1 * (this.maxDelay - this.minDelay) + this.minDelay;
      const duration = r2 * (this.maxDuration - this.minDuration) + this.minDuration;
      
      // 随机尺寸变化（真随机，更多变化）
      const sizeVariation = 0.6 + r3 * 0.8; // 0.6-1.4倍，更大的变化范围
      const headSize = Math.max(1, Math.floor(1.2 + r4 * 1.0) * sizeVariation); // 1-2.2px，真随机
      const tailLength = Math.floor((30 + r5 * 90) * sizeVariation); // 30-120px，真随机
      const tailHeight = Math.max(0.4, (0.5 + r6 * 0.6) * sizeVariation); // 0.4-1.1px，真随机
      
      // 流星头部（指向运动方向，向右旋转90度，即315度）
      const head = document.createElement('div');
      head.className = 'meteor-head';
      head.style.cssText = `
        position: absolute;
        width: ${headSize}px;
        height: ${headSize}px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 ${1 * sizeVariation}px ${color}, 0 0 ${2 * sizeVariation}px ${color}, 0 0 0 0.3px rgba(255, 255, 255, 0.1);
        opacity: 1;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(315deg);
        animation: meteor-opacity ${duration}s linear ${delay}s;
      `;
      
      // 流星尾部（在头部后面，指向运动方向的反方向，即135度）
      // 315度的反方向是135度
      const tail = document.createElement('div');
      tail.className = 'meteor-tail';
      tail.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${tailLength}px;
        height: ${tailHeight}px;
        transform: translate(-50%, -50%) rotate(135deg) translateX(-${tailLength / 2}px);
        transform-origin: center center;
        background: linear-gradient(to right, transparent, ${color}44, ${color}88, ${color}cc);
        opacity: 0.8;
        z-index: 1;
        filter: blur(${0.2 * sizeVariation}px);
        animation: meteor-opacity ${duration}s linear ${delay}s;
      `;
      
      // 流星透明度通过CSS动画控制，逐渐变暗
      // 初始透明度已经在样式中设置，动画会逐渐降低到0
      
      meteor.appendChild(head);
      meteor.appendChild(tail);
      
      // 设置流星样式
      // 不旋转容器，直接用translateX和translateY实现225度方向移动（从右上到左下）
      // 225度方向：X = -cos(225°) * distance, Y = sin(225°) * distance
      // cos(225°) = -√2/2, sin(225°) = -√2/2
      // 所以 translateX(-distance * √2/2), translateY(distance * √2/2)
      meteor.style.cssText = `
        position: absolute;
        top: ${startY}px;
        left: ${startX}px;
        width: 0;
        height: 0;
        animation: meteor ${duration}s linear ${delay}s infinite;
        pointer-events: none;
        will-change: transform, opacity;
      `;
      
      this.effectElement.appendChild(meteor);
      this.meteors.push(meteor);
      
      // 动画结束后移除流星（避免 DOM 元素过多）
      setTimeout(() => {
        if (meteor.parentNode) {
          meteor.remove();
          const index = this.meteors.indexOf(meteor);
          if (index > -1) {
            this.meteors.splice(index, 1);
          }
        }
      }, (duration + delay) * 1000);
    }

    start() {
      this.isActive = true;
      
      // 创建初始流星
      for (let i = 0; i < this.numMeteors; i++) {
        setTimeout(() => {
          if (this.isActive) {
            this.createMeteor();
          }
        }, i * 100); // 错开创建时间（加快）
      }
      
      // 持续创建新流星（增加流量）
      this.meteorInterval = setInterval(() => {
        if (this.isActive) {
          // 增加流量：更频繁地创建新流星
          if (this.meteors.length < this.numMeteors * 3) {
            this.createMeteor();
          }
        }
      }, 150 + Math.random() * 200); // 每 150-350ms 创建一个新流星（增加流量）
    }

    stop() {
      this.isActive = false;
      
      if (this.meteorInterval) {
        clearTimeout(this.meteorInterval);
        this.meteorInterval = null;
      }
      
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    update(params) {
      if (params.numMeteors !== undefined) {
        this.numMeteors = params.numMeteors;
      }
      if (params.minDelay !== undefined) {
        this.minDelay = params.minDelay;
      }
      if (params.maxDelay !== undefined) {
        this.maxDelay = params.maxDelay;
      }
      if (params.minDuration !== undefined) {
        this.minDuration = params.minDuration;
      }
      if (params.maxDuration !== undefined) {
        this.maxDuration = params.maxDuration;
      }
      if (params.angle !== undefined) {
        this.angle = params.angle;
      }
    }

    destroy() {
      this.stop();
      
      // 移除所有流星
      this.meteors.forEach(meteor => {
        if (meteor.parentNode) {
          meteor.remove();
        }
      });
      this.meteors = [];
      
      if (this.effectElement) {
        this.effectElement.remove();
        this.effectElement = null;
      }
    }
  }

  // 导出
  if (typeof window !== 'undefined') {
    window.MeteorEffect = MeteorEffect;
  }
})();

