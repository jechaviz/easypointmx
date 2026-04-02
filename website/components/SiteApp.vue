<template>
  <div class="min-h-screen flex flex-col font-sans">
    
    <!-- Navbar -->
    <header 
      class="fixed top-0 w-full z-50 transition-all duration-300"
      :class="isScrolled ? 'bg-slate-900/90 backdrop-blur-lg shadow-sm py-3' : 'bg-transparent py-4'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          
          <!-- Logo -->
          <a href="#" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <i class="bi bi-box-seam text-slate-900 text-xl"></i>
            </div>
            <span class="font-bold text-2xl tracking-tight text-white">Easy<span class="text-brand-400">point</span></span>
          </a>

          <!-- Desktop Nav -->
          <nav class="hidden lg:flex items-center gap-7">
            <a href="/easypoint/website/" @click.prevent="navigate('/')" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Inicio</a>
            <button @click="openModal('map')" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Mapa</button>
            <a href="/easypoint/website/locales" @click.prevent="navigate('/locales')" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Para Locales</a>
            <a href="/easypoint/website/ecommerce" @click.prevent="navigate('/ecommerce')" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Para E-commerce</a>
            <a href="/easypoint/website/developers" @click.prevent="navigate('/developers')" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Developers</a>
            <!-- Divider -->
            <div class="h-5 w-px bg-slate-700"></div>
            <a href="/easypoint/app/" class="text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors">Acceder <i class="bi bi-box-arrow-in-right ml-1"></i></a>
            <a href="/easypoint/website/ecommerce" @click.prevent="navigate('/ecommerce')" class="bg-brand-500 text-slate-900 hover:bg-brand-400 px-6 py-2.5 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-brand-500/20 hover:-translate-y-0.5">Ser Partner</a>
          </nav>

          <!-- Mobile Nav Toggle -->
          <button class="md:hidden text-white text-2xl">
            <i class="bi bi-list"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow">
      <component :is="currentViewComponent" @open-modal="openModal" @navigate="navigate" />
    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
            <div class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <i class="bi bi-box-seam text-slate-900"></i>
            </div>
            <span class="font-bold text-xl text-white tracking-tight">Easypoint</span>
          </div>
          
          <div class="flex flex-wrap gap-4 md:gap-6 text-sm font-medium">
            <a href="/easypoint/website/condiciones" @click.prevent="navigate('/condiciones')" class="hover:text-white transition-colors">Términos y Condiciones</a>
            <a href="/easypoint/website/privacidad" @click.prevent="navigate('/privacidad')" class="hover:text-white transition-colors">Política de Privacidad</a>
            <a href="/easypoint/website/developers" @click.prevent="navigate('/developers')" class="hover:text-white transition-colors">Developer Portal</a>
          </div>
          
          <div class="text-sm">
            &copy; 2026 Easypoint. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>

    <!-- Global Modals Wrapper -->
    <div v-if="activeModal" class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 transition-all duration-500 overflow-hidden">
       <!-- Backdrop -->
       <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-md cursor-pointer" @click="closeModal"></div>
       
       <!-- MAP EXPLORER MODAL -->
       <div v-if="activeModal === 'map'" class="relative bg-slate-50 w-full h-full md:max-w-7xl md:h-[85vh] md:rounded-[2.5rem] shadow-2xl animate-fade-in-up flex flex-col overflow-hidden border border-white/10">
          <div class="p-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 text-xl shadow-lg shadow-brand-500/20"><i class="bi bi-geo-alt-fill"></i></div>
                <div>
                   <h2 class="text-2xl font-black text-slate-900 tracking-tight">Red de Puntos Easypoint</h2>
                   <p class="text-slate-500 font-medium text-xs uppercase tracking-widest">Encuentra tu centro de recolección</p>
                </div>
             </div>
             <button @click="closeModal" class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
               <i class="bi bi-x-lg"></i>
             </button>
          </div>

          <div class="flex-grow flex flex-col md:flex-row overflow-hidden">
             <!-- Sidebar Points List -->
             <div class="w-full md:w-[350px] bg-white border-r border-slate-200 flex flex-col">
                 <div class="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <div v-for="point in pointsList" :key="point.id" @click="centerOnPoint(point)" class="p-4 rounded-2xl border border-slate-50 hover:border-brand-500 cursor-pointer transition-all hover:bg-slate-50 group" :class="activePointId === point.id ? 'bg-slate-50 border-brand-500 shadow-lg' : ''">
                        <h4 class="font-black text-slate-900 text-sm mb-1 uppercase">{{ point.name }}</h4>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ point.address }}</p>
                    </div>
                 </div>
             </div>
             <!-- Map Container -->
             <div class="flex-grow relative bg-slate-100">
                <div id="leaflet-map" class="w-full h-full z-10"></div>
                <!-- Mini Legend -->
                <div class="absolute bottom-6 left-6 z-20 glass-panel-dark px-4 py-2 rounded-xl flex gap-4 text-[10px] font-black uppercase text-white tracking-[0.2em] border border-white/10">
                    <span class="flex items-center gap-2"><i class="bi bi-circle-fill text-brand-500 text-[6px]"></i> Puntos Activos</span>
                </div>
             </div>
          </div>
       </div>

       <!-- B2B CONTACT MODAL -->
       <div v-if="activeModal === 'b2b'" class="relative bg-slate-900 text-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-fade-in-up border border-slate-800">
          <button @click="closeModal" class="absolute top-8 right-8 w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all hover:rotate-90">
            <i class="bi bi-x-lg"></i>
          </button>
          
          <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-8 text-3xl shadow-xl shadow-blue-600/20"><i class="bi bi-person-badge"></i></div>
          <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Ventas B2B</h2>
          <p class="text-slate-400 mb-8 font-medium">Integra tu E-commerce a la red Easypoint.</p>
          
          <form v-if="!formSuccess" @submit.prevent="submitB2BApp" class="space-y-4">
             <div class="grid md:grid-cols-2 gap-4">
                <div>
                   <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Empresa</label>
                   <input v-model="form.business_name" required type="text" placeholder="Ej. Mi Tienda" class="w-full bg-slate-800 border-none ring-1 ring-slate-700 rounded-xl px-4 py-3 focus:ring-blue-500 text-white transition-all">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sitio Web</label>
                   <input v-model="form.website" required type="url" placeholder="https://..." class="w-full bg-slate-800 border-none ring-1 ring-slate-700 rounded-xl px-4 py-3 focus:ring-blue-500 text-white transition-all">
                </div>
             </div>
             <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Corporativo</label>
                <input v-model="form.email" required type="email" placeholder="ventas@empresa.com" class="w-full bg-slate-800 border-none ring-1 ring-slate-700 rounded-xl px-4 py-3 focus:ring-blue-500 text-white transition-all">
             </div>
             <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Volumen Proyectado</label>
                <select v-model="form.volume" class="w-full bg-slate-800 border-none ring-1 ring-slate-700 rounded-xl px-4 py-3 focus:ring-blue-500 text-white transition-all appearance-none cursor-pointer">
                   <option value="1-100">1 - 100 paquetes/mes</option>
                   <option value="100-500">100 - 500 paquetes/mes</option>
                   <option value="500+">Más de 500 paquetes/mes</option>
                </select>
             </div>
             <button :disabled="isSubmitting" class="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50">
                <i v-if="isSubmitting" class="bi bi-arrow-repeat animate-spin"></i>
                {{ isSubmitting ? 'Enviando...' : 'Solicitar Propuesta' }}
             </button>
          </form>
          
          <div v-else class="text-center py-10 animate-fade-in-up">
             <div class="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i class="bi bi-check-lg"></i></div>
             <h3 class="text-2xl font-black text-white mb-3 tracking-tight">¡Solicitud Enviada!</h3>
             <p class="text-slate-400 font-medium">Un ejecutivo B2B te contactará pronto.</p>
             <button @click="closeModal" class="mt-8 bg-slate-800 text-white font-black px-8 py-3 rounded-xl hover:bg-slate-700">Cerrar</button>
          </div>
       </div>

       <!-- PARTNER MODAL -->
       <div v-if="activeModal === 'partner'" class="relative bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-fade-in-up">
          <button @click="closeModal" class="absolute top-8 right-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
            <i class="bi bi-x-lg"></i>
          </button>
          <div class="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-slate-900 mb-8 text-3xl shadow-xl shadow-brand-500/20"><i class="bi bi-shop"></i></div>
          <h2 class="text-3xl font-black text-slate-900 mb-2 tracking-tight">Afíliate como Punto</h2>
          <p class="text-slate-600 mb-8 font-medium">Únete a la red OOH líder en México.</p>
          
          <form v-if="!formSuccess" @submit.prevent="submitPartnerApp" class="space-y-4">
              <div>
                 <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Negocio</label>
                 <input v-model="form.business_name" required type="text" placeholder="Mi Local" class="w-full bg-slate-50 border-none ring-1 ring-slate-100 rounded-xl px-4 py-3 focus:ring-brand-500 transition-all">
              </div>
              <div class="relative">
                 <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dirección del Local</label>
                 <input
                   v-model="addrQuery"
                   @input="debounceAddr"
                   @blur="onBlurAddr"
                   type="text"
                   placeholder="Ej: Insurgentes Sur 400, Roma, CDMX"
                   class="w-full bg-slate-50 border-none ring-1 ring-slate-100 rounded-xl px-4 py-3 focus:ring-brand-500 transition-all"
                 >
                 <div v-if="addrSuggestions.length" class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                   <button
                     v-for="s in addrSuggestions" :key="s.place_id"
                     type="button"
                     @click="pickAddr(s)"
                     class="w-full text-left px-4 py-3 hover:bg-amber-50 text-xs font-medium text-slate-700 border-b border-slate-50 last:border-0"
                   >{{ s.display_name }}</button>
                 </div>
              </div>
              <div>
                 <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp</label>
                 <input v-model="form.whatsapp" required type="tel" placeholder="52..." class="w-full bg-slate-50 border-none ring-1 ring-slate-100 rounded-xl px-4 py-3 focus:ring-brand-500 transition-all">
              </div>
              <div>
                 <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Horario de Atención</label>
                 <input v-model="form.horarios" type="text" placeholder="Ej: Lun-Sab 9:00-20:00" class="w-full bg-slate-50 border-none ring-1 ring-slate-100 rounded-xl px-4 py-3 focus:ring-brand-500 transition-all">
              </div>
              <button :disabled="isSubmitting" class="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-brand-500 hover:text-slate-900 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50">
                 {{ isSubmitting ? 'Procesando...' : 'Enviar Solicitud' }}
              </button>
           </form>
          
          <div v-else class="text-center py-10">
             <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i class="bi bi-check-lg"></i></div>
             <h3 class="text-2xl font-black text-slate-900 mb-3 tracking-tight">¡Recibido!</h3>
             <button @click="closeModal" class="mt-8 bg-slate-100 text-slate-900 font-black px-8 py-3 rounded-xl">Entendido</button>
          </div>
       </div>
    </div>

  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];

const options = {
    moduleCache: { vue: Vue },
    async getFile(url) {
        const res = await fetch(url);
        if (!res.ok) throw Object.assign(new Error(res.statusText + ' ' + url), { res });
        return { getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text() }
    },
    addStyle(textContent) {
        const style = Object.assign(document.createElement('style'), { textContent });
        document.head.appendChild(style);
    },
};

export default {
  components: {
    HomeView: Vue.defineAsyncComponent(() => loadModule('./components/HomeView.vue', options)),
    AtraeView: Vue.defineAsyncComponent(() => loadModule('./components/AtraeView.vue', options)),
    CondicionesView: Vue.defineAsyncComponent(() => loadModule('./components/CondicionesView.vue', options)),
    EnviaView: Vue.defineAsyncComponent(() => loadModule('./components/EnviaView.vue', options)),
    PrivacidadView: Vue.defineAsyncComponent(() => loadModule('./components/PrivacidadView.vue', options)),
    DeveloperView: Vue.defineAsyncComponent(() => loadModule('./components/DeveloperView.vue', options))
  },
  data() {
    return {
      currentRoute: window.location.pathname.replace('/easypoint/website', '').replace(/\/$/, '') || '/',
      isScrolled: false,
      activeModal: null,
      activePointId: null,
      isSubmitting: false,
      formSuccess: false,
      formError: '',
      form: { 
        business_name: '', 
        whatsapp: '', 
        email: '',
        website: '',
        volume: '1-100',
        address: '', 
        maps_url: '', 
        horarios: '', 
        description: '' 
      },
      addrQuery: '',
      addrSuggestions: [],
      addrTimer: null,
      pointsList: [],
      isLoadingPoints: false
    }
  },
  computed: {
    currentViewComponent() {
      const routes = {
        '/': 'HomeView',
        '/locales': 'AtraeView',
        '/condiciones': 'CondicionesView',
        '/ecommerce': 'EnviaView',
        '/privacidad': 'PrivacidadView',
        '/developers': 'DeveloperView'
      };
      return routes[this.currentRoute] || 'HomeView';
    }
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('popstate', this.handlePopState);
    this.handleScroll();
  },
  unmounted() {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('popstate', this.handlePopState);
  },
  methods: {
    handlePopState() {
      this.currentRoute = window.location.pathname.replace('/easypoint/website', '').replace(/\/$/, '') || '/';
    },
    navigate(path) {
      if (this.currentRoute !== path) {
        this.currentRoute = path;
        window.history.pushState(null, '', '/easypoint/website' + (path === '/' ? '' : path));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    handleScroll() {
      this.isScrolled = window.scrollY > 20;
    },
    openModal(type) {
      this.activeModal = type;
      if (type === 'map') {
        this.fetchPoints().then(() => {
          this.initMap();
        });
      }
    },
    closeModal() {
      this.activeModal = null;
      if (this.map) {
         this.map.remove();
         this.map = null;
      }
      setTimeout(() => {
         this.formSuccess = false;
         this.formError = '';
         this.addrQuery = '';
           this.addrSuggestions = [];
           this.form = { business_name: '', whatsapp: '', email: '', website: '', volume: '1-100', address: '', horarios: '' };
      }, 300);
    },
    async fetchPoints() {
      this.isLoadingPoints = true;
      try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/points/records');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        this.pointsList = data.items || [];
      } catch(e) {
        console.error('Error fetching points:', e);
      } finally {
        this.isLoadingPoints = false;
      }
    },
    initMap() {
      this.$nextTick(() => {
        if (!window.L) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => this.renderMap();
          document.head.appendChild(script);
        } else {
          this.renderMap();
        }
      });
    },
    renderMap() {
      if (this.map || !document.getElementById('leaflet-map')) return;
      const center = [19.4326, -99.1332];
      this.map = L.map('leaflet-map', { zoomControl: false }).setView(center, 12);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.map);

      L.control.zoom({ position: 'bottomright' }).addTo(this.map);

      this.markers = {};
      this.pointsList.forEach(p => {
        if (p.lat && p.lng) {
          const popupHtml = `
            <div class="p-2 min-w-[180px]">
                <h5 class="font-black text-slate-900 mb-1">${p.name}</h5>
                <p class="text-[10px] text-slate-500 mb-3">${p.address}</p>
                <div class="flex gap-2">
                    ${p.whatsapp ? `<a href="https://wa.me/${p.whatsapp}" target="_blank" class="flex-grow bg-green-500 text-white text-[9px] font-black py-1.5 rounded-md flex items-center justify-center gap-1"><i class="bi bi-whatsapp"></i> Chat</a>` : ''}
                </div>
            </div>
          `;
          const marker = L.marker([p.lat, p.lng]).addTo(this.map).bindPopup(popupHtml, { closeButton: false });
          this.markers[p.id] = marker;
        }
      });
    },
    centerOnPoint(p) {
      this.activePointId = p.id;
      if (this.map && p.lat && p.lng) {
        this.map.setView([p.lat, p.lng], 16);
        if (this.markers[p.id]) this.markers[p.id].openPopup();
      }
    },
    onBlurAddr() { setTimeout(() => { this.addrSuggestions = []; }, 200); },
    debounceAddr() {
      clearTimeout(this.addrTimer);
      if (this.addrQuery.length < 4) { this.addrSuggestions = []; return; }
      this.addrTimer = setTimeout(async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=mx&q=${encodeURIComponent(this.addrQuery)}`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
          this.addrSuggestions = await res.json();
        } catch(_) {}
      }, 400);
    },
    pickAddr(s) {
      this.form.address = s.display_name;
      this.form.maps_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.display_name)}`;
      this.addrQuery = s.display_name;
      this.addrSuggestions = [];
    },
    async submitPartnerApp() {
      this.isSubmitting = true;
      try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/partner_applications/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.form, status: 'new' })
        });
        if (!res.ok) throw new Error('API Error');
        this.formSuccess = true;
      } catch(e) {
        this.formError = 'Error al enviar.';
      } finally {
        this.isSubmitting = false;
      }
    },
    async submitB2BApp() {
      this.isSubmitting = true;
      try {
        await new Promise(r => setTimeout(r, 1000));
        this.formSuccess = true;
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
</script>

<style>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }

.glass-panel-dark {
    background: rgba(15, 23, 42, 0.82);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
</style>
