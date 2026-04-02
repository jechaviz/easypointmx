<template>
  <div class="min-h-screen font-sans">
    <Transition name="page" mode="out-in">
      <LoginView   v-if="appState.currentRoute === 'login'"     key="login" />
      <AdminView   v-else-if="appState.currentRoute === 'admin'" key="admin" />
      <DriverView  v-else-if="appState.currentRoute === 'driver'" key="driver" />
      <SalesView   v-else-if="appState.currentRoute === 'sales'"  key="sales" />
      <DashboardView v-else                                       key="dash"  />
    </Transition>

    <!-- Global Modal -->
    <Modal 
      v-model="appState.modal.show"
      v-bind="appState.modal"
      @confirm="appState.modal.onConfirm"
      @cancel="appState.modal.onCancel"
    />

    <!-- Global Loading -->
    <Loading 
      v-model="appState.loading"
      :message="appState.loadingMsg"
    />
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
export default {
  inject: ['appState'],
  components: {
    LoginView:     Vue.defineAsyncComponent(() => loadModule('./components/LoginView.vue', window.options)),
    DashboardView: Vue.defineAsyncComponent(() => loadModule('./components/DashboardView.vue', window.options)),
    AdminView:     Vue.defineAsyncComponent(() => loadModule('./components/AdminView.vue', window.options)),
    DriverView:    Vue.defineAsyncComponent(() => loadModule('./components/DriverView.vue', window.options)),
    SalesView:     Vue.defineAsyncComponent(() => loadModule('./components/SalesView.vue', window.options)),
    Modal:         Vue.defineAsyncComponent(() => loadModule('./components/Modal.vue', window.options)),
    Loading:       Vue.defineAsyncComponent(() => loadModule('./components/Loading.vue', window.options))
  }
}
</script>
