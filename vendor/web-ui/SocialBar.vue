<template>
  <section class="ui-social" :class="'ui-social--' + variant">
    <div v-if="heading" class="ui-social__head">
      <h2 class="ui-social__heading">{{ heading }}</h2>
      <p v-if="subheading" class="ui-social__sub">{{ subheading }}</p>
    </div>

    <div class="ui-social__grid">
      <a
        v-for="item in normalized"
        :key="item.platform + item.url"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="ui-social__card"
        :class="'is-' + item.platform"
      >
        <span class="ui-social__icon" v-html="iconFor(item.platform)" aria-hidden="true"></span>
        <span class="ui-social__details">
          <strong class="ui-social__name">{{ item.label }}</strong>
          <span v-if="item.note" class="ui-social__note">{{ item.note }}</span>
        </span>
      </a>
    </div>
  </section>
</template>

<script>
export default {
  name: 'SocialBar',
  props: {
    links: { type: [Object, Array], default: () => ({}) },
    heading: { type: String, default: '' },
    subheading: { type: String, default: '' },
    variant: { type: String, default: 'default' } // default | inline | compact
  },
  data() {
    return {
      meta: {
        youtube: { label: 'YouTube', note: 'Watch the latest videos' },
        facebook: { label: 'Facebook', note: 'Join the community' },
        instagram: { label: 'Instagram', note: 'Photo stories' },
        x: { label: 'X', note: 'Live updates' },
        twitter: { label: 'X', note: 'Live updates' },
        tiktok: { label: 'TikTok', note: 'Short clips' }
      },
      icons: {
        youtube: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
        facebook: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
        instagram: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.12-1.38 5.86 5.86 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.12A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/></svg>',
        x: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3L17.61 20.65z"/></svg>',
        tiktok: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.04-2.82h-3.1v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12v-3.16a5.7 5.7 0 0 0-.77-.05 5.71 5.71 0 1 0 5.71 5.71V9.01a7.35 7.35 0 0 0 4.29 1.37V7.28a4.28 4.28 0 0 1-3.27-1.46z"/></svg>',
        link: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
      }
    };
  },
  computed: {
    normalized() {
      const out = [];
      if (Array.isArray(this.links)) {
        this.links.forEach(l => {
          if (!l || !l.url) return;
          const platform = this.resolvePlatform(l.platform || l.url);
          const m = this.meta[platform] || {};
          out.push({
            platform,
            url: l.url,
            label: l.label || m.label || platform,
            note: l.note != null ? l.note : (m.note || '')
          });
        });
      } else if (this.links && typeof this.links === 'object') {
        Object.keys(this.links).forEach(key => {
          const url = this.links[key];
          if (!url || typeof url !== 'string') return;
          const platform = this.resolvePlatform(key);
          const m = this.meta[platform] || {};
          out.push({
            platform,
            url,
            label: m.label || this.titleCase(key),
            note: m.note || ''
          });
        });
      }
      return out;
    }
  },
  methods: {
    resolvePlatform(raw) {
      const s = String(raw || '').toLowerCase();
      if (s.includes('youtu')) return 'youtube';
      if (s.includes('facebook') || s.includes('fb.')) return 'facebook';
      if (s.includes('instagram') || s.includes('insta')) return 'instagram';
      if (s.includes('tiktok')) return 'tiktok';
      if (s === 'x' || s === 'twitter' || s.includes('twitter') || s.includes('x.com')) return 'x';
      return 'link';
    },
    iconFor(platform) {
      return this.icons[platform] || this.icons.link;
    },
    titleCase(s) {
      return String(s).charAt(0).toUpperCase() + String(s).slice(1);
    }
  }
};
</script>

<style scoped>
.ui-social {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-social__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-social__heading {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.ui-social__sub {
  font-size: 1.05rem;
  color: var(--muted-color, rgba(248, 250, 252, 0.7));
  margin: 0;
}

.ui-social__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  justify-content: center;
}

.ui-social__card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background: var(--bg-alt-color, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  padding: 1.25rem 1.75rem;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  min-width: 260px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, background 0.3s ease;
}

.ui-social__card:hover {
  transform: translateY(-3px);
  background: var(--bg-color, rgba(255, 255, 255, 0.07));
  border-color: var(--accent-color, #38bdf8);
}

.ui-social__icon {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  color: var(--accent-color, #38bdf8);
  transition: background 0.3s ease, color 0.3s ease;
}

.ui-social__card:hover .ui-social__icon {
  background: var(--accent-color, #38bdf8);
  color: #03070f;
}

.ui-social__details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ui-social__name {
  font-size: 1.05rem;
  font-weight: 700;
}

.ui-social__note {
  font-size: 0.8rem;
  color: var(--muted-color, rgba(248, 250, 252, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* inline variant: tighter pill row */
.ui-social--inline .ui-social__card {
  min-width: 0;
  padding: 0.65rem 1.1rem;
  gap: 0.7rem;
}

.ui-social--inline .ui-social__icon {
  width: 34px;
  height: 34px;
}

.ui-social--inline .ui-social__note { display: none; }

/* compact variant: icon-only chips */
.ui-social--compact .ui-social__details { display: none; }

.ui-social--compact .ui-social__card {
  min-width: 0;
  padding: 0.75rem;
  border-radius: 50%;
}

.ui-social--compact .ui-social__icon {
  background: transparent;
}

@media (max-width: 560px) {
  .ui-social__card { min-width: 0; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-social__card { transition: none; }
  .ui-social__card:hover { transform: none; }
}
</style>
