<template>
  <section class="ui-paths" :class="'ui-paths--' + variant">
    <div v-if="heading || subheading" class="ui-paths__head">
      <h2 v-if="heading" class="ui-paths__heading">{{ heading }}</h2>
      <p v-if="subheading" class="ui-paths__sub">{{ subheading }}</p>
    </div>

    <div class="ui-paths__grid">
      <article
        v-for="(a, i) in normalized"
        :key="a.key + i"
        class="ui-paths__card"
      >
        <span class="ui-paths__icon" v-html="iconFor(a.icon)" aria-hidden="true"></span>
        <div class="ui-paths__body">
          <span v-if="a.hook" class="ui-paths__hook">{{ a.hook }}</span>
          <h3 class="ui-paths__label">{{ a.label }}</h3>
          <p v-if="a.blurb" class="ui-paths__blurb">{{ a.blurb }}</p>
        </div>
        <a
          v-if="a.href && a.cta"
          :href="a.href"
          class="ui-paths__cta"
          @click="go($event, a.href)"
        >
          {{ a.cta }}
          <span class="ui-paths__arrow" aria-hidden="true">&#8594;</span>
        </a>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'AudiencePaths',
  props: {
    audiences: { type: Array, default: () => [] },
    heading: { type: String, default: '' },
    subheading: { type: String, default: '' },
    variant: { type: String, default: 'grid' } // grid | rail
  },
  data() {
    return {
      icons: {
        compass: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16.2 7.8 13.5 13.5 7.8 16.2 10.5 10.5 16.2 7.8" fill="currentColor" stroke="none"/></svg>',
        cross: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3h-5v5.5H4v5h5.5V21h5v-7.5H20v-5h-5.5V3z"/></svg>',
        hands: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l3-3a2 2 0 0 1 3 0l1 1"/><path d="M19 11l-3-3a2 2 0 0 0-3 0l-1 1"/><path d="M3 11v5a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5v-5"/><path d="M12 9v5"/></svg>',
        gift: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8v13"/><path d="M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z"/></svg>',
        anchor: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V21"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M5 13H3M19 13h2M9 10H15"/></svg>',
        timber: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l9-15 9 15"/><path d="M7.5 13h9"/><path d="M12 5v15"/></svg>',
        journal: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V4z"/><path d="M5 18a2 2 0 0 1 2-2h12"/><path d="M9 7h6M9 11h6"/></svg>'
      }
    };
  },
  computed: {
    normalized() {
      if (!Array.isArray(this.audiences)) return [];
      return this.audiences.map(a => ({
        key: a.key || a.label || a.icon || '',
        icon: a.icon || 'compass',
        label: a.label || '',
        hook: a.hook || '',
        blurb: a.blurb || '',
        cta: a.cta || '',
        href: a.href || ''
      }));
    }
  },
  methods: {
    iconFor(name) {
      return this.icons[name] || this.icons.compass;
    },
    go(ev, href) {
      if (!href || href.charAt(0) !== '#') return; // let normal navigation happen
      const id = href.slice(1);
      const target = document.getElementById(id) ||
        document.querySelector('[name="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!target) return; // anchor not present: fall back to default jump
      ev.preventDefault();
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history && history.replaceState) {
        history.replaceState(null, '', href);
      }
    }
  }
};
</script>

<style scoped>
.ui-paths {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-paths__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-paths__heading {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.ui-paths__sub {
  font-size: 1.05rem;
  color: var(--muted-color, rgba(248, 250, 252, 0.7));
  margin: 0 auto;
  max-width: 48ch;
}

.ui-paths__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.ui-paths__card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--bg-alt-color, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 16px;
  padding: 1.75rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, background 0.3s ease;
}

.ui-paths__card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-color, #38bdf8);
  background: var(--bg-color, rgba(255, 255, 255, 0.06));
}

.ui-paths__icon {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--accent-color, #38bdf8);
  transition: background 0.3s ease, color 0.3s ease;
}

.ui-paths__card:hover .ui-paths__icon {
  background: var(--accent-color, #38bdf8);
  color: #03070f;
}

.ui-paths__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1 1 auto;
}

.ui-paths__hook {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-color, #38bdf8);
}

.ui-paths__label {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}

.ui-paths__blurb {
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
  color: var(--muted-color, rgba(248, 250, 252, 0.72));
}

.ui-paths__cta {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--accent-color, #38bdf8);
  padding: 0.55rem 1rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.16));
  border-radius: 10px;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, gap 0.25s ease;
}

.ui-paths__cta:hover,
.ui-paths__cta:focus-visible {
  background: var(--accent-color, #38bdf8);
  border-color: var(--accent-color, #38bdf8);
  color: #03070f;
  gap: 0.75rem;
}

.ui-paths__arrow {
  font-size: 1.05em;
  line-height: 1;
}

/* rail variant: horizontal scroll-snap row */
.ui-paths--rail .ui-paths__grid {
  display: flex;
  grid-template-columns: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.75rem;
  -webkit-overflow-scrolling: touch;
}

.ui-paths--rail .ui-paths__card {
  flex: 0 0 280px;
  scroll-snap-align: start;
}

@media (max-width: 560px) {
  .ui-paths__grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-paths__card,
  .ui-paths__cta { transition: none; }
  .ui-paths__card:hover { transform: none; }
}
</style>
