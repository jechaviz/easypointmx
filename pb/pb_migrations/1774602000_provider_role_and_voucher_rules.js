/// <reference path="../pb_data/types.d.ts" />

// Migración para rol de proveedor, campos de voucher digital, check-in y reglas RBAC.
migrate((db) => {
  const dao = new Dao(db);

  // 1. Agregar provider_ref a users
  try {
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.schema.addField(new SchemaField({
      system: false,
      id: "usprovref00",
      name: "provider_ref",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));
    dao.saveCollection(users);
  } catch (err) {}

  // 2. Agregar voucher_code, checked_in, checked_in_at, voucher_token a excursion_bookings
  try {
    const bookings = dao.findCollectionByNameOrId("excursion_bookings");
    bookings.schema.addField(new SchemaField({
      system: false,
      id: "ebvouchercd",
      name: "voucher_code",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));
    bookings.schema.addField(new SchemaField({
      system: false,
      id: "ebcheckedin",
      name: "checked_in",
      type: "bool",
      required: false,
      presentable: false,
      unique: false,
      options: {}
    }));
    bookings.schema.addField(new SchemaField({
      system: false,
      id: "ebchckinat0",
      name: "checked_in_at",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));
    bookings.schema.addField(new SchemaField({
      system: false,
      id: "ebvouchertk",
      name: "voucher_token",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));

    // Reglas de acceso
    bookings.listRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'provider' || @request.auth.role = 'operator')";
    bookings.viewRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'provider' || @request.auth.role = 'operator')";
    bookings.updateRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'provider')";
    dao.saveCollection(bookings);
  } catch (err) {}

  // 3. Agregar campos bancarios a providers y ajustar reglas
  try {
    const providers = dao.findCollectionByNameOrId("providers");
    providers.schema.addField(new SchemaField({
      system: false,
      id: "prclabe0000",
      name: "clabe",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));
    providers.schema.addField(new SchemaField({
      system: false,
      id: "prbanknm000",
      name: "bank_name",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));
    providers.schema.addField(new SchemaField({
      system: false,
      id: "prbenefic00",
      name: "beneficiary",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: "" }
    }));

    providers.listRule = "@request.auth.id != ''";
    providers.viewRule = "@request.auth.id != ''";
    providers.updateRule = "@request.auth.role = 'admin' || (@request.auth.role = 'provider' && @request.auth.provider_ref = id)";
    dao.saveCollection(providers);
  } catch (err) {}

}, (db) => {
  const dao = new Dao(db);
  try {
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.schema.removeField("usprovref00");
    dao.saveCollection(users);
  } catch (err) {}

  try {
    const bookings = dao.findCollectionByNameOrId("excursion_bookings");
    bookings.schema.removeField("ebvouchercd");
    bookings.schema.removeField("ebcheckedin");
    bookings.schema.removeField("ebchckinat0");
    bookings.schema.removeField("ebvouchertk");
    bookings.listRule = "@request.auth.role = 'admin'";
    bookings.viewRule = "@request.auth.role = 'admin'";
    bookings.updateRule = "@request.auth.role = 'admin'";
    dao.saveCollection(bookings);
  } catch (err) {}

  try {
    const providers = dao.findCollectionByNameOrId("providers");
    providers.schema.removeField("prclabe0000");
    providers.schema.removeField("prbanknm000");
    providers.schema.removeField("prbenefic00");
    providers.listRule = "@request.auth.role = 'admin'";
    providers.viewRule = "@request.auth.role = 'admin'";
    providers.updateRule = "@request.auth.role = 'admin'";
    dao.saveCollection(providers);
  } catch (err) {}
});
