/// <reference path="../pb_data/types.d.ts" />

// Red de microcentros de servicios: cada punto ofrece un CATÁLOGO de servicios
// (pagos, recargas, seguros, boletos, impresión, SIM, devoluciones, remesas,
// certificados, publicidad, marketplace, B2B, etc.), cada uno con su comisión.
// Las VENTAS (service_orders) fluyen al libro de cobranza como guías/abonos.
migrate((db) => {
  const dao = new Dao(db)

  // Catálogo de servicios (lectura pública para el sitio; escritura admin).
  const services = new Collection({
    "id": "services1234567",
    "name": "services",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "svname000", "name": "name", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "svcat0000", "name": "category", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["pagos", "recargas", "seguros", "boletos", "impresion", "sim", "devoluciones", "remesas", "certificados", "publicidad", "marketplace", "farmacia", "locker", "reciclaje", "productos_locales", "b2b", "otros"] } },
      { "id": "svdesc000", "name": "description", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "svctype00", "name": "commission_type", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["percent", "fixed"] } },
      { "id": "svcrate00", "name": "commission_rate", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "svcamt000", "name": "commission_amount", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "svunit000", "name": "unit", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "svprov000", "name": "provider_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "svicon000", "name": "icon", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "svactive0", "name": "active", "type": "bool", "required": false, "options": {} }
    ],
    "indexes": [],
    "listRule": "", "viewRule": "",
    "createRule": "@request.auth.role = 'admin'", "updateRule": "@request.auth.role = 'admin'", "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(services)

  // Ventas de servicios en el punto (staff registra; no público por la PII).
  const orders = new Collection({
    "id": "serviceorders12",
    "name": "service_orders",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "soref0000", "name": "service_ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "soname000", "name": "service_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "socat0000", "name": "category", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sopoint00", "name": "point_id", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sopointnm", "name": "point_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "socustnm0", "name": "customer_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "socustph0", "name": "customer_phone", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "soamount0", "name": "amount", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "socommiss", "name": "commission", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "sostatus0", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["new", "completed", "cancelled"] } },
      { "id": "sonotes00", "name": "notes", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(orders)

  // payments.kind: agregar 'service' para que las ventas fluyan a cobranza.
  const pay = dao.findCollectionByNameOrId("payments")
  pay.schema.removeField("pykind000")
  pay.schema.addField(new SchemaField({
    "system": false, "id": "pykind000", "name": "kind", "type": "select",
    "required": false, "options": { "maxSelect": 1, "values": ["excursion", "guide", "service"] }
  }))
  dao.saveCollection(pay)

  // Seed del catálogo (comisiones de demo, editables).
  const seed = [
    { name: 'Pago de servicios (CFE, Telmex, agua)', category: 'pagos', description: 'Cobro de recibos de luz, agua, teléfono e internet.', commission_type: 'percent', commission_rate: 3, unit: 'por cobro', icon: 'receipt' },
    { name: 'Recargas telefónicas', category: 'recargas', description: 'Tiempo aire de todas las compañías.', commission_type: 'percent', commission_rate: 5, unit: 'por recarga', icon: 'phone' },
    { name: 'Seguros económicos (moto, celular, mascota)', category: 'seguros', description: 'Pólizas rápidas de bajo costo.', commission_type: 'percent', commission_rate: 15, unit: 'por póliza', icon: 'shield-check' },
    { name: 'Boletos (autobús, eventos, turismo)', category: 'boletos', description: 'Venta de boletos y experiencias.', commission_type: 'percent', commission_rate: 8, unit: 'por boleto', icon: 'ticket-perforated' },
    { name: 'Impresión de etiquetas y documentos', category: 'impresion', description: 'Recibe archivos por WhatsApp, entrega al día siguiente.', commission_type: 'fixed', commission_amount: 5, unit: 'por trabajo', icon: 'printer' },
    { name: 'Venta de tarjetas SIM', category: 'sim', description: 'Distribución y activación de SIM.', commission_type: 'fixed', commission_amount: 30, unit: 'por activación', icon: 'sim' },
    { name: 'Devoluciones de e-commerce', category: 'devoluciones', description: 'Recepción de devoluciones para recolección diaria.', commission_type: 'fixed', commission_amount: 10, unit: 'por paquete', icon: 'arrow-return-left' },
    { name: 'Pago de remesas', category: 'remesas', description: 'Recepción y pago de remesas.', commission_type: 'percent', commission_rate: 2, unit: 'por envío', icon: 'cash-stack' },
    { name: 'Certificados y licencias digitales', category: 'certificados', description: 'e.firma, SSL, antivirus, Microsoft 365, Google Workspace.', commission_type: 'percent', commission_rate: 10, unit: 'por licencia', icon: 'patch-check' },
    { name: 'Publicidad local en la red', category: 'publicidad', description: 'Tu volante en decenas de tiendas por un mes.', commission_type: 'fixed', commission_amount: 200, unit: 'por campaña', icon: 'megaphone' },
    { name: 'Marketplace de insumos', category: 'marketplace', description: 'Bolsas, cinta, etiquetas, papelería, limpieza, uniformes.', commission_type: 'percent', commission_rate: 8, unit: 'por pedido', icon: 'box-seam' },
    { name: 'Farmacia bajo pedido', category: 'farmacia', description: 'El negocio recibe el pedido, tú entregas por la tarde.', commission_type: 'percent', commission_rate: 10, unit: 'por pedido', icon: 'capsule' },
    { name: 'Locker humano', category: 'locker', description: 'Guarda de paquetes para que el cliente pase cuando pueda.', commission_type: 'fixed', commission_amount: 8, unit: 'por paquete', icon: 'safe2' },
    { name: 'Productos locales (café, miel, salsas)', category: 'productos_locales', description: 'Punto de venta para productores de la región.', commission_type: 'percent', commission_rate: 12, unit: 'por venta', icon: 'bag-heart' },
    { name: 'Facturación electrónica (B2B)', category: 'b2b', description: 'Alta y suscripción de facturación para negocios.', commission_type: 'percent', commission_rate: 10, unit: 'por suscripción', icon: 'file-earmark-text' },
    { name: 'Terminal bancaria / TPV (B2B)', category: 'b2b', description: 'Alta de terminal de cobro para el comercio.', commission_type: 'fixed', commission_amount: 150, unit: 'por alta', icon: 'credit-card-2-back' },
    { name: 'Sitio web / tienda en línea (B2B)', category: 'b2b', description: 'Desarrollo web y tiendas en línea para negocios.', commission_type: 'percent', commission_rate: 15, unit: 'por proyecto', icon: 'globe' }
  ]
  const scoll = dao.findCollectionByNameOrId("services1234567")
  for (let i = 0; i < seed.length; i++) {
    const s = seed[i]
    const r = new Record(scoll, {
      name: s.name, category: s.category, description: s.description,
      commission_type: s.commission_type, commission_rate: s.commission_rate || 0,
      commission_amount: s.commission_amount || 0, unit: s.unit, icon: s.icon, active: true
    })
    dao.saveRecord(r)
  }
}, (db) => {
  const dao = new Dao(db)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("serviceorders12")) } catch (e) {}
  try { dao.deleteCollection(dao.findCollectionByNameOrId("services1234567")) } catch (e) {}
  const pay = dao.findCollectionByNameOrId("payments")
  pay.schema.removeField("pykind000")
  pay.schema.addField(new SchemaField({
    "system": false, "id": "pykind000", "name": "kind", "type": "select",
    "required": false, "options": { "maxSelect": 1, "values": ["excursion", "guide"] }
  }))
  dao.saveCollection(pay)
})
