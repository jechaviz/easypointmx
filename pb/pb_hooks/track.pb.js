/// <reference path="../pb_data/types.d.ts" />

// Rastreo de paquetes publico y seguro.
//
// La coleccion `shipments` quedo cerrada a staff autenticado (ver la migracion
// harden_api_rules), por lo que el rastreo anonimo pasa por este endpoint, que
// devuelve UNICAMENTE los campos que el destinatario necesita: nunca el nombre
// o domicilio del destinatario ni otra PII.
//
// $app.dao() opera con contexto de superusuario e ignora las reglas de la
// coleccion, asi que sigue funcionando aunque `shipments` este cerrada.
routerAdd('GET', '/api/track/:code', (c) => {
  const code = String(c.pathParam('code') || '').trim().toUpperCase()
  if (!code) {
    return c.json(400, { error: 'missing_code' })
  }

  let record
  try {
    record = $app.dao().findFirstRecordByFilter(
      'shipments',
      'tracking_id = {:code}',
      { code }
    )
  } catch (err) {
    return c.json(404, { error: 'not_found' })
  }

  let point = null
  const pointId = record.getString('point_id')
  if (pointId) {
    try {
      const p = $app.dao().findRecordById('points', pointId)
      point = { name: p.getString('name'), address: p.getString('address') }
    } catch (err) {
      point = null
    }
  }

  return c.json(200, {
    tracking_id: record.getString('tracking_id'),
    status: record.getString('status'),
    created: record.getString('created'),
    updated: record.getString('updated'),
    expand: { point_id: point }
  })
})
