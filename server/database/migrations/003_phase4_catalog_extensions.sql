-- =========================================================================
-- Migration: 003_phase4_catalog_extensions
-- Phase 4 extensions: asset relationships and advanced spec pricing
-- Does not alter sl_Staging, sl_MasterCatalog, or sl_ProjectInventory.
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 003_phase4_catalog_extensions.sql
-- =========================================================================

-- =========================================================================
-- PHASE 4 EXTENSIONS: ASSET RELATIONSHIPS & ADVANCED SPEC PRICING
-- =========================================================================

CREATE TABLE IF NOT EXISTS sl_CatalogRelationships (
    RelationshipID CHAR(36) NOT NULL PRIMARY KEY,
    PrimaryItemID CHAR(36) NOT NULL,
    RelatedItemID CHAR(36) NOT NULL,
    RelationType ENUM('RequiredForInstall', 'OptionalUpgrade', 'DirectSubstitute') DEFAULT 'RequiredForInstall',
    Notes VARCHAR(255) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PrimaryItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE,
    FOREIGN KEY (RelatedItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sl_CatalogPricing (
    PricingID CHAR(36) NOT NULL PRIMARY KEY,
    ItemID CHAR(36) NOT NULL,
    ManufacturerURL VARCHAR(512) NULL,
    EstimatedUnitPrice DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    CurrencyCode CHAR(3) NOT NULL DEFAULT 'USD',
    EstimatedLeadTimeDays INT DEFAULT 0,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
