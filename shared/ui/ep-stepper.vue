<template>
  <div class="stepper" role="group" :aria-label="label">
    <button type="button" @click="set(modelValue - 1)" :disabled="modelValue <= min" aria-label="Menos">−</button>
    <span class="num">{{ modelValue }}</span>
    <button type="button" @click="set(modelValue + 1)" :disabled="modelValue >= max" aria-label="Más">+</button>
  </div>
</template>
<script>
export default {
  props: { modelValue: { type: Number, default: 1 }, min: { type: Number, default: 1 }, max: { type: Number, default: 40 }, label: String },
  emits: ['update:modelValue'],
  methods: { set(v) { this.$emit('update:modelValue', Math.max(this.min, Math.min(this.max, v))); } }
};
</script>
