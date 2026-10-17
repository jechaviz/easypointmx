-- 002: estados de pago más largos (pending_confirm). Idempotente: sirve para bases creadas con 001 original.
ALTER TABLE payments MODIFY status VARCHAR(20) NOT NULL DEFAULT 'held_at_point';
