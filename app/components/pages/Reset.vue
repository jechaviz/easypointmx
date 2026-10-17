<template>
  <div style="min-height:100vh;display:grid;place-items:center;padding:20px">
    <form class="card card-pad stack" style="--gap:14px;width:min(420px,100%)" @submit.prevent="submit">
      <h1 class="h2">Elige tu nueva contraseña</h1>
      <div class="field"><label for="a">Contraseña nueva</label><input id="a" class="input" type="password" v-model="a" autocomplete="new-password" /><div class="help">Mínimo 8 caracteres.</div></div>
      <div class="field"><label for="b">Repítela</label><input id="b" class="input" type="password" v-model="b" autocomplete="new-password" /></div>
      <div class="error" v-if="error">{{ error }}</div>
      <button class="btn btn-primary btn-block" :class="{ 'is-loading': busy }">Guardar y entrar</button>
    </form>
  </div>
</template>
<script>
export default {
  data() { return { a: '', b: '', busy: false, error: '' }; },
  methods: {
    async submit() {
      this.error = '';
      if (this.a.length < 8) { this.error = 'Usa al menos 8 caracteres.'; return; }
      if (this.a !== this.b) { this.error = 'Las contraseñas no coinciden.'; return; }
      this.busy = true;
      try { await EP.post('/auth/reset', { token: EP.route.query.token, password: this.a }, { auth: false }); EP.toast('Contraseña actualizada. Ya puedes entrar.', 'ok'); EP.go('/login'); } catch (e) { this.error = e.message; } finally { this.busy = false; }
    }
  }
};
</script>
