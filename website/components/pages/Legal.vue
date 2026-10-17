<template>
  <div class="container section" style="max-width:780px">
    <div class="stack" style="--gap:10px"><span class="kicker">Legal</span><h1 class="h2">{{ doc.t }}</h1><p class="small muted">Última actualización: {{ doc.u }}</p></div>
    <nav class="row wrap mt-2" style="gap:8px" aria-label="Documentos"><a v-for="(d, k) in docs" :key="k" :href="EP.href('/legal/' + k)" class="chip" :class="{ on: k === key }">{{ d.t }}</a></nav>
    <article class="stack mt-3 doc" style="--gap:14px"><template v-for="(s, i) in doc.s" :key="i"><h2 class="h3">{{ s[0] }}</h2><p>{{ s[1] }}</p></template></article>
  </div>
</template>
<script>
const D = {
  condiciones: { t: 'Condiciones del servicio', u: '17 de octubre de 2026', s: [
    ['1. Qué es Easypoint', 'Easypoint opera una red de puntos afiliados donde puedes recibir y enviar paquetes, pagar servicios y reservar excursiones de proveedores independientes. Easypoint cobra, custodia y orquesta los pagos; la experiencia final la presta el proveedor.'],
    ['2. Reservas y apartado', 'Una reserva se confirma con tu primer abono. El apartado lo define cada proveedor. El saldo debe liquidarse antes de la fecha límite indicada en tu voucher; de lo contrario tu lugar se libera.'],
    ['3. Sin reembolsos en efectivo', 'Lo abonado y no aplicado a una experiencia realizada se convierte en crédito Easypoint, vigente 12 meses, utilizable en cualquier excursión o servicio. La opción Easypoint Protege permite reembolso parcial a tu forma de pago original al cancelar con 7 o más días de anticipación.'],
    ['4. Cambios y cancelaciones', 'Puedes cambiar la fecha desde tu voucher hasta 3 días antes. El primer cambio es gratuito; los siguientes pueden tener costo salvo con Easypoint Protege o Club.'],
    ['5. Salidas canceladas', 'Si el proveedor cancela, convertimos tu pago en crédito y añadimos un bono. Si la causa es clima o cupo mínimo, el crédito es por el monto completo abonado.'],
    ['6. Responsabilidad', 'Easypoint responde por el correcto manejo de tu dinero y tu información. El proveedor responde por la ejecución de la experiencia conforme a su descripción y a las leyes aplicables.'],
    ['7. Contacto y quejas', 'Cualquier queja puede enviarse por la sección Ayuda; la atendemos en privado y con tiempos de respuesta definidos.']] },
  privacidad: { t: 'Aviso de privacidad', u: '17 de octubre de 2026', s: [
    ['Responsable', 'Easypoint es responsable del tratamiento de tus datos personales.'],
    ['Datos que recabamos', 'Nombre, teléfono, correo, datos de tu reserva o paquete y atribución de campañas. No guardamos números de tarjeta: los pagos con tarjeta los procesa la pasarela.'],
    ['Para qué los usamos', 'Gestionar reservas, pagos, envíos y rastreo; enviarte avisos de tu trámite (por WhatsApp o correo, según tu elección); atender tus quejas; y mejorar el servicio.'],
    ['Comunicaciones comerciales', 'Sólo te enviamos promociones si lo permites. Puedes pedir la baja en cualquier momento escribiéndonos.'],
    ['Tus derechos', 'Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos (derechos ARCO) a través de la sección Ayuda.'],
    ['Con quién los compartimos', 'Con el proveedor de tu experiencia (lo necesario para tu salida), con la paquetería para tu envío y con las pasarelas de pago. No vendemos tus datos.']] },
  credito: { t: 'Política de crédito Easypoint', u: '17 de octubre de 2026', s: [
    ['Qué es el crédito', 'Es saldo a tu favor en tu monedero Easypoint, ligado a tu teléfono. Se genera cuando un abono no se aplica a una experiencia realizada: pago incompleto a la fecha límite, cancelación tuya o salida cancelada.'],
    ['Cómo se usa', 'Se aplica automáticamente a tu siguiente reserva hecha con el mismo teléfono, o puedes pedir que se aplique en un punto Easypoint.'],
    ['Vigencia', 'El crédito vence 12 meses después de generarse. Te avisamos 30 días antes. El crédito vencido no es reembolsable.'],
    ['Bonos', 'Algunos créditos (referidos, cashback del Club, bonos por salida cancelada) también vencen a los 12 meses y se usan igual.'],
    ['Reembolsos', 'Easypoint no reembolsa en efectivo. La opción Easypoint Protege permite reembolso parcial al cancelar con 7 o más días de anticipación.']] }
};
export default {
  data() { return { EP, docs: D }; },
  computed: { key() { return EP.view.params.doc in D ? EP.view.params.doc : 'condiciones'; }, doc() { return D[this.key]; } }
};
</script>
<style scoped>.doc p { color: var(--ink-2); }</style>
