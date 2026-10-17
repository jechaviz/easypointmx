<template>
  <div class="row wrap" style="gap:8px">
    <a v-for="n in nets" :key="n.k" class="chip" :href="n.href" target="_blank" rel="noopener" @click="n.k === 'copy' && copy($event)">{{ n.icon }} {{ n.label }}</a>
  </div>
</template>
<script>
export default {
  props: { url: String, text: String, title: String },
  computed: {
    nets() {
      const base = { url: this.url, text: this.text, title: this.title, campaign: 'share' };
      const mk = (k, icon, label) => { let href = '#'; try { href = EP.share ? EP.share(k, base) : '#'; } catch (_) {} return { k, icon, label, href }; };
      return [mk('whatsapp', '💬', 'WhatsApp'), mk('facebook', '📘', 'Facebook'), mk('x', '✖', 'X'), mk('telegram', '✈', 'Telegram'), mk('email', '✉', 'Correo'), { k: 'copy', icon: '🔗', label: 'Copiar enlace', href: '#' }];
    }
  },
  methods: { copy(e) { e.preventDefault(); EP.copy(this.url); } }
};
</script>
