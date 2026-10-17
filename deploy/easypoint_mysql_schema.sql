-- ==============================================================================
-- EasyPoint - Production Relational Schema for MySQL 8.x / MariaDB 10.5+
-- Generated from PocketBase schema definitions
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------
-- 1. Tablas de Autenticación y Administración
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `_admins` (
  `id` VARCHAR(15) NOT NULL,
  `avatar` INT NOT NULL DEFAULT 0,
  `email` VARCHAR(255) NOT NULL,
  `tokenKey` VARCHAR(255) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `lastResetSentAt` VARCHAR(64) DEFAULT '',
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(15) NOT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL DEFAULT '',
  `emailVisibility` TINYINT(1) NOT NULL DEFAULT 0,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `tokenKey` VARCHAR(255) DEFAULT NULL,
  `passwordHash` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT '',
  `full_name` VARCHAR(255) DEFAULT '',
  `role` VARCHAR(64) NOT NULL DEFAULT 'operator',
  `point_ref` VARCHAR(15) DEFAULT '',
  `provider_ref` VARCHAR(15) DEFAULT '',
  `avatar` VARCHAR(255) DEFAULT '',
  `lastResetSentAt` VARCHAR(64) DEFAULT '',
  `lastVerificationSentAt` VARCHAR(64) DEFAULT '',
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_point_ref` (`point_ref`),
  KEY `idx_users_provider_ref` (`provider_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` VARCHAR(15) NOT NULL,
  `test_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Puntos Físicos y Solicitudes de Afiliación
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `points` (
  `id` VARCHAR(15) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `lat` DECIMAL(10,7) DEFAULT NULL,
  `lng` DECIMAL(10,7) DEFAULT NULL,
  `whatsapp` VARCHAR(32) DEFAULT NULL,
  `maps_url` TEXT DEFAULT NULL,
  `commission_rate` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `commission_type` VARCHAR(32) NOT NULL DEFAULT 'percent',
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_points_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_applications` (
  `id` VARCHAR(15) NOT NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `contact_phone` VARCHAR(32) DEFAULT NULL,
  `whatsapp` VARCHAR(32) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'new',
  `maps_url` TEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `horarios` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_partner_app_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Envíos y Rastreo de Paquetería
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `shipments` (
  `id` VARCHAR(15) NOT NULL,
  `tracking_id` VARCHAR(128) NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'received',
  `point_id` VARCHAR(15) DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_shipments_tracking_id` (`tracking_id`),
  KEY `idx_shipments_status` (`status`),
  KEY `idx_shipments_point_id` (`point_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tracking_alerts` (
  `id` VARCHAR(15) NOT NULL,
  `tracking_id` VARCHAR(128) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tracking_alerts_tracking_id` (`tracking_id`),
  KEY `idx_tracking_alerts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipping_guides` (
  `id` VARCHAR(15) NOT NULL,
  `carrier` VARCHAR(64) NOT NULL,
  `service` VARCHAR(64) DEFAULT NULL,
  `tracking_number` VARCHAR(128) DEFAULT NULL,
  `origin_cp` VARCHAR(16) DEFAULT NULL,
  `dest_cp` VARCHAR(16) DEFAULT NULL,
  `origin_address` TEXT DEFAULT NULL,
  `dest_address` TEXT DEFAULT NULL,
  `sender_name` VARCHAR(255) DEFAULT NULL,
  `recipient_name` VARCHAR(255) DEFAULT NULL,
  `recipient_phone` VARCHAR(32) DEFAULT NULL,
  `weight_kg` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `length_cm` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
  `width_cm` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
  `height_cm` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
  `declared_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'quoted',
  `point_name` VARCHAR(255) DEFAULT NULL,
  `point_id` VARCHAR(15) DEFAULT NULL,
  `payment_status` VARCHAR(64) NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(64) DEFAULT NULL,
  `payment_ref` VARCHAR(128) DEFAULT NULL,
  `paid_at` VARCHAR(64) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_guides_tracking_number` (`tracking_number`),
  KEY `idx_guides_carrier` (`carrier`),
  KEY `idx_guides_status` (`status`),
  KEY `idx_guides_point_id` (`point_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Proveedores y Catálogo de Excursiones Turísticas
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `providers` (
  `id` VARCHAR(15) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `whatsapp` VARCHAR(32) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `fee_rate` DECIMAL(6,2) NOT NULL DEFAULT 15.00,
  `fee_type` VARCHAR(32) NOT NULL DEFAULT 'percent',
  `fee_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `clabe` VARCHAR(18) DEFAULT NULL,
  `bank_name` VARCHAR(64) DEFAULT NULL,
  `beneficiary` VARCHAR(255) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_providers_active` (`active`),
  KEY `idx_providers_clabe` (`clabe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `excursions` (
  `id` VARCHAR(15) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `deposit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `duration` VARCHAR(64) DEFAULT NULL,
  `max_capacity` INT NOT NULL DEFAULT 0,
  `available_dates` TEXT DEFAULT NULL,
  `provider_name` VARCHAR(255) DEFAULT NULL,
  `provider_whatsapp` VARCHAR(32) DEFAULT NULL,
  `provider_id` VARCHAR(15) DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `policy` TEXT DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_excursions_active` (`active`),
  KEY `idx_excursions_provider_id` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `excursion_bookings` (
  `id` VARCHAR(15) NOT NULL,
  `excursion_ref` VARCHAR(15) DEFAULT NULL,
  `excursion_name` VARCHAR(255) DEFAULT NULL,
  `destination` VARCHAR(255) DEFAULT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(32) NOT NULL,
  `customer_email` VARCHAR(255) DEFAULT NULL,
  `people` INT NOT NULL DEFAULT 1,
  `excursion_date` VARCHAR(32) DEFAULT NULL,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(64) NOT NULL DEFAULT 'pending',
  `status` VARCHAR(64) NOT NULL DEFAULT 'new',
  `confirmed_channel` VARCHAR(64) DEFAULT NULL,
  `voucher_code` VARCHAR(64) DEFAULT NULL,
  `voucher_token` VARCHAR(64) DEFAULT NULL,
  `checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checked_in_at` VARCHAR(64) DEFAULT NULL,
  `payment_method` VARCHAR(64) DEFAULT NULL,
  `payment_ref` VARCHAR(128) DEFAULT NULL,
  `paid_at` VARCHAR(64) DEFAULT NULL,
  `reminder_optin` TINYINT(1) NOT NULL DEFAULT 1,
  `reminder_cadence` VARCHAR(32) DEFAULT 'daily',
  `reminder_channel` VARCHAR(32) DEFAULT 'both',
  `reminder_dates` TEXT DEFAULT NULL,
  `reminders_sent` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_bookings_voucher_code` (`voucher_code`),
  KEY `idx_bookings_phone` (`customer_phone`),
  KEY `idx_bookings_excursion_date` (`excursion_ref`, `excursion_date`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_payment_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Catálogo de Servicios y Órdenes
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(15) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'general',
  `description` TEXT DEFAULT NULL,
  `commission_type` VARCHAR(32) NOT NULL DEFAULT 'percent',
  `commission_rate` DECIMAL(6,2) NOT NULL DEFAULT 10.00,
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(64) DEFAULT 'servicio',
  `provider_name` VARCHAR(255) DEFAULT NULL,
  `icon` VARCHAR(64) DEFAULT 'grid',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_services_active` (`active`),
  KEY `idx_services_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_orders` (
  `id` VARCHAR(15) NOT NULL,
  `service_ref` VARCHAR(15) DEFAULT NULL,
  `service_name` VARCHAR(255) DEFAULT NULL,
  `category` VARCHAR(64) DEFAULT NULL,
  `point_id` VARCHAR(15) DEFAULT NULL,
  `point_name` VARCHAR(255) DEFAULT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `customer_phone` VARCHAR(32) DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'completed',
  `notes` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_service_orders_point_id` (`point_id`),
  KEY `idx_service_orders_service_ref` (`service_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tesorería, Cobranza, Comisiones, Liquidaciones y Monederos
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(15) NOT NULL,
  `kind` VARCHAR(64) NOT NULL DEFAULT 'excursion',
  `ref` VARCHAR(64) DEFAULT NULL,
  `label` VARCHAR(255) DEFAULT NULL,
  `point_id` VARCHAR(15) DEFAULT NULL,
  `point_name` VARCHAR(255) DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `collected_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `rounding` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `method` VARCHAR(32) NOT NULL DEFAULT 'cash',
  `status` VARCHAR(64) NOT NULL DEFAULT 'held_at_point',
  `collected_by` VARCHAR(128) DEFAULT NULL,
  `collected_at` VARCHAR(64) DEFAULT NULL,
  `delivered_at` VARCHAR(64) DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_payments_ref` (`ref`),
  KEY `idx_payments_point_id` (`point_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settlements` (
  `id` VARCHAR(15) NOT NULL,
  `kind` VARCHAR(64) NOT NULL DEFAULT 'provider',
  `ref` VARCHAR(15) NOT NULL,
  `ref_name` VARCHAR(255) DEFAULT NULL,
  `folio` VARCHAR(64) DEFAULT NULL,
  `period` VARCHAR(32) DEFAULT NULL,
  `gross` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_settlements_folio` (`folio`),
  KEY `idx_settlements_ref` (`ref`),
  KEY `idx_settlements_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commissions` (
  `id` VARCHAR(15) NOT NULL,
  `point_id` VARCHAR(15) NOT NULL,
  `point_name` VARCHAR(255) DEFAULT NULL,
  `period` VARCHAR(32) NOT NULL,
  `packages_handled` INT NOT NULL DEFAULT 0,
  `rate` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_commissions_point_id` (`point_id`),
  KEY `idx_commissions_period` (`period`),
  KEY `idx_commissions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(15) NOT NULL,
  `number` VARCHAR(64) NOT NULL,
  `period` VARCHAR(32) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_rfc` VARCHAR(32) DEFAULT NULL,
  `items` JSON DEFAULT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'draft',
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_invoices_number` (`number`),
  KEY `idx_invoices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallets` (
  `id` VARCHAR(15) NOT NULL,
  `customer_phone` VARCHAR(32) NOT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wallets_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_entries` (
  `id` VARCHAR(15) NOT NULL,
  `customer_phone` VARCHAR(32) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(255) DEFAULT NULL,
  `ref` VARCHAR(64) DEFAULT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_wallet_entries_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Atención al Cliente y Auditoría
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(15) NOT NULL,
  `kind` VARCHAR(64) NOT NULL DEFAULT 'complaint',
  `subject_ref` VARCHAR(64) DEFAULT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `customer_phone` VARCHAR(32) DEFAULT NULL,
  `customer_email` VARCHAR(255) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'open',
  `resolution` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` VARCHAR(15) NOT NULL,
  `actor` VARCHAR(255) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_collection` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `detail` TEXT DEFAULT NULL,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_actor` (`actor`),
  KEY `idx_audit_target` (`target_collection`, `target_id`),
  KEY `idx_audit_created` (`created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
