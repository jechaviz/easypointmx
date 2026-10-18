<template>
  <div class="su">
    <aside class="rail">
      <a :href="EP.root + 'website/'" class="brand row"><img :src="EP.root + 'website/icon.svg'" width="34" height="34" alt="" /><span class="wm">easy<b>point</b></span></a>
      <div class="ring-wrap">
        <svg viewBox="0 0 44 44" width="64" height="64" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" stroke-width="5" /><circle cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" stroke-width="5" stroke-linecap="round" :stroke-dasharray="113.1" :stroke-dashoffset="113.1 * (1 - pct / 100)" transform="rotate(-90 22 22)" style="transition:stroke-dashoffset .5s" /></svg>
        <div><b class="h3">{{ pct }}%</b><div class="tiny muted">{{ doneCount }} de {{ steps.length }} pasos</div></div>
      </div>
      <nav class="steps" aria-label="Pasos de configuración">
        <button v-for="(s, i) in steps" :key="s.key" class="st" :class="{ on: cur === s.key, ok: s.done }" @click="go(s.key)" :disabled="locked && s.key !== 'account'">
          <span class="dot">{{ s.done ? '✓' : i + 1 }}</span>
          <span class="lbl"><b>{{ s.label }}</b><small v-if="s.detail" :class="{ warn: !s.done && s.required }">{{ s.detail }}</small></span>
          <em v-if="!s.required && !s.done" class="opt">opcional</em>
        </button>
      </nav>
    </aside>

    <main class="panel">
      <div v-if="loading" class="skeleton" style="height:320px"></div>

      <!-- 0 · cuenta del dueño -->
      <section v-else-if="cur === 'account'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Paso 1</span><h2 class="h2">Crea tu cuenta de administrador</h2><p class="muted">Será la dueña de este Easypoint. Después podrás invitar a tu equipo.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="createAdmin">
          <div class="grid g2"><div class="field"><label>Tu nombre</label><input class="input" v-model.trim="f.name" autocomplete="name" /></div>
            <div class="field"><label>WhatsApp (opcional)</label><input class="input" v-model.trim="f.phone" inputmode="tel" autocomplete="tel" /></div></div>
          <div class="field"><label>Correo</label><input class="input" type="email" v-model.trim="f.email" autocomplete="username" /></div>
          <div class="field"><label>Contraseña (mínimo 10 caracteres)</label><input class="input" type="password" v-model="f.password" autocomplete="new-password" /><meter min="0" max="4" :value="strength" class="meter"></meter></div>
          <div class="field" v-if="status.token_required"><label>Código de instalación</label><input class="input" v-model.trim="f.token" /><small class="muted">Está en el archivo de configuración del servidor (EP_SETUP_TOKEN).</small></div>
          <div class="error" v-if="err">{{ err }}</div>
          <div class="row between wrap"><a v-if="status.demo_available" :href="EP.root + 'demo/'" class="link small">Mejor quiero probar la demostración</a><button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }">Crear cuenta y continuar</button></div>
        </form>
      </section>

      <!-- sin sesión -->
      <section v-else-if="!isAdmin" class="card card-pad stack center" style="--gap:12px"><h2 class="h2">Inicia sesión como administrador</h2><p class="muted">La configuración sólo la puede hacer el administrador del negocio.</p><a class="btn btn-primary" :href="EP.href('/login')">Entrar</a></section>

      <!-- 1 · negocio -->
      <section v-else-if="cur === 'business'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Tu negocio</span><h2 class="h2">¿Cómo te llamas ante tus clientes?</h2><p class="muted">Lo ven tus clientes en el sitio, los vouchers y los mensajes. Los datos fiscales son opcionales hoy, pero los pedirá la facturación.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="save('business', f.biz, 'Datos guardados')">
          <div class="field"><label>Nombre comercial *</label><input class="input" v-model.trim="f.biz.brand_name" placeholder="Easypoint Querétaro" /></div>
          <details :open="!!f.biz.rfc || !!f.biz.legal_name"><summary class="small bold">Datos fiscales (razón social y RFC)</summary>
            <div class="grid g2 mt-2">
              <div class="field"><label>Razón social</label><input class="input" v-model.trim="f.biz.legal_name" /></div>
              <div class="field"><label>RFC</label><input class="input" v-model.trim="f.biz.rfc" maxlength="13" style="text-transform:uppercase" /></div>
              <div class="field"><label>Régimen fiscal (clave)</label><input class="input" v-model.trim="f.biz.regime" maxlength="3" placeholder="601" /></div>
              <div class="field"><label>Código postal fiscal</label><input class="input" v-model.trim="f.biz.zip" maxlength="5" inputmode="numeric" /></div>
            </div></details>
          <div class="grid g2"><div class="field"><label>Correo de contacto</label><input class="input" type="email" v-model.trim="f.biz.email" /></div>
            <div class="field"><label>Teléfono</label><input class="input" v-model.trim="f.biz.phone" inputmode="tel" /></div></div>
          <div class="field"><label>Dirección</label><input class="input" v-model.trim="f.biz.address" /></div>
          <div class="error" v-if="err">{{ err }}</div>
          <button class="btn btn-primary" :class="{ 'is-loading': busy }">Guardar y seguir</button>
        </form>
      </section>

      <!-- 2 · cobros -->
      <section v-else-if="cur === 'payments'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Cobros</span><h2 class="h2">¿Cómo te pagan tus clientes?</h2><p class="muted">Hasta que elijas, nadie puede pagar en línea (la demostración, en cambio, siempre simula pagos).</p></header>
        <div class="grid g2">
          <button class="opt-card" :class="{ on: f.pay.mode === 'manual_confirm' }" @click="f.pay.mode = 'manual_confirm'"><ep-ico name="cash" :size="24" /><b>Transferencia con confirmación</b><span class="small muted">Empiezas hoy, sin comisión de pasarela. El cliente deposita a tu CLABE y tu equipo confirma el depósito (el sistema crea la tarea).</span></button>
          <button class="opt-card" :class="{ on: f.pay.mode === 'gateway' }" @click="f.pay.mode = 'gateway'"><ep-ico name="credit-card" :size="24" /><b>Pasarela (Mercado Pago)</b><span class="small muted">Cobro automático con tarjeta, OXXO y SPEI. Se concilia solo por webhook. Comisión de la pasarela por cobro.</span></button>
        </div>
        <form v-if="f.pay.mode === 'manual_confirm'" class="stack" style="--gap:14px" @submit.prevent="save('payments', f.pay, 'Cobros configurados')">
          <div class="field"><label>CLABE (18 dígitos) *</label><input class="input" v-model.trim="f.pay.clabe" inputmode="numeric" maxlength="22" /><small :class="clabeOk ? 'okc' : 'muted'">{{ clabeOk ? 'CLABE válida ✓' : 'Validamos el dígito verificador' }}</small></div>
          <div class="grid g2"><div class="field"><label>Banco *</label><input class="input" v-model.trim="f.pay.bank" /></div><div class="field"><label>Beneficiario *</label><input class="input" v-model.trim="f.pay.beneficiary" /></div></div>
          <div class="field"><label>Instrucciones para el cliente</label><input class="input" v-model.trim="f.pay.instructions" placeholder="Deposita y envía tu comprobante por WhatsApp con tu referencia." /></div>
          <div class="error" v-if="err">{{ err }}</div>
          <button class="btn btn-primary" :class="{ 'is-loading': busy }">Guardar y seguir</button>
        </form>
        <form v-else-if="f.pay.mode === 'gateway'" class="stack" style="--gap:14px" @submit.prevent="save('payments', f.pay, 'Pasarela configurada')">
          <div class="field"><label>Access Token de Mercado Pago</label><input class="input" type="password" v-model.trim="f.pay.mp_token" autocomplete="off" :placeholder="cl.payments.has_token ? '•••• ya configurado (déjalo vacío para conservarlo)' : 'APP_USR-…'" /><small class="muted">También puede vivir en el servidor como MERCADOPAGO_ACCESS_TOKEN, que tiene prioridad.</small></div>
          <p class="small muted">Webhook a registrar en Mercado Pago: <code>{{ EP.apiBase }}/webhooks/mercadopago</code> <button type="button" class="btn btn-ghost btn-sm" @click="EP.copy(location.origin + EP.apiBase + '/webhooks/mercadopago')">Copiar</button></p>
          <div class="error" v-if="err">{{ err }}</div>
          <button class="btn btn-primary" :class="{ 'is-loading': busy }">Guardar y seguir</button>
        </form>
      </section>

      <!-- 3 · economía -->
      <section v-else-if="cur === 'economics'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Modelo de ingresos</span><h2 class="h2">Elige tu punto de partida</h2><p class="muted">Cada perfil ajusta Protege, Club, precio dinámico y referidos. Todo se puede cambiar después en Economía.</p></header>
        <div class="grid g3">
          <button v-for="p in presets" :key="p.key" class="opt-card" :class="{ on: f.preset === p.key }" @click="pick(p)">
            <b>{{ p.name }}</b><span class="small muted">{{ p.blurb }}</span>
            <ul class="tiny"><li v-for="l in p.lines" :key="l">{{ l }}</li></ul>
          </button>
        </div>
        <details><summary class="small bold">Ajustes finos</summary>
          <div class="grid g3 mt-2"><div class="field" v-for="k in fine" :key="k.key"><label>{{ k.label }}</label><input class="input" v-model="f.params[k.key]" inputmode="decimal" /></div></div></details>
        <div class="error" v-if="err">{{ err }}</div>
        <button class="btn btn-primary" :class="{ 'is-loading': busy }" @click="saveEcon">Aplicar y seguir</button>
      </section>

      <!-- 4 · puntos -->
      <section v-else-if="cur === 'points'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Red</span><h2 class="h2">Da de alta tu primer punto</h2><p class="muted">Un punto es un comercio aliado que recibe paquetes, cobra abonos y vende servicios. Su operador entra al panel con su propio acceso.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="addPoint">
          <div class="grid g2"><div class="field"><label>Nombre del punto *</label><input class="input" v-model.trim="f.point.name" placeholder="Papelería Centro" /></div>
            <div class="field"><label>WhatsApp del punto</label><input class="input" v-model.trim="f.point.whatsapp" inputmode="tel" /></div></div>
          <div class="field"><label>Dirección</label><input class="input" v-model.trim="f.point.address" /></div>
          <div class="grid g3"><div class="field"><label>Horario</label><input class="input" v-model.trim="f.point.hours" placeholder="L-S 9:00-19:00" /></div>
            <div class="field"><label>Comisión al punto (%)</label><input class="input" v-model="f.point.commission_rate" inputmode="decimal" /></div>
            <div class="field"><label>Límite de efectivo ($)</label><input class="input" v-model="f.point.cash_limit" inputmode="decimal" /></div></div>
          <div class="grid g2"><div class="field"><label>Operador: nombre</label><input class="input" v-model.trim="f.point.operator_name" /></div>
            <div class="field"><label>Operador: correo *</label><input class="input" type="email" v-model.trim="f.point.operator_email" /></div></div>
          <div class="error" v-if="err">{{ err }}</div>
          <button class="btn btn-primary" :class="{ 'is-loading': busy }">Crear punto y operador</button>
        </form>
      </section>

      <!-- 5 · proveedores -->
      <section v-else-if="cur === 'providers'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Excursiones</span><h2 class="h2">Proveedores de excursiones</h2><p class="muted">Quien opera los tours. Cobra con liquidación automática después de cada salida. Puedes saltarte este paso y agregarlos luego.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="addProvider">
          <div class="grid g2"><div class="field"><label>Nombre *</label><input class="input" v-model.trim="f.prov.name" /></div><div class="field"><label>Correo (crea su acceso)</label><input class="input" type="email" v-model.trim="f.prov.email" /></div></div>
          <div class="grid g3"><div class="field"><label>WhatsApp</label><input class="input" v-model.trim="f.prov.whatsapp" /></div><div class="field"><label>Comisión Easypoint (%)</label><input class="input" v-model="f.prov.fee_rate" inputmode="decimal" /></div><div class="field"><label>CLABE de pago</label><input class="input" v-model.trim="f.prov.clabe" inputmode="numeric" /></div></div>
          <div class="error" v-if="err">{{ err }}</div>
          <div class="row wrap" style="gap:8px"><button class="btn btn-primary" :class="{ 'is-loading': busy }">Agregar proveedor</button><button type="button" class="btn btn-ghost" @click="next">Omitir por ahora</button></div>
        </form>
      </section>

      <!-- 6 · equipo -->
      <section v-else-if="cur === 'team'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Equipo</span><h2 class="h2">Chofer, soporte y ventas</h2><p class="muted">Cada persona entra con su correo y ve sólo lo suyo. La contraseña temporal se muestra una vez.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="addUser">
          <div class="grid g3"><div class="field"><label>Rol</label><select class="input" v-model="f.user.role"><option value="driver">Chofer</option><option value="support">Soporte</option><option value="sales">Ventas</option><option value="admin">Administrador</option></select></div>
            <div class="field"><label>Nombre *</label><input class="input" v-model.trim="f.user.name" /></div><div class="field"><label>Correo *</label><input class="input" type="email" v-model.trim="f.user.email" /></div></div>
          <div class="error" v-if="err">{{ err }}</div>
          <div class="row wrap" style="gap:8px"><button class="btn btn-primary" :class="{ 'is-loading': busy }">Agregar persona</button><button type="button" class="btn btn-ghost" @click="next">Seguir</button></div>
        </form>
      </section>

      <!-- 7 · canales -->
      <section v-else-if="cur === 'channels'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Comunicación</span><h2 class="h2">WhatsApp, reseñas y dirección web</h2><p class="muted">El motor avisa, recuerda y cobra por WhatsApp (en cola para enviar con un clic). Las reseñas llegan después de cada viaje.</p></header>
        <form class="stack" style="--gap:14px" @submit.prevent="save('channels', f.ch, 'Canales guardados')">
          <div class="grid g2"><div class="field"><label>WhatsApp del negocio *</label><input class="input" v-model.trim="f.ch.whatsapp" inputmode="tel" /></div>
            <div class="field"><label>URL pública</label><input class="input" v-model.trim="f.ch.url" placeholder="https://tuempresa.mx" /></div></div>
          <div class="field"><label>Enlace para reseñas (Google)</label><input class="input" v-model.trim="f.ch.review_url" placeholder="https://g.page/r/…" /></div>
          <div class="error" v-if="err">{{ err }}</div>
          <button class="btn btn-primary" :class="{ 'is-loading': busy }">Guardar y seguir</button>
        </form>
      </section>

      <!-- 8 · automatización -->
      <section v-else-if="cur === 'automation'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Automatización</span><h2 class="h2">Enciende el motor</h2><p class="muted">Vence reservas, manda recordatorios, genera tareas por rol, vigila el efectivo y recupera clientes. Corre por cron; es seguro ejecutarlo varias veces.</p></header>
        <div class="stack" style="--gap:8px">
          <div class="code" v-for="c in cron" :key="c.t"><div class="tiny muted">{{ c.t }}</div><code>{{ c.cmd }}</code><button class="btn btn-ghost btn-sm" @click="EP.copy(c.cmd)">Copiar</button></div>
        </div>
        <p class="small muted">{{ stepOf('automation').detail }}</p>
        <div class="row wrap" style="gap:8px"><button class="btn btn-dark" :class="{ 'is-loading': busy }" @click="runTick"><ep-ico name="zap" :size="16" /> Ejecutar una vez ahora</button><button class="btn btn-ghost" @click="next">Seguir</button></div>
      </section>

      <!-- 9 · revisión -->
      <section v-else-if="cur === 'review'" class="card card-pad stack" style="--gap:16px">
        <header><span class="kicker">Listo para operar</span><h2 class="h2">Revisión final</h2><p class="muted" v-if="cl.ready">Todo lo obligatorio está listo.</p><p class="muted" v-else>Aún falta: {{ missing.join(', ') }}.</p></header>
        <ul class="chk"><li v-for="s in steps.filter((x) => x.key !== 'account')" :key="s.key" :class="{ ok: s.done }"><span>{{ s.done ? '✓' : s.required ? '!' : '·' }}</span><div><b>{{ s.label }}</b><small>{{ s.detail }}</small></div><button class="btn btn-ghost btn-sm" @click="go(s.key)">Ver</button></li></ul>
        <div v-if="!stepOf('demo').done" class="card card-pad warnbox stack" style="--gap:8px"><b>Hay datos de prueba en la base real</b><p class="small">Si vienen de una instalación previa, bórralos antes de operar. Se conserva tu cuenta, la configuración, el catálogo de servicios y las reglas de precio.</p>
          <div class="row wrap" style="gap:8px"><input class="input" style="max-width:320px" v-model="purge" placeholder="BORRAR DATOS DE PRUEBA" /><button class="btn btn-danger" :disabled="purge !== 'BORRAR DATOS DE PRUEBA'" @click="doPurge">Borrar datos de prueba</button></div></div>
        <div class="error" v-if="err">{{ err }}</div>
        <div class="row wrap" style="gap:8px"><button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }" :disabled="!cl.ready" @click="finish"><ep-ico name="rocket" :size="18" /> {{ cl.completed ? 'Guardar de nuevo' : 'Terminar configuración' }}</button><a class="btn btn-ghost btn-lg" :href="EP.href('/')">Ir al panel</a></div>
      </section>

      <!-- accesos creados (una sola vez) -->
      <section v-if="isAdmin && creds.length" class="card card-pad stack creds" style="--gap:10px">
        <div class="row between"><b>Accesos creados</b><span class="tiny muted">Se muestran una sola vez: compártelos ahora.</span></div>
        <div class="row between wrap cr" v-for="c in creds" :key="c.email"><div><b class="small">{{ c.who }}</b><div class="tiny muted">{{ c.email }}</div></div><div class="row" style="gap:6px"><code>{{ c.temp_password }}</code>
          <button class="btn btn-ghost btn-sm" @click="EP.copy(`Tu acceso a Easypoint: ${origin}app/ · correo ${c.email} · contraseña temporal ${c.temp_password} (cámbiala al entrar)`)">Copiar</button></div></div>
      </section>

      <section v-if="isAdmin" class="stack" style="--gap:8px"><FAQ heading="Dudas frecuentes de la configuración" :items="faq" /></section>
    </main>
  </div>
</template>
<script>
const ORDER = ['business', 'payments', 'economics', 'points', 'providers', 'team', 'channels', 'automation', 'review'];
const REQ = ['business', 'payments', 'economics', 'points', 'channels', 'review'];
const LABELS = { account: 'Tu cuenta', business: 'Tu negocio', payments: 'Cómo cobras', economics: 'Modelo de ingresos', points: 'Tu primer punto', providers: 'Proveedores', team: 'Equipo', channels: 'WhatsApp y reseñas', automation: 'Motor', review: 'Revisión' };
export default {
  data() {
    return {
      EP, location, origin: location.origin + EP.root, loading: true, busy: false, err: '', base: {}, status: { has_admin: true }, cl: { steps: [], payments: {}, company: {}, channels: {}, ready: false }, cur: 'business', creds: [], purge: '',
      f: { name: '', phone: '', email: '', password: '', token: '',
        biz: { brand_name: '', legal_name: '', rfc: '', regime: '', zip: '', email: '', phone: '', address: '' },
        pay: { mode: 'manual_confirm', clabe: '', bank: '', beneficiary: '', instructions: '', mp_token: '' },
        preset: 'equilibrio', params: {},
        point: { name: '', address: '', whatsapp: '', hours: '', commission_rate: '10', cash_limit: '3000', operator_name: '', operator_email: '' },
        prov: { name: '', email: '', whatsapp: '', fee_rate: '15', clabe: '' }, user: { role: 'driver', name: '', email: '' },
        ch: { whatsapp: '', url: '', review_url: '' } },
      presets: [
        { key: 'arranque', name: 'Arranque', vals: { 'pricing.protect_pct': 5, 'club.price_month': 79 }, blurb: 'Crecer la red y la confianza primero.', lines: ['Protege 5%', 'Club $79/mes', 'Referidos $100 + $100', 'Precio fijo'] },
        { key: 'equilibrio', name: 'Equilibrio', vals: { 'pricing.protect_pct': 6, 'club.price_month': 99 }, blurb: 'Los valores recomendados para empezar.', lines: ['Protege 6%', 'Club $99/mes', 'Referidos $100 + $100', 'Precio fijo'] },
        { key: 'rentable', name: 'Rentable', vals: { 'pricing.protect_pct': 8, 'club.price_month': 129 }, blurb: 'Margen primero, con precio dinámico.', lines: ['Protege 8%', 'Club $129/mes', 'Referidos $75 + $75', 'Precio dinámico'] }
      ],
      fine: [['pricing.protect_pct', 'Protege (% del subtotal)'], ['club.price_month', 'Club ($/mes)'], ['settlement.payout_days', 'Días para pagar al proveedor'], ['policy.payment_deadline_days', 'Días antes de la salida para liquidar'], ['cash.driver_limit', 'Efectivo máximo del chofer ($)'], ['support.auto_credit_cap', 'Compensación máxima de soporte ($)']].map(([key, label]) => ({ key, label })),
      cron: [{ t: 'Cada 5 minutos (jobs y mensajes)', cmd: '*/5 * * * * /ruta/a/easypoint --tick' }, { t: 'Cada hora (revisión completa del negocio)', cmd: '0 * * * * /ruta/a/easypoint --tick-full' }],
      faq: [
        { q: '¿Puedo cambiar todo esto después?', a: 'Sí. Cada paso se puede volver a abrir desde esta lista, y la economía se afina en Economía y Automatización.' },
        { q: '¿Qué pasa con los pagos mientras no configuro cobros?', a: 'Nadie puede pagar en línea: el sitio invita a escribir por WhatsApp. En la demostración los pagos siempre son simulados y no tocan este negocio.' },
        { q: '¿Dónde pruebo sin riesgo?', a: 'En /demo (con contraseña). Es otra base de datos con datos ficticios que puedes reiniciar.' },
        { q: '¿Necesito el cron para empezar?', a: 'Para operar con calma sí: sin él no se vencen reservas ni salen recordatorios. Puedes lanzarlo una vez a mano desde el paso del motor.' }
      ]
    };
  },
  computed: {
    steps() {
      const base = this.cl.steps.map((s) => ({ ...s }));
      if (!this.status.has_admin) return [{ key: 'account', label: LABELS.account, done: false, required: true, detail: '' }, ...ORDER.map((k) => ({ key: k, label: LABELS[k], done: false, required: REQ.includes(k), detail: '' }))];
      const byKey = Object.fromEntries(base.map((s) => [s.key, s]));
      const out = ORDER.filter((k) => k !== 'review').map((k) => byKey[k] || { key: k, label: LABELS[k], done: false, required: REQ.includes(k), detail: '' });
      out.push({ key: 'review', label: LABELS.review, done: !!this.cl.completed, required: true, detail: this.cl.completed ? 'Configuración terminada' : '' });
      return out;
    },
    locked() { return !this.status.has_admin; },
    isAdmin() { return EP.isRole('admin'); },
    doneCount() { return this.steps.filter((s) => s.done).length; },
    pct() { return this.steps.length ? Math.round((this.doneCount / this.steps.length) * 100) : 0; },
    missing() { return this.steps.filter((s) => s.required && !s.done && s.key !== 'review').map((s) => s.label); },
    strength() { const p = this.f.password; let n = 0; if (p.length >= 10) n++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++; if (/\d/.test(p)) n++; if (/[^A-Za-z0-9]/.test(p) || p.length >= 16) n++; return n; },
    clabeOk() { const c = (this.f.pay.clabe || '').replace(/\s/g, ''); if (!/^\d{18}$/.test(c)) return false; const w = [3, 7, 1]; let s = 0; for (let i = 0; i < 17; i++) s += (Number(c[i]) * w[i % 3]) % 10; return (10 - (s % 10)) % 10 === Number(c[17]); }
  },
  async mounted() {
    try { this.status = await EP.get('/setup/status', { auth: false }); } catch (e) { this.status = { has_admin: true }; }
    if (!this.status.has_admin) { this.cur = 'account'; this.loading = false; return; }
    if (!EP.session.token) { EP.go('/login', true); return; }
    await this.reload(true);
    this.loading = false;
  },
  methods: {
    stepOf(k) { return this.steps.find((s) => s.key === k) || {}; },
    go(k) { this.err = ''; this.cur = k; },
    next() { const i = ORDER.indexOf(this.cur); this.go(ORDER[Math.min(i + 1, ORDER.length - 1)]); },
    async reload(pick) {
      try {
        this.cl = await EP.get('/setup/checklist');
        const c = this.cl.company, p = this.cl.payments, ch = this.cl.channels;
        if (pick) {
          Object.assign(this.f.biz, { brand_name: c.brand, legal_name: c.legal_name, rfc: c.rfc, regime: c.regime, zip: c.zip, email: c.email, phone: c.phone, address: c.address });
          Object.assign(this.f.ch, { whatsapp: ch.whatsapp, url: ch.url, review_url: ch.review_url });
          if (p.mode) this.f.pay.mode = p.mode; this.f.pay.bank = p.bank || ''; this.f.pay.beneficiary = p.beneficiary || '';
          const first = this.steps.find((s) => s.key !== 'review' && !s.done && s.required);
          this.cur = first ? first.key : 'review';
          try { const r = await EP.get('/admin/config'); (r.items || []).forEach((i) => { this.f.params[i.ckey] = i.cvalue; }); this.base = { ...this.f.params }; } catch (_) {}
        }
      } catch (e) { EP.err(e); }
    },
    async run(fn, ok, advance = true) {
      this.err = ''; this.busy = true;
      try { const r = await fn(); await this.reload(); if (ok) EP.toast(ok, 'ok'); if (advance) this.next(); return r; } catch (e) { this.err = e.message; return null; } finally { this.busy = false; }
    },
    save(path, body, ok) { return this.run(() => EP.post('/setup/' + path, body), ok); },
    async createAdmin() {
      this.err = ''; this.busy = true;
      try {
        const r = await EP.post('/setup/admin', { name: this.f.name, email: this.f.email, password: this.f.password, phone: this.f.phone, token: this.f.token }, { auth: false });
        EP.setSession(r.token, r.user);
        this.status.has_admin = true; this.f.biz.email = this.f.email; await this.reload(true); EP.toast('Cuenta creada', 'ok'); this.cur = 'business';
      } catch (e) { this.err = e.message; } finally { this.busy = false; }
    },
    saveEcon() {
      const body = { preset: this.f.preset };
      this.fine.forEach((k) => { const v = this.f.params[k.key]; if (v !== undefined && v !== '' && String(v) !== String(this.base[k.key])) body[k.key] = String(v); });
      return this.run(() => EP.post('/setup/params', body), 'Modelo de ingresos aplicado');
    },
    pick(p) { this.f.preset = p.key; Object.assign(this.f.params, p.vals); },
    async addPoint() {
      const r = await this.run(() => EP.post('/setup/point', this.f.point), 'Punto creado', false);
      if (r) { if (r.user) this.creds.push({ who: 'Operador · ' + this.f.point.name, email: r.user.email, temp_password: r.user.temp_password }); if (r.warning) EP.toast(r.warning, 'bad'); this.f.point = { name: '', address: '', whatsapp: '', hours: '', commission_rate: '10', cash_limit: '3000', operator_name: '', operator_email: '' }; this.next(); }
    },
    async addProvider() {
      const r = await this.run(() => EP.post('/setup/provider', this.f.prov), 'Proveedor agregado', false);
      if (r) { if (r.user) this.creds.push({ who: 'Proveedor · ' + this.f.prov.name, email: r.user.email, temp_password: r.user.temp_password }); this.f.prov = { name: '', email: '', whatsapp: '', fee_rate: '15', clabe: '' }; }
    },
    async addUser() {
      const r = await this.run(() => EP.post('/setup/user', this.f.user), 'Persona agregada', false);
      if (r && r.user) { this.creds.push({ who: this.f.user.name + ' · ' + r.user.role, email: r.user.email, temp_password: r.user.temp_password }); this.f.user = { role: this.f.user.role, name: '', email: '' }; }
    },
    async runTick() { this.busy = true; try { await EP.post('/admin/tick'); await this.reload(); EP.toast('Motor ejecutado', 'ok'); } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async doPurge() {
      if (!(await EP.confirm('Se eliminan usuarios, puntos, reservas y movimientos de la base REAL (menos tu cuenta). No se puede deshacer.', { ok: 'Borrar', danger: true }))) return;
      await this.run(() => EP.post('/setup/purge-demo', { confirm: this.purge }), 'Base limpia', false); this.purge = '';
    },
    async finish() { const r = await this.run(() => EP.post('/setup/finish'), '¡Configuración terminada!', false); if (r) EP.go('/'); }
  },
};
</script>
<style scoped>
.su { min-height: 100vh; display: grid; grid-template-columns: 330px 1fr; background: var(--bg); }
.rail { position: sticky; top: 0; height: 100vh; overflow: auto; padding: 22px 16px; border-right: 1px solid var(--line); background: var(--surface); display: flex; flex-direction: column; gap: 18px; }
.brand { gap: 10px; font-weight: 800; } .wm { font-size: 1.25rem; font-weight: 500; letter-spacing: -.02em; } .wm b { font-weight: 900; color: var(--brand-2); }
.ring-wrap { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 16px; background: var(--bg-2); }
.steps { display: grid; gap: 4px; }
.st { display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-radius: 14px; text-align: left; border: 1px solid transparent; cursor: pointer; background: none; color: inherit; }
.st:hover:not(:disabled) { background: var(--bg-2); } .st.on { background: var(--ink); color: var(--bg); } .st:disabled { opacity: .5; cursor: default; }
.dot { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: .8rem; border: 2px solid var(--line-2); }
.st.ok .dot { background: var(--brand); border-color: var(--brand); color: var(--on-brand); } .st.on .dot { border-color: currentColor; }
.lbl { display: grid; gap: 1px; min-width: 0; } .lbl b { font-size: .9rem; } .lbl small { font-size: .74rem; opacity: .7; line-height: 1.3; } .lbl small.warn { color: var(--warn); opacity: 1; } .st.on .lbl small { opacity: .75; color: inherit; }
.opt { margin-left: auto; font-size: .64rem; text-transform: uppercase; letter-spacing: .08em; opacity: .6; font-style: normal; }
.panel { padding: 28px clamp(16px, 4vw, 48px) 80px; display: grid; gap: 20px; align-content: start; max-width: 900px; width: 100%; }
.opt-card { display: grid; gap: 6px; text-align: left; padding: 16px; border-radius: 16px; border: 2px solid var(--line); background: var(--surface); cursor: pointer; transition: border-color .15s, transform .15s; color: inherit; }
.opt-card:hover { transform: translateY(-2px); } .opt-card.on { border-color: var(--brand); background: var(--brand-soft); } .opt-card ul { margin: 4px 0 0; padding-left: 16px; }
.meter { width: 100%; height: 6px; } .okc { color: var(--ok); }
.code { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border-radius: 12px; background: var(--bg-2); } .code .tiny { flex-basis: 100%; } .code code { flex: 1; overflow-x: auto; white-space: nowrap; }
.chk { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; } .chk li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--bg-2); } .chk li > div { flex: 1; display: grid; } .chk li small { color: var(--muted); font-size: .76rem; } .chk li > span { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; background: var(--warn-soft, #fde68a); } .chk li.ok > span { background: var(--brand); color: var(--on-brand); }
.warnbox { border: 1px solid var(--warn); background: color-mix(in srgb, var(--warn) 8%, var(--surface)); }
.creds { border: 1px dashed var(--brand); } .cr { padding: 8px 0; border-top: 1px solid var(--line); } .cr:first-of-type { border-top: 0; } .creds code { background: var(--bg-2); padding: 3px 8px; border-radius: 8px; }
@media (max-width: 900px) { .su { grid-template-columns: 1fr; } .rail { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); } .steps { grid-auto-flow: column; grid-auto-columns: minmax(150px, 1fr); overflow-x: auto; } .lbl small { display: none; } }
</style>
