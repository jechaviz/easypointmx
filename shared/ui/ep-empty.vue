<template><div class="empty"><div class="ico">{{ icon }}</div><div class="bold" v-if="title">{{ title }}</div><div class="small"><slot /></div></div></template>
<script>export default { props: { icon: { type: String, default: '🌿' }, title: String } };</script>
