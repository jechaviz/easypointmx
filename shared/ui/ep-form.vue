<template>
  <form class="grid g2" style="--gap:14px" @submit.prevent="submit" novalidate>
    <template v-for="f in visible" :key="f.key">
      <div class="field" :style="f.wide || f.type === 'textarea' ? { gridColumn: '1 / -1' } : null">
        <label v-if="f.type !== 'checkbox'" :for="id + f.key">{{ f.label }}<span v-if="f.required" aria-hidden="true"> *</span></label>
        <select v-if="f.type === 'select'" class="select" :id="id + f.key" v-model="local[f.key]" :disabled="f.readonly">
          <option v-if="!f.required || !local[f.key]" value="">{{ f.placeholder || 'Selecciona…' }}</option>
          <option v-for="o in f.options" :key="o.value ?? o" :value="o.value ?? o">{{ o.label ?? o }}</option>
        </select>
        <textarea v-else-if="f.type === 'textarea'" class="textarea" :id="id + f.key" v-model="local[f.key]" :placeholder="f.placeholder" :readonly="f.readonly" rows="3"></textarea>
        <label v-else-if="f.type === 'checkbox'" class="check"><input type="checkbox" v-model="local[f.key]" :disabled="f.readonly" /><span>{{ f.label }}</span></label>
        <input v-else class="input" :id="id + f.key" :type="f.type || 'text'" v-model="local[f.key]" :placeholder="f.placeholder" :readonly="f.readonly" :step="f.step" :min="f.min" :max="f.max" :autocomplete="f.autocomplete || 'off'" :inputmode="f.inputmode" />
        <div class="help" v-if="f.help">{{ f.help }}</div>
        <div class="error" v-if="errors[f.key]">{{ errors[f.key] }}</div>
      </div>
    </template>
    <div style="grid-column:1 / -1" class="row wrap" v-if="submitLabel !== null">
      <button class="btn btn-primary" :class="{ 'is-loading': busy }" type="submit"><span v-if="busy" class="spin"></span>{{ submitLabel }}</button>
      <slot name="extra" />
    </div>
  </form>
</template>
<script>
let n = 0;
export default {
  props: { fields: { type: Array, required: true }, modelValue: { type: Object, default: () => ({}) }, submitLabel: { type: String, default: 'Guardar' }, busy: Boolean },
  emits: ['update:modelValue', 'submit'],
  data() { return { local: Object.assign({}, this.modelValue), errors: {}, id: 'f' + (++n) + '-' }; },
  computed: { visible() { return this.fields.filter((f) => !f.hidden && (!f.showIf || f.showIf(this.local))); } },
  watch: {
    modelValue: { deep: true, handler(v) { if (JSON.stringify(v) !== JSON.stringify(this.local)) this.local = Object.assign({}, v); } },
    local: { deep: true, handler(v) { this.$emit('update:modelValue', Object.assign({}, v)); } }
  },
  methods: {
    validate() {
      const e = {};
      this.visible.forEach((f) => {
        const v = this.local[f.key];
        if (f.required && (v === '' || v == null || v === false && f.type !== 'checkbox')) e[f.key] = 'Requerido';
        else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e[f.key] = 'Correo no válido';
        else if (f.type === 'tel' && v && String(v).replace(/\D/g, '').length < 10) e[f.key] = 'Captura 10 dígitos';
        else if (f.type === 'number' && v !== '' && v != null && isNaN(Number(v))) e[f.key] = 'Número no válido';
      });
      this.errors = e;
      return !Object.keys(e).length;
    },
    submit() { if (this.validate()) this.$emit('submit', Object.assign({}, this.local)); }
  }
};
</script>
