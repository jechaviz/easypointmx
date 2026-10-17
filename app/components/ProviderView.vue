<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    
    <!-- Header -->
    <header class="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-brand-500/20">
            <i class="bi bi-compass-fill text-lg"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-white text-base tracking-tight">{{ providerName }}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">Portal Proveedor</span>
            </div>
            <p class="text-[10px] text-slate-400">Comisión EasyPoint: {{ feeRateText }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Notification Bell -->
          <button @click="toggleNotificationCenter" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors relative">
            <i class="bi bi-bell-fill text-sm"></i>
            <span v-if="unreadCount" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500"></span>
          </button>

          <!-- Refresh Data -->
          <button @click="fetchProviderData" :disabled="loading" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i class="bi bi-arrow-clockwise text-sm" :class="{ 'animate-spin': loading }"></i>
          </button>

          <!-- Logout -->
          <button @click="logout" class="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-2">
            <i class="bi bi-box-arrow-right"></i>
            <span class="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <!-- KPI Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasajeros Totales</span>
            <i class="bi bi-people-fill text-brand-400 text-lg"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-white">{{ metrics.total_passengers }}</div>
          <p class="text-[10px] text-slate-500 mt-1 font-medium">{{ metrics.completed_passengers }} completados</p>
        </div>

        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Brutas</span>
            <i class="bi bi-cash-stack text-emerald-400 text-lg"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-emerald-400">{{ formatMoney(metrics.gross_revenue) }}</div>
          <p class="text-[10px] text-slate-500 mt-1 font-medium">{{ metrics.total_bookings }} reservaciones</p>
        </div>

        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neto Liquidado</span>
            <i class="bi bi-wallet2 text-blue-400 text-lg"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-blue-400">{{ formatMoney(metrics.settled_net) }}</div>
          <p class="text-[10px] text-slate-500 mt-1 font-medium">Libre de fee EasyPoint</p>
        </div>

        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Por Liquidar</span>
            <i class="bi bi-hourglass-split text-amber-400 text-lg"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-amber-400">{{ formatMoney(metrics.pending_payout) }}</div>
          <p class="text-[10px] text-slate-500 mt-1 font-medium">Auto-generado por salidas</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-slate-800 overflow-x-auto custom-scrollbar gap-2 pb-px">
        <button
          v-for="t in tabs"
          :key="t.id"
          @click="currentTab = t.id"
          class="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2"
          :class="currentTab === t.id ? 'border-brand-500 text-white bg-slate-900/30' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <i :class="'bi ' + t.icon"></i>
          <span>{{ t.label }}</span>
          <span v-if="t.badge" class="px-2 py-0.5 rounded-full text-[9px] bg-brand-500/20 text-brand-400">{{ t.badge }}</span>
        </button>
      </div>

      <!-- TAB 1: MANIFIESTO & SALIDAS -->
      <div v-if="currentTab === 'manifest'" class="space-y-6 animate-fade-in">
        <div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-xl font-black text-white tracking-tight">Manifiesto de Pasajeros</h2>
              <p class="text-xs text-slate-400 mt-0.5">Control de abordaje y pasajeros registrados por fecha de salida.</p>
            </div>

            <!-- Departure Conclude Action -->
            <button
              v-if="selectedDate && manifestItems.length && !isTripCompleted"
              @click="completeTrip"
              :disabled="actionLoading"
              class="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <i v-if="actionLoading" class="bi bi-arrow-repeat animate-spin"></i>
              <i v-else class="bi bi-check2-circle text-base"></i>
              <span>Concluir Salida y Liquidar</span>
            </button>
            <div v-else-if="isTripCompleted" class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <i class="bi bi-patch-check-fill"></i>
              <span>Salida Concluida & Liquidada</span>
            </div>
          </div>

          <!-- Filters Bar -->
          <div class="grid sm:grid-cols-3 gap-4 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Excursión</label>
              <select v-model="selectedExcursionId" @change="onFilterChange" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
                <option value="">Todas mis excursiones</option>
                <option v-for="e in myExcursions" :key="e.id" :value="e.id">{{ e.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha de Salida</label>
              <input v-model="selectedDate" @change="onFilterChange" type="date" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
            </div>
            <div class="flex items-end">
              <button @click="fetchManifest" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2">
                <i class="bi bi-funnel"></i> Filtrar Manifiesto
              </button>
            </div>
          </div>

          <!-- Manifest Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Pasajeros</span>
              <span class="text-lg font-black text-white">{{ manifestSummary.total_passengers }}</span>
            </div>
            <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Abordados</span>
              <span class="text-lg font-black text-brand-400">{{ manifestSummary.checked_in_count }} / {{ manifestSummary.total_passengers }}</span>
            </div>
            <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Cobrado</span>
              <span class="text-lg font-black text-emerald-400">{{ formatMoney(manifestSummary.total_paid) }}</span>
            </div>
            <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Saldo Pendiente</span>
              <span class="text-lg font-black" :class="manifestSummary.total_balance > 0 ? 'text-amber-400' : 'text-slate-400'">{{ formatMoney(manifestSummary.total_balance) }}</span>
            </div>
          </div>

          <!-- Manifest Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Folio / Voucher</th>
                  <th class="py-3 px-4">Pasajero Principal</th>
                  <th class="py-3 px-4">Plazas</th>
                  <th class="py-3 px-4">Excursión & Fecha</th>
                  <th class="py-3 px-4 text-right">Monto / Saldo</th>
                  <th class="py-3 px-4 text-center">Pago</th>
                  <th class="py-3 px-4 text-center">Abordaje</th>
                  <th class="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="item in manifestItems" :key="item.id" class="hover:bg-slate-900/60 transition-colors">
                  <td class="py-3 px-4 font-mono font-bold text-white">{{ item.voucher_code }}</td>
                  <td class="py-3 px-4">
                    <div class="font-bold text-white">{{ item.customer_name }}</div>
                    <a :href="'https://wa.me/' + cleanPhone(item.customer_phone)" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono mt-0.5">
                      <i class="bi bi-whatsapp"></i> {{ item.customer_phone }}
                    </a>
                  </td>
                  <td class="py-3 px-4 font-bold text-white">
                    <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200">{{ item.people }} pers.</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="text-slate-200 font-medium">{{ item.excursion_name }}</div>
                    <div class="text-[10px] text-slate-500">{{ item.excursion_date }}</div>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="font-bold text-white">{{ formatMoney(item.total) }}</div>
                    <div class="text-[10px]" :class="item.balance > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'">
                      {{ item.balance > 0 ? ('Resta: ' + formatMoney(item.balance)) : 'Completado' }}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider" :class="paymentBadgeClass(item.payment_status)">
                      {{ paymentLabel(item.payment_status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span v-if="item.checked_in" class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <i class="bi bi-check2"></i> Abordó
                    </span>
                    <span v-else class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">
                      Pendiente
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <button
                      v-if="!item.checked_in"
                      @click="checkInItem(item)"
                      class="px-3 py-1.5 rounded-lg bg-brand-500 text-slate-950 text-[10px] font-black hover:bg-brand-400 transition-colors uppercase tracking-wider"
                    >
                      Check-in
                    </button>
                    <span v-else class="text-[10px] text-slate-500 font-medium">Listo</span>
                  </td>
                </tr>

                <tr v-if="!manifestItems.length && !loading">
                  <td colspan="8" class="py-12 text-center text-slate-500">
                    <i class="bi bi-inbox text-3xl mb-2 block opacity-40"></i>
                    No hay reservaciones para los filtros seleccionados.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: VALIDADOR DE VOUCHERS / ESCÁNER QR -->
      <div v-else-if="currentTab === 'validator'" class="max-w-xl mx-auto space-y-6 animate-fade-in">
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center">
          <div class="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
            <i class="bi bi-qr-code-scan"></i>
          </div>
          <h2 class="text-2xl font-black text-white tracking-tight mb-2">Validador de Abordaje</h2>
          <p class="text-xs text-slate-400 mb-6">Escanea o ingresa el código del voucher digital presentado por el pasajero.</p>

          <form @submit.prevent="validateVoucher" class="space-y-4">
            <div class="relative">
              <input
                v-model="voucherInput"
                type="text"
                required
                placeholder="Ej. EP-BK-7A9B2C o token..."
                class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-mono text-center text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors uppercase tracking-wider"
              >
            </div>

            <button
              :disabled="validating || !voucherInput.trim()"
              class="w-full bg-brand-500 text-slate-950 hover:bg-brand-400 font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-500/20 uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i v-if="validating" class="bi bi-arrow-repeat animate-spin"></i>
              <i v-else class="bi bi-patch-check-fill"></i>
              <span>{{ validating ? 'Verificando...' : 'Validar y Registrar Abordaje' }}</span>
            </button>
          </form>

          <!-- Result Alert -->
          <div v-if="validationResult" class="mt-6 p-5 rounded-2xl text-left border animate-fade-in" :class="validationResult.ok ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200' : 'bg-red-950/30 border-red-800/60 text-red-200'">
            <div class="flex items-center gap-3 mb-3">
              <i class="bi text-2xl" :class="validationResult.ok ? 'bi-check-circle-fill text-emerald-400' : 'bi-exclamation-triangle-fill text-red-400'"></i>
              <div>
                <h4 class="font-black text-sm">{{ validationResult.message }}</h4>
                <p v-if="validationResult.warning" class="text-xs text-amber-400 font-bold mt-0.5">{{ validationResult.warning }}</p>
              </div>
            </div>

            <div v-if="validationResult.passenger" class="text-xs space-y-1 bg-slate-950/40 p-3 rounded-xl font-mono text-slate-300">
              <div><strong>Pasajero:</strong> {{ validationResult.passenger.name }} ({{ validationResult.passenger.people }} plazas)</div>
              <div><strong>Excursión:</strong> {{ validationResult.passenger.excursion }}</div>
              <div><strong>Fecha:</strong> {{ validationResult.passenger.date }}</div>
              <div><strong>Saldo restante:</strong> {{ formatMoney(validationResult.passenger.balance) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: MIS EXCURSIONES & SALIDAS -->
      <div v-else-if="currentTab === 'excursions'" class="space-y-6 animate-fade-in">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-white tracking-tight">Mis Excursiones</h2>
            <p class="text-xs text-slate-400">Gestiona las fechas activas y cupos máximos de tus experiencias turísticas.</p>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="exc in myExcursions" :key="exc.id" class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-brand-400 block mb-1">{{ exc.destination }}</span>
                <h3 class="text-lg font-black text-white">{{ exc.name }}</h3>
                <p class="text-xs text-slate-400 mt-1">{{ exc.duration }} · Precio: {{ formatMoney(exc.price) }} / pers.</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Activa</span>
            </div>

            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-4">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Cupo Máximo por Salida</label>
                <input v-model.number="exc.max_capacity" type="number" min="1" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
              </div>

              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fechas de Salida (una por línea, AAAA-MM-DD)</label>
                <textarea v-model="exc.available_dates_text" rows="4" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"></textarea>
              </div>

              <button
                @click="saveExcursionDates(exc)"
                :disabled="exc._saving"
                class="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <i v-if="exc._saving" class="bi bi-arrow-repeat animate-spin"></i>
                <i v-else class="bi bi-floppy"></i>
                <span>{{ exc._saving ? 'Guardando...' : 'Guardar Calendario' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: LIQUIDACIONES & DATOS BANCARIOS -->
      <div v-else-if="currentTab === 'settlements'" class="space-y-6 animate-fade-in">
        <div class="grid lg:grid-cols-3 gap-6">
          
          <!-- Bank Details Form -->
          <div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div>
              <h3 class="text-base font-black text-white tracking-tight">Cuenta para Dispersión</h3>
              <p class="text-xs text-slate-400 mt-0.5">EasyPoint deposita tus liquidaciones netas directamente a esta cuenta.</p>
            </div>

            <form @submit.prevent="saveBankDetails" class="space-y-4">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">CLABE Interbancaria (18 dígitos)</label>
                <input v-model="bankForm.clabe" maxlength="18" required type="text" placeholder="012180000000000000" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Institución Bancaria</label>
                <input v-model="bankForm.bank_name" required type="text" placeholder="Ej. BBVA, Santander..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Nombre del Beneficiario</label>
                <input v-model="bankForm.beneficiary" required type="text" placeholder="Razón social o nombre completo" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
              </div>

              <button :disabled="savingBank" class="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-brand-500/20">
                {{ savingBank ? 'Guardando...' : 'Actualizar Cuenta' }}
              </button>
            </form>
          </div>

          <!-- Settlements History Table -->
          <div class="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-black text-white tracking-tight">Historial de Liquidaciones</h3>
              <span class="text-xs text-slate-500">{{ settlementsList.length }} folios registrados</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-4">Folio</th>
                    <th class="py-3 px-4">Fecha Salida</th>
                    <th class="py-3 px-4 text-right">Venta Bruta</th>
                    <th class="py-3 px-4 text-right">Fee EasyPoint</th>
                    <th class="py-3 px-4 text-right">Neto a Cobrar</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  <tr v-for="st in settlementsList" :key="st.id" class="hover:bg-slate-900/60">
                    <td class="py-3 px-4 font-mono font-bold text-white">{{ st.folio }}</td>
                    <td class="py-3 px-4 text-slate-400 font-mono">{{ st.period }}</td>
                    <td class="py-3 px-4 text-right text-slate-300">{{ formatMoney(st.gross) }}</td>
                    <td class="py-3 px-4 text-right text-amber-400 font-mono">-{{ formatMoney(st.fee) }}</td>
                    <td class="py-3 px-4 text-right font-black text-emerald-400">{{ formatMoney(st.net) }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider" :class="st.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'">
                        {{ st.status === 'paid' ? 'Dispersado' : 'Por Dispersar' }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!settlementsList.length">
                    <td colspan="6" class="py-8 text-center text-slate-500">No hay liquidaciones registradas aún.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

    </main>
  </div>
</template>

<script>
export default {
  inject: ['appState', 'pb_url', 'showModal', 'toggleNotificationCenter'],
  data() {
    return {
      loading: false,
      actionLoading: false,
      currentTab: 'manifest',
      providerName: 'Mi Proveedora',
      providerRecord: null,
      myExcursions: [],
      selectedExcursionId: '',
      selectedDate: '',
      manifestItems: [],
      manifestSummary: {
        total_passengers: 0,
        checked_in_count: 0,
        total_gross: 0,
        total_paid: 0,
        total_balance: 0
      },
      voucherInput: '',
      validating: false,
      validationResult: null,
      metrics: {
        total_passengers: 0,
        completed_passengers: 0,
        gross_revenue: 0,
        settled_net: 0,
        pending_payout: 0,
        total_bookings: 0
      },
      settlementsList: [],
      bankForm: {
        clabe: '',
        bank_name: '',
        beneficiary: ''
      },
      savingBank: false
    };
  },
  computed: {
    tabs() {
      return [
        { id: 'manifest', label: 'Salidas & Manifiesto', icon: 'bi-card-checklist', badge: this.manifestItems.length || null },
        { id: 'validator', label: 'Validador & Check-in QR', icon: 'bi-qr-code-scan' },
        { id: 'excursions', label: 'Mis Excursiones & Salidas', icon: 'bi-calendar-week' },
        { id: 'settlements', label: 'Liquidaciones & Datos Bancarios', icon: 'bi-cash-coin' }
      ];
    },
    feeRateText() {
      if (!this.providerRecord) return '15%';
      if (this.providerRecord.fee_type === 'fixed') return `$${this.providerRecord.fee_amount || 0} por reserva`;
      return `${this.providerRecord.fee_rate || 15}%`;
    },
    unreadCount() {
      return (this.appState.notifications || []).filter(n => !n.readAt).length;
    },
    isTripCompleted() {
      if (!this.manifestItems.length) return false;
      return this.manifestItems.every(item => item.status === 'completed');
    }
  },
  mounted() {
    this.fetchProviderData();
  },
  methods: {
    formatMoney(amount) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(amount) || 0);
    },
    cleanPhone(ph) {
      return String(ph || '').replace(/\D/g, '');
    },
    paymentBadgeClass(status) {
      switch (status) {
        case 'paid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        case 'partial': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        case 'credit': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
        default: return 'bg-slate-800 text-slate-400 border border-slate-700';
      }
    },
    paymentLabel(status) {
      switch (status) {
        case 'paid': return 'Liquidado';
        case 'partial': return 'Apartado';
        case 'credit': return 'Crédito';
        default: return 'Pendiente';
      }
    },
    async fetchProviderData() {
      this.loading = true;
      try {
        const headers = this.appState.token ? { 'Authorization': this.appState.token } : {};
        const res = await fetch(`${this.pb_url}/api/provider/dashboard`, { headers });
        if (res.ok) {
          const data = await res.json();
          this.providerRecord = data.provider || null;
          this.providerName = data.provider?.name || 'Proveedor Aliado';
          this.metrics = { ...this.metrics, ...(data.metrics || {}) };
          this.settlementsList = data.recent_settlements || [];
          if (data.provider) {
            this.bankForm.clabe = data.provider.clabe || '';
            this.bankForm.bank_name = data.provider.bank_name || '';
            this.bankForm.beneficiary = data.provider.name || '';
          }
        }
      } catch (_) {}

      // Fetch Excursions for this provider
      try {
        const res = await fetch(`${this.pb_url}/api/collections/excursions/records?perPage=50`, {
          headers: this.appState.token ? { 'Authorization': this.appState.token } : {}
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          const userProvId = this.providerRecord?.id || this.appState.user?.provider_ref;
          const filtered = userProvId ? items.filter(e => e.provider_id === userProvId) : items;
          this.myExcursions = filtered.map(e => ({
            ...e,
            available_dates_text: String(e.available_dates || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).join('\n'),
            _saving: false
          }));

          if (this.myExcursions.length && !this.selectedExcursionId) {
            this.selectedExcursionId = this.myExcursions[0].id;
            const dates = String(this.myExcursions[0].available_dates || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
            if (dates.length) this.selectedDate = dates[0];
          }
        }
      } catch (_) {}

      await this.fetchManifest();
      this.loading = false;
    },
    async fetchManifest() {
      try {
        const params = new URLSearchParams();
        if (this.selectedExcursionId) params.append('excursion_id', this.selectedExcursionId);
        if (this.selectedDate) params.append('date', this.selectedDate);

        const res = await fetch(`${this.pb_url}/api/provider/manifest?${params.toString()}`, {
          headers: this.appState.token ? { 'Authorization': this.appState.token } : {}
        });
        if (res.ok) {
          const data = await res.json();
          this.manifestItems = data.items || [];
          this.manifestSummary = data.summary || { total_passengers: 0, checked_in_count: 0, total_gross: 0, total_paid: 0, total_balance: 0 };
        }
      } catch (_) {}
    },
    onFilterChange() {
      this.fetchManifest();
    },
    async checkInItem(item) {
      try {
        const res = await fetch(`${this.pb_url}/api/provider/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.appState.token ? { 'Authorization': this.appState.token } : {})
          },
          body: JSON.stringify({ code: item.voucher_code || item.id })
        });
        const data = await res.json();
        if (res.ok) {
          item.checked_in = true;
          this.manifestSummary.checked_in_count += (item.people || 1);
          await this.showModal({
            title: '¡Abordaje Registrado!',
            message: data.warning ? `${data.message}\n\n⚠️ ${data.warning}` : data.message,
            type: data.warning ? 'warning' : 'success'
          });
        } else {
          await this.showModal({ title: 'Error de Validación', message: data.message || 'No se pudo registrar.', type: 'danger' });
        }
      } catch (err) {
        await this.showModal({ title: 'Error de Red', message: err.message, type: 'danger' });
      }
    },
    async validateVoucher() {
      if (!this.voucherInput.trim()) return;
      this.validating = true;
      this.validationResult = null;
      try {
        const res = await fetch(`${this.pb_url}/api/provider/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.appState.token ? { 'Authorization': this.appState.token } : {})
          },
          body: JSON.stringify({ code: this.voucherInput.trim() })
        });
        const data = await res.json();
        if (res.ok) {
          this.validationResult = { ok: true, message: data.message, warning: data.warning, passenger: data.passenger };
          this.voucherInput = '';
          this.fetchManifest();
        } else {
          this.validationResult = { ok: false, message: data.message || 'Código inválido o pertenece a otro proveedor.' };
        }
      } catch (err) {
        this.validationResult = { ok: false, message: 'Error de comunicación: ' + err.message };
      } finally {
        this.validating = false;
      }
    },
    async completeTrip() {
      const confirmed = await this.showModal({
        title: 'Concluir Salida y Liquidar',
        message: `¿Confirmas que la salida del ${this.selectedDate} ha concluido satisfactoriamente? Se generará en el acto la liquidación neta a tu favor.`,
        type: 'info',
        confirmText: 'Sí, Concluir y Liquidar',
        cancelText: 'Cancelar'
      });
      if (!confirmed) return;

      this.actionLoading = true;
      try {
        const res = await fetch(`${this.pb_url}/api/provider/complete-trip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.appState.token ? { 'Authorization': this.appState.token } : {})
          },
          body: JSON.stringify({
            excursion_id: this.selectedExcursionId,
            date: this.selectedDate
          })
        });
        const data = await res.json();
        if (res.ok) {
          await this.showModal({
            title: '¡Liquidación Automática Generada!',
            message: `Folio: ${data.settlement.folio}\nTotal Bruto: ${this.formatMoney(data.settlement.gross)}\nComisión EasyPoint: ${this.formatMoney(data.settlement.fee)}\nNeto a Transferir: ${this.formatMoney(data.settlement.net)}`,
            type: 'success'
          });
          await this.fetchProviderData();
        } else {
          await this.showModal({ title: 'Error', message: data.message || 'No se pudo completar la salida.', type: 'danger' });
        }
      } catch (err) {
        await this.showModal({ title: 'Error de Red', message: err.message, type: 'danger' });
      } finally {
        this.actionLoading = false;
      }
    },
    async saveExcursionDates(exc) {
      exc._saving = true;
      try {
        const dates = exc.available_dates_text.split('\n').map(s => s.trim()).filter(Boolean);
        const res = await fetch(`${this.pb_url}/api/provider/excursions/dates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.appState.token ? { 'Authorization': this.appState.token } : {})
          },
          body: JSON.stringify({
            excursion_id: exc.id,
            available_dates: dates,
            max_capacity: exc.max_capacity
          })
        });
        if (res.ok) {
          await this.showModal({ title: 'Guardado', message: 'Fechas y cupo actualizados exitosamente.', type: 'success' });
        }
      } catch (err) {
        await this.showModal({ title: 'Error', message: err.message, type: 'danger' });
      } finally {
        exc._saving = false;
      }
    },
    async saveBankDetails() {
      this.savingBank = true;
      try {
        if (!this.providerRecord?.id) throw new Error('Proveedor no identificado.');
        const res = await fetch(`${this.pb_url}/api/collections/providers/records/${this.providerRecord.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(this.appState.token ? { 'Authorization': this.appState.token } : {})
          },
          body: JSON.stringify(this.bankForm)
        });
        if (res.ok) {
          await this.showModal({ title: 'Cuenta Actualizada', message: 'Los datos bancarios para liquidaciones fueron guardados.', type: 'success' });
        }
      } catch (err) {
        await this.showModal({ title: 'Error', message: err.message, type: 'danger' });
      } finally {
        this.savingBank = false;
      }
    },
    logout() {
      window.location.reload();
    }
  }
};
</script>
