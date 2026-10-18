<template>
  <div><div class="page-anim"><component :is="EP.view.comp" /></div><ep-dialogs /><ep-demobar /></div>
</template>
<script>
export default { data() { return { EP }; } };
</script>
