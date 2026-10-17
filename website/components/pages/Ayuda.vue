<template>
  <div class="container section" style="max-width:980px">
    <div class="stack" style="--gap:10px"><span class="kicker">Ayuda</span><h1 class="h2">¿En qué te ayudamos?</h1><p class="lead">Respuestas rápidas y, si prefieres, un canal privado: tu caso llega directo a nuestro equipo, no a redes sociales.</p></div>
    <div class="grid g3 mt-3" style="--gap:14px"><a v-for="s in shortcuts" :key="s.t" :href="EP.href(s.to)" class="card card-hover card-pad stack" style="--gap:6px"><ep-ico :name="s.i" :size="24" /><b>{{ s.t }}</b><span class="small muted">{{ s.d }}</span></a></div>
    <div class="grid mt-4" style="grid-template-columns:1.1fr .9fr;gap:32px;align-items:start" id="ay">
      <FAQ :items="faq" heading="Preguntas frecuentes" />
      <aside class="card card-pad stack" style="--gap:12px" v-if="!sent"><h2 class="h3">Escríbenos en privado</h2>
        <p class="small muted">Respondemos en menos de {{ EP.config['support.sla_first_response_h'] || 2 }} horas en horario de atención.</p>
        <form class="stack" style="--gap:12px" @submit.prevent="submit" novalidate>
          <div class="field"><label for="k">Tipo</label><select id="k" class="select" v-model="f.kind"><option value="question">Tengo una duda</option><option value="complaint">Algo salió mal</option><option value="refund_request">Cambio o crédito</option></select></div>
          <div class="field"><label for="r">Folio de reserva (opcional)</label><input id="r" class="input" v-model.trim="f.subject_ref" placeholder="EP-BK-…" /></div>
          <div class="grid g2" style="--gap:10px"><div class="field"><label for="n">Nombre</label><input id="n" class="input" v-model.trim="f.customer_name" autocomplete="name" /></div><div class="field"><label for="p">WhatsApp</label><input id="p" class="input" type="tel" v-model.trim="f.customer_phone" autocomplete="tel" /></div></div>
          <div class="field"><label for="e">Correo</label><input id="e" class="input" type="email" v-model.trim="f.customer_email" autocomplete="email" /></div>
          <div class="field"><label for="m">Cuéntanos qué pasó *</label><textarea id="m" class="textarea" v-model="f.message"></textarea></div>
          <input type="text" v-model="f.website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />
          <div class="error" v-if="error">{{ error }}</div>
          <button class="btn btn-primary btn-block" :class="{ 'is-loading': busy }">Enviar</button>
        </form></aside>
      <aside class="card card-pad center stack" style="--gap:10px" v-else><div style="font-size:2.4rem">💬</div><h2 class="h3">Recibimos tu mensaje</h2><p class="muted small">Folio <b class="tag-mono">{{ sent }}</b>. Te contactaremos pronto.</p></aside>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, sent: '', busy: false, error: '', f: { kind: 'question', subject_ref: EP.route.query.ref || '', customer_name: '', customer_phone: '', customer_email: '', message: '', website: '' },
      shortcuts: [{ i: 'qr', t: 'Mi voucher', d: 'Paga, cambia fecha o cancela.', to: '/voucher' }, { i: 'package', t: 'Rastrear paquete', d: 'Dónde está y cuándo llega.', to: '/rastreo' }, { i: 'wallet', t: 'Política de crédito', d: 'Cómo funciona tu abono.', to: '/legal/credito' }],
      faq: [
        { q: '¿Cómo cambio la fecha de mi excursión?', a: 'Abre tu voucher y toca "Cambiar fecha". El primer cambio es gratis; con Easypoint Protege o Club siempre lo es. Necesitas hacerlo con al menos 3 días de anticipación.' },
        { q: '¿Puedo pedir reembolso?', a: 'Easypoint no reembolsa en efectivo: tu abono se convierte en crédito vigente 12 meses. Con Easypoint Protege, si cancelas con 7 o más días, recuperas el 80% a tu forma de pago original.' },
        { q: '¿Qué pasa si no alcanzo a pagar todo?', a: 'Si llegas a la fecha límite con saldo pendiente, tu lugar se libera y lo que abonaste pasa a crédito. Nada se pierde.' },
        { q: '¿Cómo abono en efectivo?', a: 'Ve a cualquier punto Easypoint con tu folio. El operador registra tu abono al instante y verás tu saldo actualizado en tu voucher.' },
        { q: '¿La salida puede cancelarse?', a: 'Sí, por clima o por cupo mínimo del proveedor. En ese caso te avisamos y tu pago se convierte en crédito (con bono si la causa es del proveedor).' },
        { q: '¿Cómo uso mi crédito?', a: 'Se aplica automáticamente a tu siguiente reserva cuando usas el mismo teléfono. También puedes pedirlo en un punto.' },
        { q: '¿Mi paquete no aparece en el rastreo?', a: 'Puede tardar unas horas en registrarse. Si pasan más de 24 horas, escríbenos con tu número de rastreo.' }
      ] };
  },
  methods: {
    async submit() {
      this.error = '';
      if (this.f.message.trim().length < 5) { this.error = 'Cuéntanos qué pasó.'; return; }
      this.busy = true;
      try { const r = await EP.post('/public/tickets', this.f); this.sent = r.code || 'TK'; } catch (e) { this.error = e.message; } finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>@media (max-width: 860px) { #ay { grid-template-columns: 1fr !important; } }</style>
