-- =========================================================================
-- Migration: 007_sl_staging_manufacturer_metadata
-- Transient manufacturer contact from drawing cover (pre-verification).
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 007_sl_staging_manufacturer_metadata.sql
-- =========================================================================

ALTER TABLE sl_Staging
    ADD COLUMN StagedAddress VARCHAR(512) NULL AFTER ManufacturerID;

ALTER TABLE sl_Staging
    ADD COLUMN StagedPhone VARCHAR(50) NULL AFTER StagedAddress;
