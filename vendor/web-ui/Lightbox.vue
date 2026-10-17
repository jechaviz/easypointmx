<template>
  <div
    v-if="open"
    class="lb-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="label"
    ref="overlay"
    tabindex="-1"
    @click.self="close"
    @keydown="onKeydown"
  >
      <button class="lb-close" type="button" aria-label="Close" ref="closeBtn" @click="close">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <button
        v-if="items.length > 1"
        class="lb-nav lb-prev"
        type="button"
        aria-label="Previous"
        @click="prev"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <figure class="lb-figure" @click.stop>
        <img :src="current.src" :alt="current.title || current.caption || ''" class="lb-img" />
        <figcaption v-if="hasMeta" class="lb-caption">
          <span v-if="current.tag" class="lb-tag">{{ current.tag }}</span>
          <strong v-if="current.title" class="lb-title">{{ current.title }}</strong>
          <span v-if="current.caption" class="lb-text">{{ current.caption }}</span>
          <span v-if="items.length > 1" class="lb-counter">{{ index + 1 }} / {{ items.length }}</span>
        </figcaption>
      </figure>

      <button
        v-if="items.length > 1"
        class="lb-nav lb-next"
        type="button"
        aria-label="Next"
        ref="lastBtn"
        @click="next"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
  </div>
</template>

<script>
export default {
  name: 'Lightbox',
  props: {
    items: { type: Array, default: () => [] },
    open: { type: Boolean, default: false },
    startIndex: { type: Number, default: 0 },
    label: { type: String, default: 'Image viewer' }
  },
  data() {
    return { index: this.startIndex };
  },
  computed: {
    current() {
      return this.items[this.index] || {};
    },
    hasMeta() {
      return !!(this.current.title || this.current.caption || this.current.tag);
    }
  },
  watch: {
    startIndex(v) { this.index = v; },
    open(v) {
      if (v) {
        this.index = this.startIndex;
        document.body.style.overflow = 'hidden';
        this.$nextTick(() => {
          const el = this.$refs.overlay;
          if (el) el.focus();
        });
      } else {
        document.body.style.overflow = '';
      }
    }
  },
  beforeUnmount() {
    document.body.style.overflow = '';
  },
  methods: {
    close() { this.$emit('close'); },
    next() {
      if (!this.items.length) return;
      this.index = (this.index + 1) % this.items.length;
    },
    prev() {
      if (!this.items.length) return;
      this.index = (this.index - 1 + this.items.length) % this.items.length;
    },
    onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      else if (e.key === 'Tab') {
        // simple focus trap inside the overlay
        const focusables = this.$refs.overlay.querySelectorAll('button');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
  }
};
</script>

<style scoped>
.lb-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vw, 3rem);
  background: rgba(3, 7, 18, 0.92);
  backdrop-filter: blur(6px);
  outline: none;
  font-family: inherit;
  animation: lb-fade-in 0.25s ease;
}

@keyframes lb-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lb-figure {
  margin: 0;
  max-width: min(1100px, 92vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.lb-img {
  max-width: 100%;
  max-height: 76vh;
  width: auto;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  object-fit: contain;
  background: var(--bg-alt-color, #0f172a);
}

.lb-caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  color: #f8fafc;
  max-width: 640px;
}

.lb-tag {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: var(--accent-color, #38bdf8);
}

.lb-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.lb-text {
  font-size: 0.9rem;
  opacity: 0.78;
  line-height: 1.5;
}

.lb-counter {
  font-size: 0.75rem;
  opacity: 0.55;
  letter-spacing: 0.1em;
}

.lb-close,
.lb-nav {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.lb-close {
  top: clamp(1rem, 3vw, 2rem);
  right: clamp(1rem, 3vw, 2rem);
  width: 44px;
  height: 44px;
}

.lb-nav {
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
}

.lb-prev { left: clamp(0.5rem, 2vw, 2rem); }
.lb-next { right: clamp(0.5rem, 2vw, 2rem); }

.lb-close:hover,
.lb-nav:hover {
  background: var(--accent-color, #38bdf8);
  border-color: transparent;
  color: #03070f;
}

.lb-nav:hover { transform: translateY(-50%) scale(1.06); }

@media (prefers-reduced-motion: reduce) {
  .lb-overlay { backdrop-filter: none; animation: none; }
  .lb-close,
  .lb-nav { transition: none; }
  .lb-nav:hover { transform: translateY(-50%); }
}

@media (max-width: 640px) {
  .lb-nav { width: 42px; height: 42px; }
  .lb-prev { left: 0.5rem; }
  .lb-next { right: 0.5rem; }
}
</style>
