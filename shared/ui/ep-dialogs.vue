<template>
  <div>
    <teleport to="body">
      <div v-if="d.open" class="overlay" @mousedown.self="close(false)" role="alertdialog" aria-modal="true">
        <div class="modal" style="width:min(440px,100%)">
          <div class="modal-h"><h3 class="h3">{{ d.title }}</h3></div>
          <div class="modal-b stack">
            <p>{{ d.message }}</p>
            <input v-if="d.kind === 'prompt'" class="input" :type="d.type" v-model="d.input" :placeholder="d.placeholder" @keydown.enter="close(true)" autofocus />
          </div>
          <div class="modal-f">
            <button class="btn btn-ghost" @click="close(false)">{{ d.cancel }}</button>
            <button class="btn" :class="d.danger ? 'btn-danger' : 'btn-primary'" @click="close(true)">{{ d.ok }}</button>
          </div>
        </div>
      </div>
      <div class="toasts" aria-live="polite">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{ t.msg }}</div>
      </div>
    </teleport>
  </div>
</template>
<script>
export default {
  computed: { d() { return EP.dialog; }, toasts() { return EP.toasts; } },
  methods: {
    close(yes) {
      const d = EP.dialog, r = d.resolve; d.open = false;
      if (r) r(d.kind === 'prompt' ? (yes ? d.input : null) : yes);
    }
  }
};
</script>
