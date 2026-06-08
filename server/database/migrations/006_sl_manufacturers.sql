-- =========================================================================
-- Migration: 006_sl_manufacturers
-- Phase 1 Manufacturer Master Data: canonical manufacturer registry and
-- sl_Staging linkage via ManufacturerID.
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 006_sl_manufacturers.sql
-- =========================================================================

CREATE TABLE sl_Manufacturers (
    ManufacturerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    NormalizedName VARCHAR(255) NOT NULL,
    WebsiteURL VARCHAR(512) NULL,
    SupportPhone VARCHAR(64) NULL,
    ProcurementURL VARCHAR(512) NULL,
    Address VARCHAR(512) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_manufacturer_normalized_name (NormalizedName),
    INDEX idx_manufacturer_name (Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sl_Staging
    ADD COLUMN ManufacturerID INT NULL AFTER Manufacturer;

ALTER TABLE sl_Staging
    ADD CONSTRAINT fk_staging_manufacturer
        FOREIGN KEY (ManufacturerID) REFERENCES sl_Manufacturers(ManufacturerID) ON DELETE SET NULL;

ALTER TABLE sl_Staging
    ADD INDEX idx_staging_manufacturer (ManufacturerID);
