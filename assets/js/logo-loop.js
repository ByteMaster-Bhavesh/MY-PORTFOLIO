/**
 * LogoLoop — High-Performance Continuous Ticker Loop
 * Matches the exact behavior, mathematical easing, and configuration
 * of the React Bits LogoLoop component in pure, dependency-free JavaScript.
 */

(function () {
  const ANIMATION_CONFIG = {
    SMOOTH_TAU: 0.25,
    MIN_COPIES: 2,
    COPY_HEADROOM: 2
  };

  class LogoLoopInstance {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        speed: 80,            // Pixels per second
        direction: 'left',
        gap: 32,
        pauseOnHover: true,
        hoverSpeed: 0
      }, options);

      if (container.dataset.speed) this.options.speed = parseFloat(container.dataset.speed);
      if (container.dataset.direction) this.options.direction = container.dataset.direction;
      if (container.dataset.hoverSpeed !== undefined) this.options.hoverSpeed = parseFloat(container.dataset.hoverSpeed);
      if (container.dataset.pauseOnHover !== undefined) this.options.pauseOnHover = container.dataset.pauseOnHover === 'true';

      this.track = container.querySelector('.logoloop__track');
      this.firstList = container.querySelector('.logoloop__list');

      if (!this.track || !this.firstList) return;

      this.isHovered = false;
      this.offset = 0;
      this.velocity = 0;
      this.lastTimestamp = null;
      this.seqWidth = 0;
      this.copyCount = ANIMATION_CONFIG.MIN_COPIES;
      this.rafId = null;

      this.init();
    }

    init() {
      // Calculate target velocity based on speed and direction
      const magnitude = Math.abs(this.options.speed);
      const directionMultiplier = this.options.direction === 'left' ? 1 : -1;
      this.targetVelocity = magnitude * directionMultiplier;
      this.velocity = this.targetVelocity;

      // Event listeners for hover pause
      this.track.addEventListener('mouseenter', () => {
        this.isHovered = true;
      });
      this.track.addEventListener('mouseleave', () => {
        this.isHovered = false;
      });

      // Dimension observer & cloning
      this.updateDimensions();

      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.updateDimensions());
        this.ro.observe(this.container);
      } else {
        window.addEventListener('resize', () => this.updateDimensions());
      }

      // Start animation loop
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    updateDimensions() {
      const containerWidth = this.container.clientWidth || window.innerWidth;
      const sequenceRect = this.firstList.getBoundingClientRect();
      const sequenceWidth = sequenceRect.width;

      if (sequenceWidth > 0) {
        this.seqWidth = Math.ceil(sequenceWidth);
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        const totalCopies = Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded);

        // Ensure track has required number of list copies
        const existingLists = this.track.querySelectorAll('.logoloop__list');
        const currentCount = existingLists.length;

        if (currentCount < totalCopies) {
          for (let i = currentCount; i < totalCopies; i++) {
            const clone = this.firstList.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            this.track.appendChild(clone);
          }
        }
      }
    }

    animate(timestamp) {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      // Determine target velocity based on hover state
      let target = this.targetVelocity;
      if (this.isHovered && this.options.pauseOnHover) {
        target = this.options.hoverSpeed !== undefined ? this.options.hoverSpeed : 0;
      }

      // Exponential easing toward target velocity
      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      this.velocity += (target - this.velocity) * easingFactor;

      if (this.seqWidth > 0) {
        let nextOffset = this.offset + this.velocity * deltaTime;
        nextOffset = ((nextOffset % this.seqWidth) + this.seqWidth) % this.seqWidth;
        this.offset = nextOffset;

        this.track.style.transform = `translate3d(${-this.offset}px, 0, 0)`;
      }

      this.rafId = requestAnimationFrame(this.animate);
    }

    destroy() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.ro) this.ro.disconnect();
    }
  }

  function initAllLogoLoops() {
    const loops = document.querySelectorAll('.logoloop');
    loops.forEach(container => {
      if (container.dataset.logoloopInit) return;
      container.dataset.logoloopInit = 'true';
      new LogoLoopInstance(container);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllLogoLoops);
  } else {
    initAllLogoLoops();
  }

  window.LogoLoopInstance = LogoLoopInstance;
})();
