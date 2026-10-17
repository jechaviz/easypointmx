-- Easypoint v2 · esquema MySQL/MariaDB (utf8mb4). Fuente de verdad del dominio.
-- Convenciones: ids BIGINT autoincrement; dinero DECIMAL(12,2) MXN; fechas en UTC como DATETIME / DATE.
-- El servidor V deduce el tipo JSON de cada columna de este archivo (número / bool / texto).

CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL DEFAULT '',
  name VARCHAR(160) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  point_id BIGINT NOT NULL DEFAULT 0,
  provider_id BIGINT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  reset_token VARCHAR(80) NOT NULL DEFAULT '',
  reset_expires DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS points (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(300) NOT NULL DEFAULT '',
  lat DOUBLE NOT NULL DEFAULT 0,
  lng DOUBLE NOT NULL DEFAULT 0,
  whatsapp VARCHAR(30) NOT NULL DEFAULT '',
  maps_url VARCHAR(400) NOT NULL DEFAULT '',
  hours VARCHAR(160) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  commission_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  commission_rate DOUBLE NOT NULL DEFAULT 10,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tier VARCHAR(10) NOT NULL DEFAULT 'basic',
  cash_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  rating DOUBLE NOT NULL DEFAULT 0,
  last_activity_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  KEY ix_points_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_applications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(160) NOT NULL,
  contact_name VARCHAR(160) NOT NULL DEFAULT '',
  contact_phone VARCHAR(30) NOT NULL DEFAULT '',
  whatsapp VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  address VARCHAR(300) NOT NULL DEFAULT '',
  maps_url VARCHAR(400) NOT NULL DEFAULT '',
  description TEXT,
  horarios VARCHAR(200) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'point',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  score INT NOT NULL DEFAULT 0,
  sla_due DATETIME NULL,
  owner_note TEXT,
  utm VARCHAR(400) NOT NULL DEFAULT '',
  point_id BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY ix_apps_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS providers (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  fee_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  fee_rate DOUBLE NOT NULL DEFAULT 15,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  clabe VARCHAR(30) NOT NULL DEFAULT '',
  bank_name VARCHAR(80) NOT NULL DEFAULT '',
  beneficiary VARCHAR(160) NOT NULL DEFAULT '',
  payout_days INT NOT NULL DEFAULT 2,
  rating DOUBLE NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS excursions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider_id BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(200) NOT NULL,
  destination VARCHAR(160) NOT NULL DEFAULT '',
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  duration VARCHAR(60) NOT NULL DEFAULT '',
  image_url VARCHAR(400) NOT NULL DEFAULT '',
  max_capacity INT NOT NULL DEFAULT 0,
  min_people INT NOT NULL DEFAULT 0,
  cutoff_days INT NOT NULL DEFAULT 0,
  deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  policy TEXT,
  meeting_point VARCHAR(300) NOT NULL DEFAULT '',
  departure_time VARCHAR(20) NOT NULL DEFAULT '',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  tags VARCHAR(200) NOT NULL DEFAULT '',
  rating_avg DOUBLE NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  KEY ix_exc_provider (provider_id), KEY ix_exc_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departures (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  excursion_id BIGINT NOT NULL,
  date DATE NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'open',
  note VARCHAR(300) NOT NULL DEFAULT '',
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_departure (excursion_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  referral_code VARCHAR(20) NOT NULL DEFAULT '',
  referred_by VARCHAR(20) NOT NULL DEFAULT '',
  tier VARCHAR(10) NOT NULL DEFAULT 'base',
  club_until DATE NULL,
  trips INT NOT NULL DEFAULT 0,
  lifetime_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  segment VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1,
  source VARCHAR(80) NOT NULL DEFAULT '',
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  UNIQUE KEY uq_customers_phone (phone),
  KEY ix_customers_ref (referral_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  token VARCHAR(60) NOT NULL,
  excursion_id BIGINT NOT NULL,
  departure_id BIGINT NOT NULL DEFAULT 0,
  excursion_name VARCHAR(200) NOT NULL DEFAULT '',
  destination VARCHAR(160) NOT NULL DEFAULT '',
  excursion_date DATE NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL DEFAULT '',
  customer_email VARCHAR(190) NOT NULL DEFAULT '',
  people INT NOT NULL DEFAULT 1,
  list_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  protect TINYINT(1) NOT NULL DEFAULT 0,
  protect_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(12) NOT NULL DEFAULT 'pending',
  status VARCHAR(12) NOT NULL DEFAULT 'new',
  stage VARCHAR(16) NOT NULL DEFAULT 'reservado',
  promo_code VARCHAR(40) NOT NULL DEFAULT '',
  referral_code_used VARCHAR(20) NOT NULL DEFAULT '',
  confirmed_channel VARCHAR(24) NOT NULL DEFAULT '',
  payment_method VARCHAR(24) NOT NULL DEFAULT '',
  paid_at DATETIME NULL,
  reminder_optin TINYINT(1) NOT NULL DEFAULT 0,
  reminder_cadence VARCHAR(12) NOT NULL DEFAULT 'biweekly',
  reminder_channel VARCHAR(12) NOT NULL DEFAULT 'both',
  reminder_dates VARCHAR(400) NOT NULL DEFAULT '',
  reminders_sent VARCHAR(400) NOT NULL DEFAULT '',
  checked_in TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at DATETIME NULL,
  rating INT NOT NULL DEFAULT 0,
  review_text TEXT,
  review_requested TINYINT(1) NOT NULL DEFAULT 0,
  cashback_paid TINYINT(1) NOT NULL DEFAULT 0,
  referral_rewarded TINYINT(1) NOT NULL DEFAULT 0,
  stats_counted TINYINT(1) NOT NULL DEFAULT 0,
  closed_reason VARCHAR(60) NOT NULL DEFAULT '',
  reschedules INT NOT NULL DEFAULT 0,
  utm VARCHAR(400) NOT NULL DEFAULT '',
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_bookings_code (code),
  KEY ix_bookings_exc_date (excursion_id, excursion_date),
  KEY ix_bookings_phone (customer_phone),
  KEY ix_bookings_status (status, payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tracking_id VARCHAR(40) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  point_id BIGINT NOT NULL DEFAULT 0,
  recipient_name VARCHAR(160) NOT NULL DEFAULT '',
  recipient_phone VARCHAR(30) NOT NULL DEFAULT '',
  recipient_email VARCHAR(190) NOT NULL DEFAULT '',
  carrier VARCHAR(40) NOT NULL DEFAULT '',
  source VARCHAR(40) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_shipments_tracking (tracking_id),
  KEY ix_shipments_point (point_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipping_guides (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  carrier VARCHAR(12) NOT NULL DEFAULT 'dhl',
  service VARCHAR(12) NOT NULL DEFAULT 'standard',
  tracking_number VARCHAR(60) NOT NULL DEFAULT '',
  origin_cp VARCHAR(10) NOT NULL DEFAULT '',
  dest_cp VARCHAR(10) NOT NULL DEFAULT '',
  origin_address VARCHAR(300) NOT NULL DEFAULT '',
  dest_address VARCHAR(300) NOT NULL DEFAULT '',
  sender_name VARCHAR(160) NOT NULL DEFAULT '',
  sender_phone VARCHAR(30) NOT NULL DEFAULT '',
  recipient_name VARCHAR(160) NOT NULL DEFAULT '',
  recipient_phone VARCHAR(30) NOT NULL DEFAULT '',
  weight_kg DOUBLE NOT NULL DEFAULT 0,
  length_cm DOUBLE NOT NULL DEFAULT 0,
  width_cm DOUBLE NOT NULL DEFAULT 0,
  height_cm DOUBLE NOT NULL DEFAULT 0,
  declared_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  insured TINYINT(1) NOT NULL DEFAULT 0,
  insurance_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(14) NOT NULL DEFAULT 'quoted',
  payment_status VARCHAR(12) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(24) NOT NULL DEFAULT '',
  paid_at DATETIME NULL,
  point_id BIGINT NOT NULL DEFAULT 0,
  point_name VARCHAR(160) NOT NULL DEFAULT '',
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_guides_status (status), KEY ix_guides_point (point_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Libro de pagos: el efectivo viaja punto → chofer → admin.
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(12) NOT NULL DEFAULT 'excursion',
  ref VARCHAR(40) NOT NULL DEFAULT '',
  booking_id BIGINT NOT NULL DEFAULT 0,
  label VARCHAR(300) NOT NULL DEFAULT '',
  point_id BIGINT NOT NULL DEFAULT 0,
  point_name VARCHAR(160) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  net DECIMAL(12,2) NOT NULL DEFAULT 0,
  method VARCHAR(12) NOT NULL DEFAULT 'cash',
  status VARCHAR(20) NOT NULL DEFAULT 'held_at_point',
  collected_by BIGINT NOT NULL DEFAULT 0,
  collected_by_name VARCHAR(160) NOT NULL DEFAULT '',
  collected_at DATETIME NULL,
  collected_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  rounding DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivered_at DATETIME NULL,
  corte_folio VARCHAR(30) NOT NULL DEFAULT '',
  settled_folio VARCHAR(30) NOT NULL DEFAULT '',
  gateway_ref VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_payments_status (status), KEY ix_payments_point (point_id, status), KEY ix_payments_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_phone VARCHAR(30) NOT NULL,
  customer_name VARCHAR(160) NOT NULL DEFAULT '',
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_wallet_phone (customer_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_entries (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_phone VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(40) NOT NULL DEFAULT '',
  ref VARCHAR(40) NOT NULL DEFAULT '',
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
  expires_at DATETIME NULL,
  settled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY ix_wentries_phone (customer_phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlements (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(14) NOT NULL DEFAULT 'provider',
  ref VARCHAR(40) NOT NULL DEFAULT '',
  ref_name VARCHAR(160) NOT NULL DEFAULT '',
  period VARCHAR(40) NOT NULL DEFAULT '',
  gross DECIMAL(12,2) NOT NULL DEFAULT 0,
  fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  net DECIMAL(12,2) NOT NULL DEFAULT 0,
  folio VARCHAR(30) NOT NULL DEFAULT '',
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  notes TEXT,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_settlements_folio (folio),
  KEY ix_settlements_status (status, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(24) NOT NULL DEFAULT 'otros',
  description TEXT,
  commission_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  commission_rate DOUBLE NOT NULL DEFAULT 10,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit VARCHAR(40) NOT NULL DEFAULT '',
  provider_name VARCHAR(160) NOT NULL DEFAULT '',
  icon VARCHAR(40) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_orders (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT NOT NULL,
  service_name VARCHAR(160) NOT NULL DEFAULT '',
  category VARCHAR(24) NOT NULL DEFAULT '',
  point_id BIGINT NOT NULL DEFAULT 0,
  point_name VARCHAR(160) NOT NULL DEFAULT '',
  customer_name VARCHAR(160) NOT NULL DEFAULT '',
  customer_phone VARCHAR(30) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at DATETIME NOT NULL,
  KEY ix_orders_point (point_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL DEFAULT '',
  kind VARCHAR(16) NOT NULL DEFAULT 'question',
  subject_ref VARCHAR(160) NOT NULL DEFAULT '',
  booking_id BIGINT NOT NULL DEFAULT 0,
  customer_name VARCHAR(160) NOT NULL DEFAULT '',
  customer_phone VARCHAR(30) NOT NULL DEFAULT '',
  customer_email VARCHAR(190) NOT NULL DEFAULT '',
  message TEXT,
  status VARCHAR(14) NOT NULL DEFAULT 'open',
  priority VARCHAR(10) NOT NULL DEFAULT '',
  sla_due DATETIME NULL,
  first_response_at DATETIME NULL,
  resolution TEXT,
  compensation DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_tickets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(160) NOT NULL,
  excursion_id BIGINT NOT NULL DEFAULT 0,
  kind VARCHAR(14) NOT NULL,
  pct DOUBLE NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  days INT NOT NULL DEFAULT 0,
  min_people INT NOT NULL DEFAULT 0,
  fill_pct INT NOT NULL DEFAULT 0,
  code VARCHAR(40) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  valid_from DATE NULL,
  valid_to DATE NULL,
  max_uses INT NOT NULL DEFAULT 0,
  uses INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY ix_rules_kind (kind, active), KEY ix_rules_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memberships (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_phone VARCHAR(30) NOT NULL,
  customer_name VARCHAR(160) NOT NULL DEFAULT '',
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ep_config (
  ckey VARCHAR(80) NOT NULL PRIMARY KEY,
  cvalue VARCHAR(400) NOT NULL DEFAULT '',
  grp VARCHAR(20) NOT NULL DEFAULT '',
  label VARCHAR(200) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Motor de automatización ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(30) NOT NULL,
  run_at DATETIME NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  payload TEXT,
  dedupe_key VARCHAR(120) NOT NULL DEFAULT '',
  last_error VARCHAR(300) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_jobs_run (status, run_at), KEY ix_jobs_dedupe (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outbox (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  channel VARCHAR(10) NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  to_name VARCHAR(160) NOT NULL DEFAULT '',
  template VARCHAR(40) NOT NULL DEFAULT '',
  subject VARCHAR(200) NOT NULL DEFAULT '',
  body TEXT,
  link VARCHAR(1800) NOT NULL DEFAULT '',
  status VARCHAR(10) NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  entity VARCHAR(30) NOT NULL DEFAULT '',
  entity_id BIGINT NOT NULL DEFAULT 0,
  dedupe_key VARCHAR(120) NOT NULL DEFAULT '',
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  KEY ix_outbox_status (status), KEY ix_outbox_dedupe (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pipeline_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity VARCHAR(30) NOT NULL,
  entity_id BIGINT NOT NULL,
  from_state VARCHAR(30) NOT NULL DEFAULT '',
  to_state VARCHAR(30) NOT NULL DEFAULT '',
  actor VARCHAR(60) NOT NULL DEFAULT 'system',
  note VARCHAR(300) NOT NULL DEFAULT '',
  meta VARCHAR(600) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_events_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(30) NOT NULL DEFAULT 'general',
  title VARCHAR(240) NOT NULL,
  detail VARCHAR(600) NOT NULL DEFAULT '',
  priority VARCHAR(8) NOT NULL DEFAULT 'normal',
  role VARCHAR(12) NOT NULL DEFAULT 'admin',
  scope_id BIGINT NOT NULL DEFAULT 0,
  entity VARCHAR(30) NOT NULL DEFAULT '',
  entity_id BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'open',
  due_at DATETIME NULL,
  dedupe_key VARCHAR(120) NOT NULL DEFAULT '',
  action VARCHAR(30) NOT NULL DEFAULT '',
  payload VARCHAR(800) NOT NULL DEFAULT '',
  done_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  KEY ix_tasks_role (role, status), KEY ix_tasks_dedupe (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_flags (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  severity VARCHAR(8) NOT NULL DEFAULT 'medium',
  kind VARCHAR(30) NOT NULL DEFAULT '',
  entity VARCHAR(30) NOT NULL DEFAULT '',
  entity_id BIGINT NOT NULL DEFAULT 0,
  detail VARCHAR(400) NOT NULL DEFAULT '',
  status VARCHAR(10) NOT NULL DEFAULT 'open',
  dedupe_key VARCHAR(120) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_risk_status (status), KEY ix_risk_dedupe (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(80) NOT NULL DEFAULT '',
  action VARCHAR(40) NOT NULL DEFAULT '',
  target VARCHAR(40) NOT NULL DEFAULT '',
  target_id BIGINT NOT NULL DEFAULT 0,
  detail VARCHAR(600) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_audit_target (target, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket VARCHAR(120) NOT NULL PRIMARY KEY,
  hits INT NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  type VARCHAR(30) NOT NULL DEFAULT '',
  message TEXT,
  utm VARCHAR(400) NOT NULL DEFAULT '',
  page VARCHAR(160) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tracking_alerts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tracking_id VARCHAR(40) NOT NULL,
  email VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(30) NOT NULL DEFAULT '',
  period VARCHAR(40) NOT NULL DEFAULT '',
  client_name VARCHAR(160) NOT NULL DEFAULT '',
  client_rfc VARCHAR(20) NOT NULL DEFAULT '',
  items TEXT,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'draft',
  settlement_id BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Socios e-commerce (Shopify / WooCommerce / API propia): envían paquetes a puntos Easypoint.
CREATE TABLE IF NOT EXISTS api_partners (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  contact_email VARCHAR(190) NOT NULL DEFAULT '',
  key_prefix VARCHAR(12) NOT NULL DEFAULT '',
  key_hash VARCHAR(80) NOT NULL DEFAULT '',
  webhook_url VARCHAR(400) NOT NULL DEFAULT '',
  fee_per_parcel DECIMAL(12,2) NOT NULL DEFAULT 0,
  parcels INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_partner_prefix (key_prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
