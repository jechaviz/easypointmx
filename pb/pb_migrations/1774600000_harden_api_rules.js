/// <reference path="../pb_data/types.d.ts" />

// Hardening de las reglas API de las colecciones.
//
// Antes de esta migracion varias colecciones (shipments, partner_applications,
// points, commissions) tenian TODAS las reglas en "" (acceso publico total),
// exponiendo PII y permitiendo create/update/delete anonimos.
//
// Esta migracion las cierra preservando los flujos publicos que el producto si
// necesita:
//   - points:                lectura publica (mapa del sitio), escritura solo admin
//   - partner_applications:  create publico (formularios web), lectura/edicion admin|sales
//   - shipments:             solo staff autenticado; el rastreo publico pasa por
//                            GET /api/track/:code (ver pb_hooks/track.pb.js)
//   - commissions:           solo admin
//
// system_settings (lectura publica usada por LoginView antes de autenticar) e
// invoices (ya admin-only) se dejan como estan.
migrate((db) => {
  const dao = new Dao(db)

  const isAdmin = "@request.auth.role = 'admin'"
  const isStaff = "@request.auth.id != ''"
  const adminOrSales = "@request.auth.role = 'admin' || @request.auth.role = 'sales'"

  const apply = (name, rules) => {
    let collection
    try {
      collection = dao.findCollectionByNameOrId(name)
    } catch (err) {
      console.log(`[harden] coleccion ausente, se omite: ${name}`)
      return
    }
    collection.listRule = rules.list
    collection.viewRule = rules.view
    collection.createRule = rules.create
    collection.updateRule = rules.update
    collection.deleteRule = rules.delete
    dao.saveCollection(collection)
  }

  apply('points', {
    list: '', view: '', // mapa publico
    create: isAdmin, update: isAdmin, delete: isAdmin
  })

  apply('partner_applications', {
    list: adminOrSales, view: adminOrSales,
    create: '', // formularios publicos partner / B2B
    update: adminOrSales, delete: isAdmin
  })

  apply('shipments', {
    list: isStaff, view: isStaff, // rastreo publico via /api/track/:code
    create: isStaff, update: isStaff, delete: isAdmin
  })

  apply('commissions', {
    list: isAdmin, view: isAdmin,
    create: isAdmin, update: isAdmin, delete: isAdmin
  })

  return true
}, (db) => {
  // Down: restaura el estado permisivo previo para que la migracion sea reversible.
  const dao = new Dao(db)
  const reset = (name) => {
    let collection
    try {
      collection = dao.findCollectionByNameOrId(name)
    } catch (err) {
      return
    }
    collection.listRule = ''
    collection.viewRule = ''
    collection.createRule = ''
    collection.updateRule = ''
    collection.deleteRule = ''
    dao.saveCollection(collection)
  }
  reset('points')
  reset('partner_applications')
  reset('shipments')
  reset('commissions')
  return true
})
