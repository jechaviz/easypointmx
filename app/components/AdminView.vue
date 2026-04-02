<template>
  <div class="min-h-screen bg-slate-950 flex text-sm">
    
    <!-- SIDEBAR (Premium Glass Design) -->
    <aside class="w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen z-50">
      <div class="p-8">
        <div class="flex items-center gap-3 mb-10 group overflow-hidden">
           <div class="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
              <i class="bi bi-shield-lock-fill text-slate-900 text-xl"></i>
           </div>
           <div>
              <h1 class="text-white font-black text-lg tracking-tighter leading-none">Admin<span class="text-brand-400">Hub</span></h1>
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Easypoint Ops</p>
           </div>
        </div>

        <nav class="space-y-1">
          <button v-for="n in nav" :key="n.id" @click="section = n.id" 
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group relative overflow-hidden"
            :class="section === n.id ? 'bg-brand-500 text-slate-900 shadow-lg shadow-brand-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" v-if="section === n.id"></div>
            <i :class="'bi bi-' + n.icon" class="text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">{{ n.label }}</span>
            <div v-if="n.badge" class="ml-auto bg-slate-900 text-brand-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-700">{{ n.badge }}</div>
          </button>
        </nav>
      </div>

      <!-- Bottom Profile + Logout (SalesView pattern) -->
      <div class="mt-auto p-6 border-t border-slate-800/50">
         <!-- Demo badge -->
         <div v-if="demoMode" class="mb-4 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            <span class="text-amber-500 text-[10px] font-black uppercase tracking-widest">Modo Demo</span>
         </div>

         <!-- Profile card with caret -->
         <div class="relative">
            <!-- Flyout menu (opens upward) -->
            <div v-if="showUserMenu" class="absolute bottom-full mb-3 left-0 right-0 bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] py-2 z-[70] animate-fade-in">
               <button @click="section = 'settings'; showUserMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-brand-400 transition-all flex items-center gap-3 rounded-xl">
                  <i class="bi bi-gear-fill"></i> Configuración
               </button>
               <hr class="border-slate-800 mx-4 my-1">
               <button @click="logout" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-3 rounded-xl">
                  <i class="bi bi-box-arrow-left"></i> Cerrar Sesión
               </button>
            </div>

            <!-- Profile pill -->
            <div class="bg-slate-950/50 rounded-[2rem] p-4 border border-slate-800 flex items-center gap-4 group hover:border-brand-500/30 transition-all">
               <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 font-black border border-slate-700 shadow-inner flex-shrink-0">
                  {{ (appState.user?.full_name || 'A').charAt(0) }}
               </div>
               <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-black text-white truncate">{{ appState.user?.full_name || 'Admin' }}</p>
                  <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Administrador</p>
               </div>
               <button @click="showUserMenu = !showUserMenu" class="text-slate-500 hover:text-brand-400 transition-colors p-1 flex-shrink-0">
                  <i class="bi transition-transform" :class="showUserMenu ? 'bi-caret-up-fill text-brand-400' : 'bi-caret-down-fill'"></i>
               </button>
            </div>
         </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.03),transparent_40%)]">
      
      <!-- Slim page title row (no sticky bar) -->
      <div class="px-10 pt-10 pb-4">
        <h2 class="text-white text-3xl font-black tracking-tight mb-1">{{ currentNav?.label }}</h2>
        <p class="text-slate-500 text-xs font-medium">{{ currentNav?.desc }}</p>
      </div>

      <div class="p-8 pt-4">

        <!-- ── DASHBOARD (Premium Redesign) ── -->
        <div v-if="section === 'dashboard'">
          <!-- Premium Stats -->
          <div class="grid grid-cols-4 gap-6 mb-12 animate-fade-in">
            <div v-for="stat in kpis" :key="stat.label" class="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div class="absolute -top-12 -right-12 w-24 h-24 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
              <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-brand-400 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                  <i :class="'bi bi-' + stat.icon" class="text-xl"></i>
                </div>
                <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-tight">{{ stat.label }}</p>
              </div>
              <p class="text-white text-4xl font-black mb-2 group-hover:text-brand-500 transition-colors">{{ stat.value }}</p>
              <div class="flex items-center gap-2 text-[11px] font-bold" :class="stat.trend > 0 ? 'text-green-400' : 'text-slate-500'">
                <i :class="stat.trend > 0 ? 'bi bi-graph-up-arrow' : 'bi bi-dash-lg'"></i>
                <span>{{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}% vs mes ant.</span>
              </div>
            </div>
          </div>

          <!-- Activity Feed + Quick Stats -->
          <div class="grid lg:grid-cols-2 gap-6">
            <!-- Recent Shipments -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 class="text-white font-bold mb-4 flex items-center gap-2"><i class="bi bi-activity text-brand-400"></i> Actividad Reciente</h3>
              <div v-if="recentShipments.length === 0" class="text-slate-600 text-xs text-center py-6">Cargando...</div>
              <div v-for="s in recentShipments" :key="s.id" class="flex items-center gap-3 py-2.5 border-b border-slate-800 last:border-0">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs" :class="statusColor(s.status)">
                  <i :class="'bi bi-' + statusIcon(s.status)"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-white font-mono font-bold text-xs">{{ s.tracking_id }}</p>
                  <p class="text-slate-500 text-[10px]">{{ formatStatus(s.status) }}</p>
                </div>
                <p class="text-slate-600 text-[10px]">{{ formatDate(s.created) }}</p>
              </div>
            </div>

            <!-- Pending Applications -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 class="text-white font-bold mb-4 flex items-center gap-2"><i class="bi bi-briefcase text-brand-400"></i> Solicitudes Pendientes</h3>
              <div v-if="pendingApps.length === 0" class="text-slate-600 text-xs text-center py-6">No hay solicitudes pendientes</div>
              <div v-for="app in pendingApps" :key="app.id" class="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
                <div class="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0"><i class="bi bi-shop"></i></div>
                <div class="flex-1 min-w-0">
                  <p class="text-white font-bold text-xs">{{ app.business_name }}</p>
                  <p class="text-slate-500 text-[10px] truncate">{{ app.address }}</p>
                  <p class="text-slate-600 text-[10px]">WhatsApp: {{ app.whatsapp }}</p>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <button @click="approveApp(app)" class="bg-brand-500 text-slate-900 text-[9px] font-black px-2 py-1 rounded-lg hover:bg-brand-400">✓</button>
                  <button @click="rejectApp(app)" class="bg-red-900/50 text-red-400 text-[9px] font-black px-2 py-1 rounded-lg hover:bg-red-900">✗</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── USERS ── -->
        <div v-else-if="section === 'users'">
          <div class="flex items-center justify-between mb-6">
            <p class="text-slate-400 text-sm">{{ users.length }} usuarios registrados</p>
            <button @click="showUserForm = true; editingUser = null; userForm = {email:'',password:'',full_name:'',role:'operator',point_ref:''}" 
              class="bg-brand-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs hover:bg-brand-400 flex items-center gap-2">
              <i class="bi bi-plus-circle"></i> Nuevo Usuario
            </button>
          </div>

          <DataView :items="users" :columns="userCols" label="Usuarios" storageKey="ep_admin_users">
            <template #row="{ item }">
              <td class="px-6 py-4">
                <p class="text-white font-semibold">{{ item.full_name || '—' }}</p>
                <p class="text-slate-500 text-xs">{{ item.email }}</p>
              </td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" 
                  :class="roleBadgeClass(item.role)">
                  {{ roleLabel(item.role) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="flex items-center gap-1.5 text-xs" :class="item.verified ? 'text-green-400' : 'text-amber-400'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="item.verified ? 'bg-green-400' : 'bg-amber-400'"></span>
                  {{ item.verified ? 'Activo' : 'Pendiente' }}
                </span>
              </td>
            </template>
            <template #actions="{ item }">
               <button v-if="!item.verified" @click="approveUser(item)" class="text-amber-400 hover:text-brand-400 transition-colors mr-3 shadow-sm hover:scale-110"><i class="bi bi-person-check"></i></button>
               <button @click="editUser(item)" class="text-slate-400 hover:text-brand-400 transition-colors mr-3 shadow-sm hover:scale-110"><i class="bi bi-pencil"></i></button>
               <button @click="deleteUser(item)" class="text-slate-600 hover:text-red-400 transition-colors"><i class="bi bi-trash"></i></button>
            </template>
            <template #card="{ item }">
              <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-brand-500/30 transition-all group">
                <div class="flex items-center justify-between mb-4">
                  <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 font-bold group-hover:border-brand-500/50">
                    {{ (item.full_name || item.email).charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex items-center gap-3">
                    <button v-if="!item.verified" @click="approveUser(item)" class="text-amber-400 hover:text-brand-400"><i class="bi bi-person-check"></i></button>
                    <button @click="editUser(item)" class="text-slate-500 hover:text-white"><i class="bi bi-pencil"></i></button>
                  </div>
                </div>
                <h4 class="text-white font-bold">{{ item.full_name || 'Sin nombre' }}</h4>
                <p class="text-slate-500 text-[10px] mb-4">{{ item.email }}</p>
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest" :class="roleBadgeClass(item.role)">{{ roleLabel(item.role) }}</span>
                  <span class="text-[10px] font-bold" :class="item.verified ? 'text-green-500' : 'text-amber-500'">● {{ item.verified ? 'Activo' : 'Pendiente' }}</span>
                </div>
                <button v-if="!item.verified" @click="approveUser(item)" class="w-full mt-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black py-2 rounded-xl text-[10px] hover:bg-amber-500/20">
                  Aprobar acceso
                </button>
              </div>
            </template>
          </DataView>

          <!-- User Form Modal -->
          <div v-if="showUserForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div class="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
              <h3 class="text-white font-black text-lg mb-6">{{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
              <div class="space-y-4">
                <div>
                  <label class="label-sm">Nombre completo</label>
                  <input v-model="userForm.full_name" class="input-dark" placeholder="Nombre del operador">
                </div>
                <div>
                  <label class="label-sm">Correo (yopmail.com)</label>
                  <input v-model="userForm.email" type="email" class="input-dark" placeholder="punto@yopmail.com" :disabled="!!editingUser">
                </div>
                <div v-if="!editingUser">
                  <label class="label-sm">Contraseña</label>
                  <div class="relative">
                    <input :type="showNewPwd ? 'text' : 'password'" v-model="userForm.password"
                      class="input-dark pr-12" placeholder="Crea una contraseña segura"
                      @input="checkStrength">
                    <button type="button" @click="showNewPwd = !showNewPwd"
                      class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300">
                      <i class="bi" :class="showNewPwd ? 'bi-eye-slash' : 'bi-eye'"></i>
                    </button>
                  </div>
                  <!-- Strength bar -->
                  <div class="mt-2 flex gap-1">
                    <div v-for="i in 4" :key="i" class="flex-1 h-1 rounded-full transition-all duration-300"
                      :class="pwdStrength >= i ? pwdBarColor : 'bg-slate-700'"></div>
                  </div>
                  <p class="text-[10px] mt-1 font-bold" :class="pwdStrengthLabel.color">{{ pwdStrengthLabel.text }}</p>
                  <!-- Rule checklist -->
                  <ul class="mt-3 space-y-1">
                    <li v-for="rule in pwdRules" :key="rule.label"
                      class="flex items-center gap-2 text-[10px] transition-colors"
                      :class="rule.ok ? 'text-green-400' : 'text-slate-600'">
                      <i class="bi flex-shrink-0" :class="rule.ok ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                      {{ rule.label }}
                    </li>
                  </ul>
                </div>
                <div>
                  <label class="label-sm">Rol</label>
                  <select v-model="userForm.role" class="input-dark">
                    <option value="operator">Local</option>
                    <option value="driver">Repartidor</option>
                    <option value="sales">Ventas</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-3 mt-6">
                <button @click="saveUser" class="flex-1 bg-brand-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-brand-400 text-sm">Guardar</button>
                <button @click="showUserForm = false" class="flex-1 bg-slate-800 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-700 text-sm">Cancelar</button>
              </div>
              <p v-if="formMsg" class="text-red-400 text-xs mt-3 text-center">{{ formMsg }}</p>
            </div>
          </div>
        </div>

        <!-- ── POINTS ── -->
        <div v-else-if="section === 'points'">
          <div class="flex items-center justify-between mb-6">
            <p class="text-slate-400 text-sm">{{ points.length }} puntos activos</p>
            <button @click="showPointForm = true; editingPoint = null; pointForm = { name: '', address: '', whatsapp: '' }" 
              class="bg-brand-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs hover:bg-brand-400 flex items-center gap-2">
              <i class="bi bi-plus-circle"></i> Nuevo Punto
            </button>
          </div>
          <DataView :items="points" :columns="pointCols" label="Locales" storageKey="ep_admin_points" defaultView="grid">
             <template #row="{ item }">
               <td class="px-6 py-4 text-white font-bold text-xs">{{ item.name }}</td>
               <td class="px-6 py-4">
                  <a :href="getMapsUrl(item.address)" target="_blank" class="text-slate-400 text-xs hover:text-brand-400 transition-colors truncate block max-w-xs">
                    <i class="bi bi-geo-alt mr-1"></i>{{ item.address }}
                  </a>
               </td>
               <td class="px-6 py-4">
                 <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 uppercase tracking-widest">Activo</span>
               </td>
             </template>
             <template #actions="{ item }">
                <button @click="editPoint(item)" class="text-slate-500 hover:text-brand-400 mr-2"><i class="bi bi-pencil"></i></button>
                <button @click="deletePoint(item)" class="text-slate-500 hover:text-red-400"><i class="bi bi-trash"></i></button>
             </template>
             <template #card="{ item }">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
                  <div class="flex items-start justify-between mb-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center text-lg"><i class="bi bi-shop"></i></div>
                    <span class="text-[10px] font-black px-2 py-1 rounded-full bg-green-500/10 text-green-400">ACTIVO</span>
                  </div>
                  <h4 class="text-white font-bold mb-1">{{ item.name }}</h4>
                  <a :href="getMapsUrl(item.address)" target="_blank" class="text-slate-500 text-xs mb-3 flex items-start gap-1 hover:text-brand-400 transition-colors">
                    <i class="bi bi-pin-map mt-0.5"></i> {{ item.address }}
                  </a>
                  <div class="flex gap-2 text-[10px]">
                    <a v-if="item.whatsapp" :href="'https://wa.me/'+item.whatsapp" target="_blank" class="bg-green-900/40 text-green-400 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-green-800/40">
                      <i class="bi bi-whatsapp"></i> {{ item.whatsapp }}
                    </a>
                  </div>
                  <p v-if="item.horarios" class="text-slate-600 text-[10px] mt-2"><i class="bi bi-clock mr-1"></i>{{ item.horarios }}</p>
                </div>
             </template>
          </DataView>

          <!-- Point Form Modal -->
          <div v-if="showPointForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div class="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h3 class="text-white font-black text-lg mb-6">{{ editingPoint ? 'Editar Punto' : 'Nuevo Punto de Entrega' }}</h3>
              <div class="space-y-4">
                <div>
                  <label class="label-sm">Nombre del negocio</label>
                  <input v-model="pointForm.name" class="input-dark" placeholder="Ej: Farmacia Central">
                </div>
                <div>
                  <label class="label-sm">Ubicación (Buscador)</label>
                  <AddressInput v-model="pointForm.address" placeholder="Busca la dirección..." />
                </div>
                <div>
                  <label class="label-sm">WhatsApp de contacto</label>
                  <input v-model="pointForm.whatsapp" class="input-dark" placeholder="521234567890">
                </div>
              </div>
              <div class="flex gap-3 mt-8">
                <button @click="savePoint" class="flex-1 bg-brand-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-brand-400 text-sm">Guardar Punto</button>
                <button @click="showPointForm = false" class="flex-1 bg-slate-800 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-700 text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SHIPMENTS ── -->
        <div v-else-if="section === 'shipments'">
          <DataView :items="filteredShipments" :columns="shipmentCols" label="Envíos" storageKey="ep_admin_shipments">
             <template #header-actions>
                <select v-model="shipFilter" class="input-dark w-auto text-[10px] font-black uppercase py-1.5 h-auto">
                  <option value="">Filtrar Estado</option>
                  <option value="pending">Pendiente</option>
                  <option value="in_transit">En tránsito</option>
                  <option value="at_point">En punto</option>
                  <option value="delivered">Entregado</option>
                </select>
             </template>
             <template #row="{ item }">
                <td class="px-5 py-3 font-mono text-brand-400 font-bold text-xs">{{ item.tracking_id }}</td>
                <td class="px-5 py-3 text-white text-xs font-bold">{{ item.recipient_name || '—' }}</td>
                <td class="px-5 py-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest" :class="statusBadge(item.status)">
                    {{ formatStatus(item.status) }}
                  </span>
                </td>
                <td class="px-5 py-3 text-slate-400 text-xs">{{ item.expand?.point_id?.name || '—' }}</td>
                <td class="px-5 py-3 text-slate-600 text-[10px]">{{ formatDate(item.created) }}</td>
             </template>
             <template #card="{ item }">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg">
                   <div class="flex items-center justify-between mb-4">
                      <span class="text-brand-400 font-mono font-black text-xs">{{ item.tracking_id }}</span>
                      <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter" :class="statusBadge(item.status)">
                        {{ formatStatus(item.status) }}
                      </span>
                   </div>
                   <h4 class="text-white font-bold text-sm mb-1">{{ item.recipient_name || '—' }}</h4>
                   <p class="text-slate-500 text-[10px]"><i class="bi bi-shop mr-1 opacity-50"></i> {{ item.expand?.point_id?.name || 'Punto no asignado' }}</p>
                   <p class="text-slate-600 text-[9px] mt-4 flex items-center justify-between">
                     <span>{{ formatDate(item.created) }}</span>
                     <i class="bi bi-chevron-right opacity-30"></i>
                   </p>
                </div>
             </template>
          </DataView>
        </div>

        <!-- ── COMMISSIONS ── -->
        <div v-else-if="section === 'commissions'">
          <div class="grid lg:grid-cols-3 gap-5 mb-8">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 col-span-1">
              <p class="text-slate-500 text-xs mb-1">Tasa por paquete</p>
              <p class="text-brand-400 text-3xl font-black">$8.50 <span class="text-slate-600 text-sm font-normal">MXN</span></p>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p class="text-slate-500 text-xs mb-1">Comisiones pendientes</p>
              <p class="text-amber-400 text-3xl font-black">${{ pendingTotal.toLocaleString('es-MX') }}</p>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p class="text-slate-500 text-xs mb-1">Total pagado (histórico)</p>
              <p class="text-green-400 text-3xl font-black">${{ paidTotal.toLocaleString('es-MX') }}</p>
            </div>
          </div>

          <DataView :items="commissions" :columns="commCols" label="Comisiones" storageKey="ep_admin_commissions">
             <template #row="{ item }">
                <td class="px-6 py-4 text-white font-semibold text-xs">{{ item.point_name }}</td>
                <td class="px-6 py-4 text-slate-400 text-xs">{{ item.period }}</td>
                <td class="px-6 py-4 text-slate-300 text-xs text-right">{{ item.packages_handled }}</td>
                <td class="px-6 py-4 text-white font-bold text-xs text-right">${{ Number(item.total).toLocaleString('es-MX') }}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="item.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'">
                    {{ item.status === 'paid' ? 'Pagado' : 'Pendiente' }}
                  </span>
                </td>
             </template>
             <template #actions="{ item }">
                <button v-if="item.status === 'pending'" @click="markPaid(item)" 
                  class="bg-brand-500 text-slate-900 text-[9px] font-black px-3 py-1 rounded-lg hover:bg-brand-400">
                  Marcar pagado
                </button>
             </template>
             <template #card="{ item }">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                   <div class="flex items-start justify-between mb-4">
                      <div>
                         <h4 class="text-white font-bold text-sm">{{ item.point_name }}</h4>
                         <p class="text-slate-500 text-[10px]">{{ item.period }}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                        :class="item.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'">
                        {{ item.status }}
                      </span>
                   </div>
                   <div class="flex items-center justify-between border-t border-slate-800/50 pt-4">
                      <div>
                         <p class="text-[9px] text-slate-500 uppercase font-black mb-0.5">Monto</p>
                         <p class="text-white font-black text-lg">${{ Number(item.total).toLocaleString('es-MX') }}</p>
                      </div>
                      <button v-if="item.status === 'pending'" @click="markPaid(item)" class="bg-brand-500 text-slate-900 p-2 rounded-lg hover:scale-105 transition-transform">
                        <i class="bi bi-check-circle-fill"></i>
                      </button>
                   </div>
                </div>
             </template>
          </DataView>
        </div>

        <!-- ── INVOICES ── -->
        <div v-else-if="section === 'invoices'">
          <div class="flex items-center justify-between mb-6">
            <p class="text-slate-400 text-sm">{{ invoices.length }} facturas</p>
            <button @click="showInvoiceForm = true; resetInvoiceForm()" 
              class="bg-brand-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs hover:bg-brand-400 flex items-center gap-2">
              <i class="bi bi-plus-circle"></i> Nueva Factura
            </button>
          </div>

          <DataView :items="invoices" :columns="invCols" label="Facturas" storageKey="ep_admin_invoices">
             <template #row="{ item }">
                <td class="px-5 py-3 font-mono text-brand-400 font-bold text-xs">{{ item.number }}</td>
                <td class="px-5 py-3 text-white text-xs font-bold">{{ item.client_name }}</td>
                <td class="px-5 py-3 text-slate-400 text-[10px]">{{ item.period }}</td>
                <td class="px-5 py-3 text-white font-black text-right">${{ Number(item.total).toLocaleString('es-MX') }}</td>
                <td class="px-5 py-3">
                  <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                    :class="item.status === 'paid' ? 'bg-green-500/10 text-green-400' : item.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'">
                    {{ invStatusLabel(item.status) }}
                  </span>
                </td>
             </template>
             <template #actions="{ item }">
                <button v-if="item.status !== 'paid'" @click="updateInvoiceStatus(item, item.status === 'draft' ? 'sent' : 'paid')"
                  class="bg-brand-500 text-slate-900 text-[9px] font-bold px-3 py-1 rounded-lg">
                  {{ item.status === 'draft' ? 'Enviar' : 'Pagar' }}
                </button>
                <button @click="printInvoice(item)" class="text-slate-500 hover:text-white"><i class="bi bi-printer"></i></button>
             </template>
             <template #card="{ item }">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                  <div class="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <p class="text-brand-400 font-mono font-black text-sm">{{ item.number }}</p>
                      <p class="text-white font-bold mt-1 truncate max-w-[120px]">{{ item.client_name }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-white text-lg font-black">${{ Number(item.total).toLocaleString('es-MX') }}</p>
                      <span class="mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter"
                        :class="item.status === 'paid' ? 'bg-green-500/10 text-green-400' : item.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'">
                        {{ invStatusLabel(item.status) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-3 mt-4">
                    <button v-if="item.status !== 'paid'" @click="updateInvoiceStatus(item, item.status === 'draft' ? 'sent' : 'paid')"
                      class="flex-1 bg-brand-500 text-slate-900 text-[10px] font-bold py-2 rounded-xl hover:bg-brand-400">
                      {{ item.status === 'draft' ? 'Enviar' : 'Pagada' }}
                    </button>
                    <button @click="printInvoice(item)" class="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-700">
                      <i class="bi bi-printer"></i>
                    </button>
                  </div>
                </div>
             </template>
          </DataView>

          <!-- Invoice Modal -->
          <div v-if="showInvoiceForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div class="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 class="text-white font-black text-lg mb-6">Nueva Factura</h3>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div><label class="label-sm">No. Factura</label><input v-model="invoiceForm.number" class="input-dark" placeholder="EP-2026-002"></div>
                  <div><label class="label-sm">Período</label><input v-model="invoiceForm.period" class="input-dark" placeholder="2026-03"></div>
                </div>
                <div><label class="label-sm">Cliente</label><input v-model="invoiceForm.client_name" class="input-dark" placeholder="Nombre o razón social"></div>
                <div><label class="label-sm">RFC</label><input v-model="invoiceForm.client_rfc" class="input-dark" placeholder="RFC del cliente"></div>
                <div>
                  <label class="label-sm">Concepto / Paquetes</label>
                  <div class="grid grid-cols-3 gap-2">
                    <input v-model="invoiceForm.concept" class="input-dark col-span-2" placeholder="Descripción">
                    <input v-model.number="invoiceForm.qty" type="number" class="input-dark" placeholder="Qty">
                  </div>
                  <div class="grid grid-cols-2 gap-2 mt-2">
                    <input v-model.number="invoiceForm.unit_price" type="number" class="input-dark" placeholder="Precio unitario">
                    <div class="input-dark bg-slate-900 text-brand-400 font-bold flex items-center px-4">
                      Total: ${{ (invoiceForm.qty * invoiceForm.unit_price).toLocaleString('es-MX') }}
                    </div>
                  </div>
                </div>
                <div><label class="label-sm">Notas</label><textarea v-model="invoiceForm.notes" class="input-dark" rows="2" placeholder="Condiciones de pago, etc."></textarea></div>
              </div>
              <div class="flex gap-3 mt-6">
                <button @click="createInvoice" class="flex-1 bg-brand-500 text-slate-900 font-bold py-3 rounded-xl text-sm hover:bg-brand-400">Crear Factura</button>
                <button @click="showInvoiceForm = false" class="flex-1 bg-slate-800 text-slate-400 font-bold py-3 rounded-xl text-sm hover:bg-slate-700">Cancelar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── PARTNER APPS ── -->
        <div v-else-if="section === 'partners'">
          <DataView :items="allApps" :columns="partnerCols" label="Solicitudes" storageKey="ep_admin_partners">
             <template #row="{ item }">
                <td class="px-6 py-4 text-white font-bold text-xs">{{ item.business_name }}</td>
                <td class="px-6 py-4 text-slate-400 text-xs">{{ item.address }}</td>
                <td class="px-6 py-4">
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
                    :class="item.status === 'approved' ? 'bg-green-900/50 text-green-400' : item.status === 'rejected' ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'">
                    {{ item.status.toUpperCase() }}
                  </span>
                </td>
             </template>
             <template #actions="{ item }">
                <div v-if="item.status === 'new'" class="flex gap-2">
                  <button @click="approveApp(item)" class="bg-brand-500 text-slate-900 font-bold px-3 py-1 rounded-lg text-[9px]">Aprobar</button>
                  <button @click="rejectApp(item)" class="bg-red-900/40 text-red-400 font-bold px-3 py-1 rounded-lg text-[9px]">Rechazar</button>
                </div>
             </template>
             <template #card="{ item }">
                <div class="bg-slate-900 border rounded-2xl p-6 transition-colors shadow-lg"
                  :class="item.status === 'approved' ? 'border-green-800' : item.status === 'rejected' ? 'border-red-900' : 'border-slate-800'">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-white font-bold truncate">{{ item.business_name }}</h4>
                      <p class="text-slate-500 text-[10px] truncate">{{ item.address }}</p>
                    </div>
                    <span class="text-[9px] font-black px-2 py-0.5 rounded-full"
                      :class="item.status === 'approved' ? 'bg-green-900/50 text-green-400' : item.status === 'rejected' ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'">
                      {{ item.status.toUpperCase() }}
                    </span>
                  </div>
                  <div v-if="item.status === 'new'" class="flex gap-2 mt-6">
                    <button @click="approveApp(item)" class="flex-1 bg-brand-500 text-slate-900 font-black py-2 rounded-xl text-[10px] hover:bg-brand-400">✓ Aprobar</button>
                    <button @click="rejectApp(item)" class="flex-1 bg-red-900/40 text-red-400 font-black py-2 rounded-xl text-[10px] hover:bg-red-900/60">✗ Rechazar</button>
                  </div>
                </div>
             </template>
          </DataView>
        </div>

        <!-- ── SETTINGS ── -->
        <div v-else-if="section === 'settings'">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <h3 class="text-white font-bold mb-6 flex items-center gap-2">
              <i class="bi bi-gear text-brand-400"></i> Ajustes del Sistema
            </h3>
            
            <div class="space-y-6">
              <div class="flex items-start justify-between p-4 border border-slate-700/50 bg-slate-800/30 rounded-xl">
                <div>
                  <h4 class="text-white font-bold">Modo Demo (Datos de Prueba)</h4>
                  <p class="text-slate-400 text-xs mt-1 max-w-md">Inyecta datos ficticios realistas para demostraciones comerciales. <strong>No afecta la base de datos real.</strong></p>
                </div>
                <button @click="toggleDemo" class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  :class="demoMode ? 'bg-brand-500' : 'bg-slate-600'" role="switch">
                  <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200"
                    :class="demoMode ? 'translate-x-5' : 'translate-x-0'"></span>
                </button>
              </div>

              <div class="flex items-start justify-between p-4 border border-slate-700/50 bg-slate-800/30 rounded-xl">
                <div>
                  <h4 class="text-white font-bold">Asistente de Producción</h4>
                  <p class="text-slate-400 text-xs mt-1 max-w-md">Lanza el Wizard para configurar tu red desde cero (usuarios, locales, branding).</p>
                </div>
                <button @click="showWizard = true" class="bg-brand-500 text-slate-900 font-black px-4 py-2 rounded-xl text-[10px] uppercase hover:bg-brand-400 transition-all">
                  Iniciar Wizard
                </button>
              </div>

              <div class="flex items-start justify-between p-4 border border-slate-700/50 bg-slate-800/30 rounded-xl">
                <div>
                  <h4 class="text-white font-bold">Modo Test (Login Rápido)</h4>
                  <p class="text-slate-400 text-xs mt-1 max-w-md">Habilita el selector desplegable en la pantalla de inicio de sesión.</p>
                </div>
                </button>
              </div>

              <!-- Danger Zone: System Reset -->
              <div class="mt-8 border-t border-slate-800 pt-8">
                <div class="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
                  <div class="absolute -top-12 -right-12 w-32 h-32 bg-red-500/5 blur-[50px] rounded-full group-hover:bg-red-500/10 transition-all"></div>
                  <div class="flex items-center gap-4 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <i class="bi bi-trash3-fill text-xl"></i>
                    </div>
                    <div>
                        <h4 class="text-white text-sm font-black uppercase tracking-tight">Zona de Peligro</h4>
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Reinicio para Producción</p>
                    </div>
                  </div>
                  <p class="text-[11px] text-slate-400 leading-relaxed mb-6">Esta acción eliminará todos los envíos, puntos y usuarios registrados (excepto tu cuenta). **Esta operación no se puede deshacer.**</p>
                  <button @click="resetSystem" class="w-full bg-slate-950 text-red-500 border border-red-900/50 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-900 hover:text-white transition-all shadow-inner relative z-10">
                    Limpiar Base de Datos y Reiniciar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Wizard Component -->
    <ConfigWizard v-if="showWizard" @close="showWizard = false" @finish="handleWizardFinish" />

  </div>
</template>

<script>
const PB = 'http://127.0.0.1:8090';
export default {
  inject: ['appState', 'logout', 'showModal', 'getMapsUrl', 'saveDemoData', 'syncBusinessEvents', 'emitBusinessEvent'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', window.options)),
    ConfigWizard: Vue.defineAsyncComponent(() => loadModule('./components/ConfigWizard.vue', window.options)),
    AddressInput: Vue.defineAsyncComponent(() => loadModule('./components/AddressInput.vue', window.options))
  },
  data() {
    return {
      section: 'dashboard',
      demoMode: localStorage.getItem('ep_demo_mode') === 'true',
      showWizard: false,
      userCols: [
        { key: 'user', label: 'Usuario' },
        { key: 'role', label: 'Rol' },
        { key: 'status', label: 'Estado' }
      ],
      pointCols: [
        { key: 'name', label: 'Punto' },
        { key: 'address', label: 'Dirección' },
        { key: 'status', label: 'Estado' }
      ],
      shipmentCols: [
        { key: 'id', label: 'ID' },
        { key: 'dest', label: 'Destinatario' },
        { key: 'status', label: 'Estado' },
        { key: 'point', label: 'Punto' },
        { key: 'date', label: 'Fecha' }
      ],
      commCols: [
        { key: 'point', label: 'Punto' },
        { key: 'pd', label: 'Período' },
        { key: 'pkgs', label: 'Paquetes', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'status', label: 'Estado' }
      ],
      invCols: [
        { key: 'num', label: 'No.' },
        { key: 'cli', label: 'Cliente' },
        { key: 'pd', label: 'Period' },
        { key: 'tot', label: 'Total', align: 'right' },
        { key: 'st', label: 'Estado' }
      ],
      partnerCols: [
        { key: 'biz', label: 'Negocio' },
        { key: 'addr', label: 'Ubicación' },
        { key: 'st', label: 'Estado' }
      ],
      nav: [
        { id: 'dashboard',   icon: 'speedometer2',    label: 'Dashboard',      desc: 'KPIs y actividad en tiempo real' },
        { id: 'users',       icon: 'people',          label: 'Usuarios',       desc: 'Gestión de operadores y admins' },
        { id: 'points',      icon: 'shop',            label: 'Mis Puntos',     desc: 'Red de puntos activos' },
        { id: 'shipments',   icon: 'box-seam',        label: 'Envíos',         desc: 'Todos los envíos del sistema' },
        { id: 'commissions', icon: 'cash-coin',       label: 'Comisiones',     desc: 'Pago a operadores asociados' },
        { id: 'invoices',    icon: 'receipt',         label: 'Facturas',       desc: 'Facturación a clientes' },
        { id: 'partners',    icon: 'briefcase',       label: 'Solicitudes',    desc: 'Afiliaciones pendientes', badge: 0 },
      ],
      showUserMenu: false,
      // Data
      recentShipments: [], allShipments: [], shipFilter: '',
      users: [], points: [], commissions: [], invoices: [],
      pendingApps: [], allApps: [],
      // User form
      showUserForm: false, editingUser: null,
      userForm: { email: '', password: '', full_name: '', role: 'operator', point_ref: '' },
      showNewPwd: false,
      pwdStrength: 0,
      formMsg: '',
      // Invoice form
      showInvoiceForm: false,
      invoiceForm: { number: '', period: '', client_name: '', client_rfc: '', concept: '', qty: 0, unit_price: 0, notes: '' },
      // Settings
      testModeData: { id: null, enabled: false }
    }
  },
  computed: {
    kpis() {
      const pendingTotal = this.commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.total), 0);
      const activePoints = this.points.filter(p => p.status === 'active').length;
      return [
        { label: 'Envíos en Tránsito', value: this.allShipments.filter(s => s.status === 'in_transit').length, trend: 12, icon: 'truck' },
        { label: 'Puntos Activos', value: activePoints, trend: 5, icon: 'shop' },
        { label: 'Usuarios Registrados', value: this.users.length, trend: 8, icon: 'people' },
        { label: 'Deuda Comisiones', value: '$' + pendingTotal.toLocaleString(), trend: -2, icon: 'cash' }
      ];
    },
    currentNav() { return this.nav.find(n => n.id === this.section); },
    filteredShipments() {
      if (!this.shipFilter) return this.allShipments;
      return this.allShipments.filter(s => s.status === this.shipFilter);
    },
    pendingTotal() { return this.commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.total), 0); },
    paidTotal()    { return this.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.total), 0); },
    pwdRules() {
      const p = this.userForm.password || '';
      return [
        { label: 'Al menos 8 caracteres',          ok: p.length >= 8 },
        { label: 'Una letra mayúscula (A-Z)',        ok: /[A-Z]/.test(p) },
        { label: 'Un número (0-9)',                  ok: /[0-9]/.test(p) },
        { label: 'Un carácter especial (!@#$...)',   ok: /[^A-Za-z0-9]/.test(p) },
      ];
    },
    pwdBarColor() {
      return ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-brand-500'][this.pwdStrength];
    },
    pwdStrengthLabel() {
      return [
        { text: '', color: '' },
        { text: 'Muy débil',  color: 'text-red-500' },
        { text: 'Débil',      color: 'text-amber-500' },
        { text: 'Buena',      color: 'text-yellow-400' },
        { text: '¡Fuerte!',   color: 'text-brand-400' },
      ][this.pwdStrength];
    },
    pwdAllRulesPass() { return this.pwdRules.every(r => r.ok); },
  },
  mounted() { this.loadAll(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    headers() { return { 'Content-Type': 'application/json', 'Authorization': this.token() }; },
    async get(path) { 
      if (this.appState.demoMode) {
        // Extract collection name from path e.g. /api/collections/points/records
        const parts = path.split('/');
        const collection = parts[3]; 
        return { items: this.appState.demoData[collection] || [] };
      }
      return (await fetch(PB + path, { headers: this.headers() })).json(); 
    },
    async post(path, body) {
      if (this.appState.demoMode) {
        const collection = path.split('/')[3];
        const newItem = { id: 'mock_' + Date.now(), ...body, created: new Date().toISOString(), updated: new Date().toISOString() };
        if (!this.appState.demoData[collection]) this.appState.demoData[collection] = [];
        this.appState.demoData[collection].unshift(newItem);
        this.saveDemoData({ ...this.appState.demoData });
        return newItem;
      }
      return fetch(PB + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) }).then(r => r.json());
    },
    async patch(path, body) {
      if (this.appState.demoMode) {
        const parts = path.split('/');
        const collection = parts[3];
        const id = parts[5];
        const idx = this.appState.demoData[collection]?.findIndex(i => i.id === id);
        if (idx !== -1) {
          this.appState.demoData[collection][idx] = { ...this.appState.demoData[collection][idx], ...body, updated: new Date().toISOString() };
          this.saveDemoData({ ...this.appState.demoData });
          return this.appState.demoData[collection][idx];
        }
      }
      return fetch(PB + path, { method: 'PATCH', headers: this.headers(), body: JSON.stringify(body) }).then(r => r.json());
    },

    async loadAll() {
      if (this.appState.demoMode) {
          const d = this.appState.demoData || {};
          this.allShipments = d.shipments || [];
          this.users = d.users || [];
          this.points = d.points || [];
          this.commissions = d.commissions || [];
          this.invoices = d.invoices || [];
          this.allApps = d.partner_applications || []; 
          this.pendingApps = this.allApps.filter(a => a.status === 'new');
          this.recentShipments = this.allShipments.slice(0, 8);
          
          const partnerNav = this.nav.find(n => n.id === 'partners');
          if (partnerNav) partnerNav.badge = this.pendingApps.length || null;
          this.syncBusinessEvents({
            shipments: this.allShipments,
            users: this.users,
            points: this.points,
            commissions: this.commissions,
            partner_applications: this.allApps
          });
          return;
      }

      const [s, u, p, c, i, apps, sys] = await Promise.all([
        this.get('/api/collections/shipments/records?sort=-created&perPage=50&expand=point_id'),
        this.get('/api/collections/users/records?perPage=100'),
        this.get('/api/collections/points/records?perPage=100'),
        this.get('/api/collections/commissions/records?sort=-period&perPage=100'),
        this.get('/api/collections/invoices/records?sort=-created&perPage=100'),
        this.get('/api/collections/partner_applications/records?sort=-created&perPage=100'),
        this.get('/api/collections/system_settings/records')
      ]);
      this.allShipments  = s.items || [];
      this.recentShipments = this.allShipments.slice(0, 8);
      this.users         = u.items || [];
      this.points        = p.items || [];
      this.commissions   = c.items || [];
      this.invoices      = i.items || [];
      this.allApps       = apps.items || [];
      this.pendingApps   = this.allApps.filter(a => a.status === 'new');
      if (sys.items?.[0]) {
        this.testModeData = { id: sys.items[0].id, enabled: sys.items[0].test_mode };
      }
      // Update badge
      const partnerNav = this.nav.find(n => n.id === 'partners');
      if (partnerNav) partnerNav.badge = this.pendingApps.length || null;
      this.syncBusinessEvents({
        shipments: this.allShipments,
        users: this.users,
        points: this.points,
        commissions: this.commissions,
        partner_applications: this.allApps
      });
    },

    // Status helpers
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; },
    formatStatus(s) { return { pending:'Pendiente', in_transit:'En tránsito', at_point:'En punto', delivered:'Entregado' }[s] || s; },
    statusColor(s) { return { pending:'bg-slate-700 text-slate-400', in_transit:'bg-blue-900/50 text-blue-400', at_point:'bg-brand-500/20 text-brand-400', delivered:'bg-green-900/50 text-green-400' }[s] || 'bg-slate-700 text-slate-400'; },
    statusIcon(s) { return { pending:'clock-history', in_transit:'truck', at_point:'building-check', delivered:'check-circle-fill' }[s] || 'box'; },
    statusBadge(s) { return { pending:'bg-slate-700/50 text-slate-400', in_transit:'bg-blue-900/50 text-blue-400', at_point:'bg-brand-500/10 text-brand-400', delivered:'bg-green-900/50 text-green-400' }[s] || ''; },
    invStatusLabel(s) { return { draft:'Borrador', sent:'Enviada', paid:'Pagada' }[s] || s; },
    roleLabel(role) {
      return {
        operator: 'Local',
        driver: 'Repartidor',
        sales: 'Ventas',
        admin: 'Administrador'
      }[role] || role || 'Local';
    },
    roleBadgeClass(role) {
      return {
        admin: 'bg-purple-500/10 text-purple-400',
        sales: 'bg-blue-500/10 text-blue-400',
        driver: 'bg-amber-500/10 text-amber-400',
        operator: 'bg-brand-500/10 text-brand-400'
      }[role] || 'bg-slate-800 text-slate-400';
    },

    // Users
    editUser(u) { this.editingUser = u; this.userForm = { ...u, password: '' }; this.showUserForm = true; this.formMsg = ''; this.pwdStrength = 0; },
    checkStrength() {
      const p = this.userForm.password || '';
      this.pwdStrength = this.pwdRules.filter(r => r.ok).length;
    },
    async saveUser() {
      this.formMsg = '';
      try {
        if (this.editingUser) {
          await this.patch(`/api/collections/users/records/${this.editingUser.id}`, { full_name: this.userForm.full_name, role: this.userForm.role });
        } else {
          if (!this.pwdAllRulesPass) { this.formMsg = 'La contraseña no cumple con los requisitos de seguridad.'; return; }
          const r = await this.post('/api/collections/users/records', {
            email: this.userForm.email,
            password: this.userForm.password,
            passwordConfirm: this.userForm.password,
            full_name: this.userForm.full_name,
            role: this.userForm.role,
            verified: true, emailVisibility: true
          });
          if (r.code) { this.formMsg = r.message; return; }
          this.emitBusinessEvent({
            audience: ['admin', this.userForm.role],
            severity: 'success',
            icon: 'person-plus-fill',
            title: 'Nuevo usuario activado',
            message: `${this.userForm.full_name || this.userForm.email} ya tiene acceso listo en Easypoint.`
          });
        }
        this.showUserForm = false;
        await this.loadAll();
      } catch(e) { this.formMsg = e.message; }
    },
    async approveUser(u) {
      const ok = await this.showModal({ title: 'Aprobar Usuario', message: `Deseas activar el acceso para ${u.full_name || u.email}?`, type: 'confirm' });
      if (!ok) return;
      await this.patch(`/api/collections/users/records/${u.id}`, { verified: true });
      this.emitBusinessEvent({
        audience: ['admin', u.role || 'operator'],
        severity: 'success',
        icon: 'patch-check-fill',
        title: 'Acceso aprobado',
        message: `${u.full_name || u.email} ya puede entrar y operar su panel.`
      });
      await this.loadAll();
    },
    async deleteUser(u) {
      const ok = await this.showModal({ title: 'Confirmar Eliminación', message: `¿Estás seguro de eliminar a ${u.full_name}?`, type: 'confirm' });
      if(!ok) return;
      await fetch(PB + `/api/collections/users/records/${u.id}`, { method: 'DELETE', headers: this.headers() });
      await this.loadAll();
    },

    // Points
    editPoint(p) { this.editingPoint = p; this.pointForm = { ...p }; this.showPointForm = true; },
    async savePoint() {
       try {
          if (this.editingPoint) {
             await this.patch(`/api/collections/points/records/${this.editingPoint.id}`, this.pointForm);
          } else {
             await this.post('/api/collections/points/records', this.pointForm);
          }
          this.showPointForm = false;
          await this.loadAll();
          this.showModal({ title: 'Éxito', message: 'Punto guardado correctamente.', type: 'success' });
       } catch (e) {
          this.showModal({ title: 'Error', message: 'No se pudo guardar el punto.', type: 'error' });
       }
    },
    async deletePoint(p) {
       const ok = await this.showModal({ title: 'Eliminar Punto', message: `¿Confirmas eliminar el punto ${p.name}?`, type: 'confirm' });
       if(!ok) return;
       await fetch(PB + `/api/collections/points/records/${p.id}`, { method: 'DELETE', headers: this.headers() });
       await this.loadAll();
    },
    
    async resetSystem() {
       const confirm1 = await this.showModal({
          title: '¿Reiniciar Sistema?',
          message: 'Se eliminarán todos los datos (envíos, puntos, socios y usuarios). ¿Deseas continuar con el proceso de limpieza?',
          type: 'confirm',
          confirmText: 'Siguiente'
       });
       if (!confirm1) return;

       const confirm2 = await this.showModal({
          title: 'Confirmación Final',
          message: 'Para confirmar, escribe la palabra RESET en mayúsculas:',
          type: 'input',
          placeholder: 'Escribe RESET aquí',
          confirmText: 'BORRAR TODO'
       });
       
       if (confirm2 !== 'RESET') {
          if (confirm2 !== null) this.showModal({ title: 'Error', message: 'La confirmación no coincide.', type: 'error' });
          return;
       }

       this.showLoading('Limpiando base de datos...');
       try {
          // 1. Wipe Shipments
          for (const s of this.shipments) {
             await fetch(`${PB}/api/collections/shipments/records/${s.id}`, { method: 'DELETE', headers: this.headers() });
          }
          // 2. Wipe Points
          for (const p of this.points) {
             await fetch(`${PB}/api/collections/points/records/${p.id}`, { method: 'DELETE', headers: this.headers() });
          }
          // 3. Wipe Users (Except current)
          for (const u of this.users) {
             if (u.id === this.appState.user.id) continue;
             await fetch(`${PB}/api/collections/users/records/${u.id}`, { method: 'DELETE', headers: this.headers() });
          }
          
          await this.loadAll();
          this.showModal({ title: 'Sistema Limpio', message: 'La base de datos ha sido purgada. Ahora puedes configurar la red de producción.', type: 'success' });
       } catch (e) {
          this.showModal({ title: 'Error Fatal', message: 'No se pudieron borrar todos los datos: ' + e.message, type: 'error' });
       } finally {
          this.hideLoading();
       }
    },
    
    showLoading(msg) { 
      this.appState.loading = true; 
      this.appState.loadingMsg = msg || 'Cargando...';
    },
    hideLoading() { 
      this.appState.loading = false; 
    },
    async approveApp(app) {
      // Create point from application
      await this.post('/api/collections/points/records', {
        name: app.business_name, address: app.address,
        whatsapp: app.whatsapp, maps_url: app.maps_url,
        description: app.description, horarios: app.horarios
      });
      await this.patch(`/api/collections/partner_applications/records/${app.id}`, { status: 'approved' });
      this.emitBusinessEvent({
        audience: ['admin', 'sales'],
        severity: 'success',
        icon: 'shop',
        title: 'Afiliacion aprobada',
        message: `${app.business_name} ya puede pasar a onboarding operativo.`
      });
      await this.loadAll();
      this.section = 'points';
    },
    async rejectApp(app) {
      await this.patch(`/api/collections/partner_applications/records/${app.id}`, { status: 'rejected' });
      this.emitBusinessEvent({
        audience: ['admin', 'sales'],
        severity: 'warning',
        icon: 'x-octagon-fill',
        title: 'Solicitud rechazada',
        message: `${app.business_name} fue descartado del pipeline comercial.`
      });
      await this.loadAll();
    },

    // Commissions
    async markPaid(c) {
      await this.patch(`/api/collections/commissions/records/${c.id}`, { status: 'paid' });
      this.emitBusinessEvent({
        audience: ['admin', 'operator'],
        severity: 'success',
        icon: 'cash-coin',
        title: 'Comision liquidada',
        message: `${c.point || c.point_name || 'Un local'} ya tiene su pago marcado como liquidado.`
      });
      await this.loadAll();
    },

    // Invoices
    resetInvoiceForm() { this.invoiceForm = { number: '', period: '', client_name: '', client_rfc: '', concept: '', qty: 0, unit_price: 0, notes: '' }; },
    async createInvoice() {
      const { number, period, client_name, client_rfc, concept, qty, unit_price, notes } = this.invoiceForm;
      const subtotal = qty * unit_price;
      const tax = Math.round(subtotal * 0.16);
      const total = subtotal + tax;
      await this.post('/api/collections/invoices/records', {
        number, period, client_name, client_rfc, notes,
        items: [{ concept, qty, unit_price, total: subtotal }],
        subtotal, tax, total, status: 'draft'
      });
      this.showInvoiceForm = false;
      await this.loadAll();
    },
    async updateInvoiceStatus(inv, newStatus) {
      await this.patch(`/api/collections/invoices/records/${inv.id}`, { status: newStatus });
      await this.loadAll();
    },
    printInvoice(inv) {
      const win = window.open('', '_blank');
      const items = (inv.items || []).map(i =>
        `<tr><td>${i.concept}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">$${Number(i.unit_price).toLocaleString('es-MX')}</td><td style="text-align:right">$${Number(i.total).toLocaleString('es-MX')}</td></tr>`
      ).join('');
      win.document.write(`<!DOCTYPE html><html><head><title>Factura ${inv.number}</title>
        <style>body{font-family:sans-serif;max-width:700px;margin:40px auto;color:#111}
        h1{font-size:2rem;color:#111}table{width:100%;border-collapse:collapse;margin-top:20px}
        th{text-align:left;padding:8px;background:#f5f5f5;border:1px solid #ddd}
        td{padding:8px;border:1px solid #ddd}.total{font-size:1.2rem;font-weight:bold}
        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:bold;background:#dcfce7;color:#166534}</style>
        </head><body>
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:40px">
          <div><h1>Easypoint.mx</h1><p style="color:#666;margin:0">Logística Out-of-Home Premium</p></div>
          <div style="text-align:right"><h2 style="margin:0">${inv.number}</h2><span class="badge">${inv.status.toUpperCase()}</span></div>
        </div>
        <p><strong>Cliente:</strong> ${inv.client_name}<br><strong>RFC:</strong> ${inv.client_rfc}<br><strong>Período:</strong> ${inv.period}</p>
        <table><thead><tr><th>Concepto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${items}</tbody></table>
        <div style="text-align:right;margin-top:20px">
          <p>Subtotal: $${Number(inv.subtotal).toLocaleString('es-MX')}</p>
          <p>IVA (16%): $${Number(inv.tax).toLocaleString('es-MX')}</p>
          <p class="total">TOTAL: $${Number(inv.total).toLocaleString('es-MX')} MXN</p>
        </div>
        ${inv.notes ? `<p style="margin-top:30px;color:#666;font-size:0.9rem;border-top:1px solid #eee;padding-top:16px"><em>${inv.notes}</em></p>` : ''}
        <script>window.print()<\/script></body></html>`);
      win.document.close();
    },

    // Settings
    async toggleTestMode() {
      if (!this.testModeData.id) return;
      const newState = !this.testModeData.enabled;
      // Optimistic UI update
      this.testModeData.enabled = newState;
      try {
        await this.patch(`/api/collections/system_settings/records/${this.testModeData.id}`, { test_mode: newState });
      } catch (e) {
        // Revert on error
        this.testModeData.enabled = !newState;
        alert('Error al guardar la configuración');
      }
    },

    toggleDemo() {
      this.demoMode = !this.demoMode;
      localStorage.setItem('ep_demo_mode', this.demoMode);
      this.loadAll();
    },

    async handleWizardFinish(form) {
      // Step 3 & 4 data creation in PocketBase
      try {
        // Create operator
        await this.post('/api/collections/users/records', {
          email: form.userEmail, password: form.userPass, passwordConfirm: form.userPass,
          full_name: 'Punto ' + form.pointName, role: 'operator', verified: true, emailVisibility: true
        });
        // Create point
        await this.post('/api/collections/points/records', {
          name: form.pointName, address: form.pointAddress, status: 'active'
        });
        await this.loadAll();
      } catch (e) {
        console.error('Wizard automation error:', e);
      }
    }
  }
}
</script>

<style>
.label-sm { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.375rem; }
.input-dark { width: 100%; background: rgba(30,41,59,0.8); border: 1px solid #334155; color: #fff; border-radius: 0.75rem; padding: 0.75rem 1rem; outline: none; font-size: 0.875rem; }
.input-dark::placeholder { color: #475569; }
.input-dark:focus { box-shadow: 0 0 0 2px rgba(132,204,22,0.5); }
</style>
