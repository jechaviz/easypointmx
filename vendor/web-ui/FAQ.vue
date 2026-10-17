<template>
  <section class="ui-faq">
    <div v-if="heading" class="ui-faq__head">
      <h2 class="ui-faq__heading">{{ heading }}</h2>
    </div>

    <div class="ui-faq__list">
      <div
        v-for="(item, i) in normalized"
        :key="'faq-' + i"
        class="ui-faq__item"
        :class="{ 'is-open': openIndex === i }"
      >
        <h3 class="ui-faq__qrow">
          <button
            type="button"
            class="ui-faq__trigger"
            :id="uid + '-btn-' + i"
            :aria-expanded="openIndex === i ? 'true' : 'false'"
            :aria-controls="uid + '-panel-' + i"
            @click="toggle(i)"
            @keydown="onKey($event, i)"
          >
            <span class="ui-faq__q">{{ item.q }}</span>
            <span class="ui-faq__sign" aria-hidden="true"></span>
          </button>
        </h3>
        <div
          class="ui-faq__panel"
          :id="uid + '-panel-' + i"
          role="region"
          :aria-labelledby="uid + '-btn-' + i"
          :hidden="openIndex !== i"
        >
          <div class="ui-faq__answer">{{ item.a }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
let _faqSeq = 0;

export default {
  name: 'FAQ',
  props: {
    items: { type: Array, default: () => [] },
    heading: { type: String, default: '' }
  },
  data() {
    _faqSeq += 1;
    return {
      uid: 'ui-faq-' + _faqSeq,
      openIndex: -1
    };
  },
  computed: {
    normalized() {
      if (!Array.isArray(this.items)) return [];
      return this.items.map(it => ({
        q: it.q || '',
        a: it.a || ''
      }));
    }
  },
  methods: {
    toggle(i) {
      this.openIndex = this.openIndex === i ? -1 : i;
    },
    onKey(ev, i) {
      const last = this.normalized.length - 1;
      let next = null;
      switch (ev.key) {
        case 'ArrowDown': next = i >= last ? 0 : i + 1; break;
        case 'ArrowUp': next = i <= 0 ? last : i - 1; break;
        case 'Home': next = 0; break;
        case 'End': next = last; break;
        default: return;
      }
      ev.preventDefault();
      this.focusTrigger(next);
    },
    focusTrigger(i) {
      this.$nextTick(() => {
        const el = this.$el.querySelector('#' + this.uid + '-btn-' + i);
        if (el) el.focus();
      });
    }
  }
};
</script>

<style scoped>
.ui-faq {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-faq__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-faq__heading {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.ui-faq__list {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.ui-faq__item {
  background: var(--bg-alt-color, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.ui-faq__item.is-open {
  border-color: var(--accent-color, #38bdf8);
}

.ui-faq__qrow {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
}

.ui-faq__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 1.15rem 1.4rem;
  cursor: pointer;
}

.ui-faq__trigger:focus-visible {
  outline: 2px solid var(--accent-color, #38bdf8);
  outline-offset: -2px;
  border-radius: 12px;
}

.ui-faq__q {
  font-size: 1.02rem;
  font-weight: 600;
}

.ui-faq__sign {
  position: relative;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.ui-faq__sign::before,
.ui-faq__sign::after {
  content: '';
  position: absolute;
  background: var(--accent-color, #38bdf8);
  border-radius: 2px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* horizontal bar */
.ui-faq__sign::before {
  top: 8px;
  left: 0;
  width: 18px;
  height: 2px;
}

/* vertical bar (hidden when open -> minus) */
.ui-faq__sign::after {
  top: 0;
  left: 8px;
  width: 2px;
  height: 18px;
}

.ui-faq__item.is-open .ui-faq__sign::after {
  transform: scaleY(0);
  opacity: 0;
}

.ui-faq__panel {
  padding: 0 1.4rem 1.25rem;
}

.ui-faq__panel[hidden] {
  display: none;
}

.ui-faq__answer {
  font-size: 0.97rem;
  line-height: 1.6;
  color: var(--muted-color, rgba(248, 250, 252, 0.78));
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  padding-top: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .ui-faq__item,
  .ui-faq__sign::before,
  .ui-faq__sign::after { transition: none; }
}
</style>
