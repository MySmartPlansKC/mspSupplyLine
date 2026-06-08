-- =========================================================================
-- Migration: 008_staging_extracted_manufacturer_fields
-- Approval-before-master: raw extracted corporate metadata on staging;
-- defer sl_Manufacturers creation until explicit human approve.
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 008_staging_extracted_manufacturer_fields.sql
-- =========================================================================

ALTER TABLE sl_Staging
    ADD COLUMN ExtractedManufacturer VARCHAR(255) NULL AFTER ManufacturerID;

ALTER TABLE sl_Staging
    ADD COLUMN ExtractedMfgAddress VARCHAR(500) NULL AFTER ExtractedManufacturer;

ALTER TABLE sl_Staging
    ADD COLUMN ExtractedMfgPhone VARCHAR(50) NULL AFTER ExtractedMfgAddress;

ALTER TABLE sl_Staging
    ADD COLUMN ExtractedMfgWebsite VARCHAR(255) NULL AFTER ExtractedMfgPhone;

ALTER TABLE sl_Staging
    ADD COLUMN ExtractedMfgContact VARCHAR(255) NULL AFTER ExtractedMfgWebsite;

UPDATE sl_Staging
SET
    ExtractedManufacturer = COALESCE(ExtractedManufacturer, Manufacturer),
    ExtractedMfgAddress = COALESCE(ExtractedMfgAddress, StagedAddress),
    ExtractedMfgPhone = COALESCE(ExtractedMfgPhone, StagedPhone)
WHERE ExtractedManufacturer IS NULL
   OR ExtractedMfgAddress IS NULL
   OR ExtractedMfgPhone IS NULL;

UPDATE sl_Staging
SET ManufacturerID = NULL
WHERE ReviewStatus = 'Pending';

ALTER TABLE sl_Manufacturers
    ADD COLUMN PrimaryContact VARCHAR(255) NULL AFTER Address;

ALTER TABLE sl_MasterCatalog
    ADD COLUMN ManufacturerID INT NULL AFTER Manufacturer;

ALTER TABLE sl_MasterCatalog
    ADD CONSTRAINT fk_catalog_manufacturer
        FOREIGN KEY (ManufacturerID) REFERENCES sl_Manufacturers(ManufacturerID) ON DELETE SET NULL;

ALTER TABLE sl_MasterCatalog
    ADD INDEX idx_catalog_manufacturer (ManufacturerID);
