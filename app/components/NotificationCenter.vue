<template>
  <div v-if="appState.currentRoute !== 'login' && appState.user">
    <button
      class="fixed top-5 right-5 z-[70] pointer-events-auto group"
      type="button"
      @click="toggleNotificationCenter"
    >
      <div class="bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-[1.75rem] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] hover:border-brand-500/30 transition-all flex items-center gap-3 min-w-[220px]">
        <div class="relative w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
          <i class="bi bi-bell-fill text-lg"></i>
          <span
            v-if="unreadCount"
            class="absolute -top-1 -right-1 min-w-[1.3rem] h-5 px-1 rounded-full bg-brand-500 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </div>
        <div class="text-left min-w-0">
          <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.24em]">Eventos</p>
          <p class="text-xs font-black text-white truncate">
            {{ unreadCount ? `${unreadCount} pendiente${unreadCount === 1 ? '' : 's'}` : 'Centro al dia' }}
          </p>
          <p class="text-[10px] text-slate-500 truncate">{{ roleLabel }}</p>
        </div>
      </div>
    </button>

    <Transition name="notify-panel">
      <div v-if="appState.notificationCenterOpen" class="fixed inset-0 z-[75]">
        <div class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" @click="closeNotificationCenter"></div>

        <aside class="absolute top-5 right-5 bottom-5 w-[min(92vw,24rem)] bg-slate-950/95 border border-slate-800 rounded-[2rem] shadow-[0_30px_120px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
          <div class="px-6 py-5 border-b border-slate-800/90 bg-slate-900/60">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.24em]">Business Events</p>
                <h3 class="text-lg font-black text-white mt-1">Notificaciones relevantes</h3>
                <p class="text-[11px] text-slate-400 mt-1">
                  {{ unreadCount ? `${unreadCount} por revisar` : 'Sin pendientes por ahora' }}
                </p>
              </div>
              <button type="button" class="text-slate-500 hover:text-white transition-colors text-lg" @click="closeNotificationCenter">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="flex items-center justify-between gap-3 mt-4">
              <div class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                {{ roleLabel }}
              </div>
              <button
                type="button"
                class="text-[10px] font-black uppercase tracking-[0.18em] text-brand-400 hover:text-brand-300 disabled:text-slate-700 transition-colors"
                :disabled="!notifications.length"
                @click="markAllNotificationsRead"
              >
                Marcar todo
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <div
              v-for="event in notifications"
              :key="event.id"
              class="rounded-[1.5rem] border px-4 py-4 transition-all cursor-pointer"
              :class="[cardClass(event), !event.readAt ? 'shadow-lg' : 'opacity-90']"
              @click="markNotificationRead(event.id)"
            >
              <div class="flex items-start gap-3">
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0" :class="iconClass(event)">
                  <i class="bi text-base" :class="'bi-' + (event.icon || 'bell-fill')"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm font-black text-white leading-tight">{{ event.title }}</h4>
                    <span v-if="!event.readAt" class="px-2 py-0.5 rounded-full bg-brand-500 text-slate-950 text-[9px] font-black uppercase tracking-[0.16em]">
                      Nuevo
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 leading-relaxed mt-1">{{ event.message }}</p>
                  <div class="flex items-center justify-between gap-3 mt-3">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em]" :class="severityTextClass(event.severity)">
                      {{ severityLabel(event.severity) }}
                    </span>
                    <span class="text-[10px] text-slate-600 font-bold">{{ relativeTime(event.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!notifications.length" class="h-full min-h-[16rem] rounded-[1.75rem] border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-center px-8">
              <div class="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center text-2xl mb-4">
                <i class="bi bi-bell-slash-fill"></i>
              </div>
              <h4 class="text-white font-black text-base">Sin eventos urgentes</h4>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                Cuando el negocio detecte novedades para tu rol, apareceran aqui.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<script>
export default {
  inject: [
    'appState',
    'toggleNotificationCenter',
    'closeNotificationCenter',
    'markNotificationRead',
    'markAllNotificationsRead'
  ],
  computed: {
    notifications() {
      return Array.isArray(this.appState.notifications) ? this.appState.notifications : [];
    },
    unreadCount() {
      return this.notifications.filter(event => !event.readAt).length;
    },
    roleLabel() {
      return {
        admin: 'Eventos de administracion',
        operator: 'Eventos del local',
        driver: 'Eventos de ruta',
        sales: 'Eventos comerciales'
      }[this.appState.user?.role] || 'Eventos de operacion';
    }
  },
  methods: {
    severityLabel(severity) {
      return {
        warning: 'Alta prioridad',
        success: 'Buen avance',
        info: 'Seguimiento'
      }[severity] || 'Seguimiento';
    },
    severityTextClass(severity) {
      return {
        warning: 'text-amber-400',
        success: 'text-green-400',
        info: 'text-brand-400'
      }[severity] || 'text-slate-400';
    },
    cardClass(event) {
      return {
        warning: 'bg-amber-500/5 border-amber-500/15 hover:border-amber-500/35',
        success: 'bg-green-500/5 border-green-500/15 hover:border-green-500/35',
        info: 'bg-slate-900 border-slate-800 hover:border-brand-500/30'
      }[event.severity] || 'bg-slate-900 border-slate-800 hover:border-brand-500/30';
    },
    iconClass(event) {
      return {
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        success: 'bg-green-500/10 text-green-400 border-green-500/20',
        info: 'bg-brand-500/10 text-brand-400 border-brand-500/20'
      }[event.severity] || 'bg-slate-900 text-slate-400 border-slate-800';
    },
    relativeTime(value) {
      const stamp = Date.parse(value);
      if (!Number.isFinite(stamp)) return 'Hace un momento';

      const diffMs = Date.now() - stamp;
      const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

      const diffHours = Math.round(diffMinutes / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;

      const diffDays = Math.round(diffHours / 24);
      return `Hace ${diffDays} d`;
    }
  }
};
</script>

<style scoped>
.notify-panel-enter-active,
.notify-panel-leave-active {
  transition: opacity 0.28s ease;
}

.notify-panel-enter-active aside,
.notify-panel-leave-active aside {
  transition: transform 0.28s ease, opacity 0.28s ease;
}

.notify-panel-enter-from,
.notify-panel-leave-to {
  opacity: 0;
}

.notify-panel-enter-from aside,
.notify-panel-leave-to aside {
  opacity: 0;
  transform: translateX(24px) scale(0.98);
}
</style>
