<template>
  <div>
    <section class="top"><div class="container stack" style="--gap:14px"><span class="kicker">Para negocios</span><h1 class="h1" style="font-size:clamp(2.2rem,5vw,3.6rem)">Crece con la red Easypoint</h1>
      <div class="seg" role="tablist"><button v-for="t in tabs" :key="t.k" :class="{ on: tab === t.k }" role="tab" :aria-selected="tab === t.k" @click="setTab(t.k)">{{ t.l }}</button></div></div></section>

    <section class="container section" style="padding-top:28px">
      <div class="grid" style="grid-template-columns:1.1fr .9fr;gap:36px;align-items:start" :class="{ one: true }">
        <div class="stack" style="--gap:22px">
          <template v-if="tab === 'punto'">
            <h2 class="h2">Convierte tu local en un punto que paga</h2>
            <p class="lead">Recibe paquetes, vende guías DHL/Estafeta, cobra servicios y abonos de excursiones. Ganas comisión por cada operación. Sin inventario, sin cuotas fijas.</p>
            <ul class="ticks"><li>Alta en minutos, verificación después</li><li>Panel simple para tu celular: cobrar abono, vender servicio, recibir paquete</li><li>Un chofer pasa por tu efectivo en una ruta optimizada: nunca guardas dinero de más</li><li>Comisiones transparentes y liquidación puntual</li></ul>
            <div class="card card-pad stack" style="--gap:12px"><h3 class="h3">Calcula tu ingreso mensual</h3>
              <div class="field"><label>Paquetes recibidos por día: <b>{{ c.pk }}</b></label><input type="range" min="0" max="40" v-model.number="c.pk" /></div>
              <div class="field"><label>Guías vendidas por semana: <b>{{ c.gu }}</b></label><input type="range" min="0" max="40" v-model.number="c.gu" /></div>
              <div class="field"><label>Servicios y abonos por día: <b>{{ c.sv }}</b></label><input type="range" min="0" max="60" v-model.number="c.sv" /></div>
              <div class="row between"><span class="muted small">Estimado mensual (referencial)</span><b class="h2 num grad">{{ EP.fmt.money(income) }}</b></div></div>
          </template>
          <template v-else-if="tab === 'proveedor'">
            <h2 class="h2">Llena tus salidas sin perseguir pagos</h2>
            <p class="lead">Publica tus experiencias con fechas y cupo. Easypoint cobra el apartado, manda recordatorios, hace tu manifiesto digital y <b>te paga en 2 días</b> al completar la salida.</p>
            <ul class="ticks"><li>Apartado y pagos en abonos cobrados por nosotros</li><li>Manifiesto y check-in por QR desde tu celular</li><li>Alertas automáticas de cupo mínimo y alta demanda</li><li>Fee de {{ EP.config['_fee'] || 15 }}% sólo sobre lo que efectivamente se realiza</li></ul>
            <div class="card card-pad stack" style="--gap:12px"><h3 class="h3">Compara</h3>
              <div class="field"><label>Pasajeros al mes: <b>{{ c.pax }}</b></label><input type="range" min="10" max="400" step="10" v-model.number="c.pax" /></div>
              <div class="field"><label>Precio promedio: <b>{{ EP.fmt.money(c.price) }}</b></label><input type="range" min="400" max="3000" step="50" v-model.number="c.price" /></div>
              <div class="grid g2" style="--gap:12px"><div class="kpi"><div class="l">Ventas del mes</div><div class="v num">{{ EP.fmt.money(c.pax * c.price) }}</div></div><div class="kpi" data-tone="ok"><div class="l">Tú cobras (−15%)</div><div class="v num">{{ EP.fmt.money(c.pax * c.price * 0.85) }}</div></div></div></div>
          </template>
          <template v-else>
            <h2 class="h2">Entrega tus pedidos en puntos Easypoint</h2>
            <p class="lead">Tus clientes eligen un punto cerca de casa en el checkout; tú envías ahí. Menos intentos fallidos, más entregas.</p>
            <ul class="ticks"><li>Plugins para Shopify y WooCommerce</li><li>API REST con llave: lista puntos, crea envíos, rastrea</li><li>Alertas automáticas al cliente cuando su paquete llega</li></ul>
            <div class="code"><div class="tiny muted">Crear un envío hacia un punto</div><pre>curl -X POST {{ origin }}{{ EP.apiBase }}/v1/shipments \
  -H "X-API-Key: epk_xxxxxxxx_..." \
  -H "Content-Type: application/json" \
  -d '{"tracking_id":"PED-1042","point_id":3,
       "recipient_name":"Ana López",
       "recipient_phone":"4421234567"}'</pre><div class="tiny muted">GET {{ EP.apiBase }}/v1/points · GET {{ EP.apiBase }}/v1/track/&lt;id&gt;</div></div>
          </template>
        </div>

        <aside class="card card-pad stack" style="--gap:14px;position:sticky;top:84px" v-if="!sent">
          <h3 class="h3">{{ tab === 'punto' ? 'Solicita tu alta' : tab === 'proveedor' ? 'Cuéntanos de tus experiencias' : 'Hablemos de tu integración' }}</h3>
          <form class="stack" style="--gap:12px" @submit.prevent="submit" novalidate>
            <div class="field"><label for="b">{{ tab === 'punto' ? 'Nombre del negocio' : tab === 'proveedor' ? 'Nombre de tu empresa' : 'Tu tienda o plataforma' }} *</label><input id="b" class="input" v-model.trim="f.business_name" /></div>
            <div class="grid g2" style="--gap:10px"><div class="field"><label for="cn">Tu nombre</label><input id="cn" class="input" v-model.trim="f.contact_name" autocomplete="name" /></div><div class="field"><label for="ph">WhatsApp *</label><input id="ph" class="input" type="tel" v-model.trim="f.contact_phone" autocomplete="tel" /></div></div>
            <div class="field"><label for="em">Correo</label><input id="em" class="input" type="email" v-model.trim="f.email" autocomplete="email" /></div>
            <template v-if="tab === 'punto'"><div class="field"><label for="ad">Dirección</label><input id="ad" class="input" v-model.trim="f.address" autocomplete="street-address" /></div>
              <div class="grid g2" style="--gap:10px"><div class="field"><label for="ho">Horario</label><input id="ho" class="input" v-model.trim="f.horarios" placeholder="L-S 9:00-19:00" /></div><div class="field"><label for="mp">Enlace de Google Maps</label><input id="mp" class="input" v-model.trim="f.maps_url" placeholder="Opcional" /></div></div></template>
            <div class="field"><label for="ds">Cuéntanos más</label><textarea id="ds" class="textarea" v-model="f.description" :placeholder="tab === 'punto' ? '¿Qué tipo de negocio es? ¿Cuánta afluencia tienes?' : tab === 'proveedor' ? '¿Qué experiencias ofreces y dónde?' : '¿Qué plataforma usas y cuántos pedidos al mes?'"></textarea></div>
            <input type="text" v-model="f.website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />
            <div class="error" v-if="error">{{ error }}</div>
            <button class="btn btn-primary btn-lg btn-block" :class="{ 'is-loading': busy }"><span v-if="busy" class="spin"></span> Enviar solicitud</button>
            <p class="tiny muted">Te contactamos en menos de {{ EP.config['ops.application_sla_h'] || 24 }} horas.</p>
          </form>
        </aside>
        <aside class="card card-pad center stack" style="--gap:12px;align-content:center" v-else><div class="ok-badge"><ep-ico name="check" :size="34" :stroke="3" /></div><h3 class="h3">¡Recibimos tu solicitud!</h3><p class="muted">Te escribiremos por WhatsApp muy pronto. Mientras tanto, conoce cómo funciona la red.</p><a :href="EP.href('/')" class="btn btn-dark">Volver al inicio</a></aside>
      </div>
    </section>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, origin: location.origin, tab: EP.route.query.t || 'punto', sent: false, busy: false, error: '', t0: Date.now(), c: { pk: 10, gu: 6, sv: 12, pax: 80, price: 1200 },
      f: { business_name: '', contact_name: '', contact_phone: '', email: '', address: '', horarios: '', maps_url: '', description: '', website: '' },
      tabs: [{ k: 'punto', l: 'Tengo un local' }, { k: 'proveedor', l: 'Organizo excursiones' }, { k: 'ecommerce', l: 'Vendo en línea' }] };
  },
  computed: { income() { return Math.round(this.c.pk * 30 * 6 + this.c.gu * 4.3 * 22 + this.c.sv * 30 * 7); } },
  methods: {
    setTab(k) { this.tab = k; EP.setQuery({ t: k === 'punto' ? '' : k }); },
    async submit() {
      this.error = '';
      if (this.f.business_name.length < 3 || this.f.contact_phone.replace(/\D/g, '').length < 10) { this.error = 'Indica el nombre y un WhatsApp de 10 dígitos.'; return; }
      this.busy = true;
      try {
        if (this.tab === 'ecommerce') await EP.post('/public/leads', { name: this.f.business_name + ' · ' + this.f.contact_name, phone: this.f.contact_phone, email: this.f.email, type: 'ecommerce', message: this.f.description, utm: EP.utm(), page: 'afiliate', elapsed_ms: Date.now() - this.t0, website: this.f.website });
        else await EP.post('/public/applications', { ...this.f, whatsapp: this.f.contact_phone, kind: this.tab, utm: EP.utm() });
        this.sent = true;
      } catch (e) { this.error = e.message; } finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.top { padding: 56px 0 8px; background: radial-gradient(900px 300px at 80% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 65%); }
.ticks { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; } .ticks li { padding-left: 30px; position: relative; } .ticks li::before { content: '✓'; position: absolute; left: 0; top: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-size: .78rem; font-weight: 900; }
.code { background: #0b1220; color: #d9f99d; border-radius: var(--r); padding: 18px; overflow: auto; } .code pre { margin: 8px 0; font-size: .82rem; white-space: pre-wrap; } input[type=range] { accent-color: var(--brand-2); width: 100%; }
.ok-badge { width: 76px; height: 76px; border-radius: 50%; margin: 0 auto; display: grid; place-items: center; background: var(--brand); color: var(--on-brand); }
@media (max-width: 900px) { .grid[style*="1.1fr"] { grid-template-columns: 1fr !important; } aside { position: static !important; } }
</style>
