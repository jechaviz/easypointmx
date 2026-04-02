<template>
  <div class="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
    <!-- Close Button -->
    <button @click="$emit('close')" class="absolute top-6 left-6 z-50 w-12 h-12 rounded-full bg-slate-800/80 backdrop-blur text-white flex items-center justify-center hover:bg-slate-700 transition-colors">
      <i class="bi bi-x-lg text-xl"></i>
    </button>

    <!-- Scan Header Info -->
    <div class="absolute top-6 right-6 z-50 px-4 py-2 rounded-full bg-slate-800/80 backdrop-blur text-white font-medium flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
      {{ mode === 'pickup' ? 'Recolección' : 'Drop-off' }}
    </div>

    <!-- Real Camera Feed Container -->
    <div class="relative w-full max-w-sm aspect-square mx-auto mb-8 bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center">
      <div id="reader" class="w-full h-full"></div>
      
      <!-- Processing Overlay -->
      <Transition name="fade">
        <div v-if="successPulse" class="absolute inset-0 bg-green-500/80 backdrop-blur-sm flex items-center justify-center z-20">
            <i class="bi bi-check-circle-fill text-6xl text-white drop-shadow-lg"></i>
        </div>
      </Transition>

      <div v-if="cameraError" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-800/90 backdrop-blur-md">
         <i class="bi bi-camera-video-off text-4xl text-slate-500 mb-3"></i>
         <p class="text-sm font-bold text-white mb-1">Cámara no disponible</p>
         <p class="text-xs text-slate-400">Verifica los permisos de tu navegador o usa el ingreso manual abajo.</p>
      </div>
    </div>

    <!-- Manual Entry Info -->
    <div class="text-slate-400 mb-6 text-center px-8">
      <h2 class="text-white text-2xl font-bold mb-2">Apunta al código</h2>
      <p>Centra el M-ID en el recuadro para escanear.</p>
    </div>

    <!-- Mock Controls for Demo -->
    <div class="w-full max-w-sm px-6">
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 isolate relative">
        <label class="text-xs text-slate-400 uppercase tracking-wide font-semibold block mb-2 ml-1">Simular Escaneo Manual</label>
        <div class="flex gap-2 relative z-10">
          <input 
            type="text" 
            v-model="manualCode" 
            placeholder="Ej. MXL001" 
            class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors uppercase font-mono text-lg"
            @keyup.enter="simulateScan"
          >
          <button 
            @click="simulateScan"
            class="bg-brand-500 text-slate-900 font-bold px-6 rounded-xl hover:bg-brand-400 transition-colors active:scale-95"
          >
            <i class="bi bi-upc-scan text-xl"></i>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  props: { mode: { type: String, required: true } },
  data() {
    return {
      manualCode: '',
      successPulse: false,
      cameraError: false,
      html5QrCode: null
    }
  },
  mounted() {
    if (!window.Html5Qrcode) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode';
      script.onload = () => { this.startScanner(); };
      document.head.appendChild(script);
    } else {
      this.startScanner();
    }
  },
  beforeUnmount() {
    this.stopScanner();
  },
  methods: {
    startScanner() {
      this.html5QrCode = new window.Html5Qrcode("reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      
      this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => { this.handleSuccess(decodedText); },
        (errorMessage) => { /* Ignore regular frame errors */ }
      ).catch((err) => {
        console.warn('Camera err:', err);
        this.cameraError = true;
      });
    },
    stopScanner() {
      if (this.html5QrCode && this.html5QrCode.isScanning) {
        this.html5QrCode.stop().then(() => {
          this.html5QrCode.clear();
        }).catch(err => console.error(err));
      }
    },
    handleSuccess(code) {
      if (this.successPulse) return; // Prevent double scans
      this.successPulse = true;
      if(navigator.vibrate) navigator.vibrate([100, 50, 100]); // Haptic
      
      this.stopScanner(); // Pause camera on success
      
      setTimeout(() => {
        this.$emit('scan', code);
        this.successPulse = false;
        this.manualCode = '';
      }, 700);
    },
    simulateScan() {
      if(!this.manualCode) return;
      this.handleSuccess(this.manualCode.toUpperCase());
    }
  }
}
</script>

<style>
/* Override default html5-qrcode styling to look clean */
#reader img { display: none !important; }
#reader__dashboard_section_csr { display: none !important; }
#reader video { 
  object-fit: cover; 
  border-radius: 1.5rem;
}
#qr-shaded-region {
  border-width: 40px !important;
}
</style>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
