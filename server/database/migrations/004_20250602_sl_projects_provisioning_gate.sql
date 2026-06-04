-- =========================================================================
-- Migration: 004_20250602_sl_projects_provisioning_gate
-- Unified project provisioning gate: expanded sl_Projects identity,
-- financial, and personnel columns. Tracked via sl_SchemaMigrations.
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 004_20250602_sl_projects_provisioning_gate.sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS sl_Projects (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    ClientID CHAR(36) NOT NULL,
    MspSaturnProjectRef INT NULL,
    ProjectName VARCHAR(255) NOT NULL,
    ProjectStatus VARCHAR(50) NOT NULL DEFAULT 'Active',
    ProjectAddress VARCHAR(255) DEFAULT NULL,
    ProjectCity VARCHAR(100) DEFAULT NULL,
    ProjectState VARCHAR(100) DEFAULT NULL,
    ProjectZip VARCHAR(20) DEFAULT NULL,
    CountryCode CHAR(2) NOT NULL DEFAULT 'US',
    ProjectLocale VARCHAR(10) DEFAULT 'en-US',
    FundingCompanyName VARCHAR(255) DEFAULT NULL,
    PurchaseOrderNumber VARCHAR(100) DEFAULT NULL,
    ProjectManagerName VARCHAR(150) DEFAULT NULL,
    ProjectManagerEmail VARCHAR(255) DEFAULT NULL,
    ProjectManagerPhone VARCHAR(50) DEFAULT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ClientID) REFERENCES sl_Clients(ClientID),
    UNIQUE KEY idx_sl_projects_ref (MspSaturnProjectRef),
    KEY idx_projects_name (ProjectName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy upgrade when sl_Projects was created by 001_init_supplyline.sql
SET @sl_has_city := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sl_Projects'
    AND COLUMN_NAME = 'City'
);

SET @sl_rename_city := IF(
  @sl_has_city > 0,
  'ALTER TABLE sl_Projects CHANGE COLUMN City ProjectCity VARCHAR(100) DEFAULT NULL',
  'SELECT 1'
);
PREPARE sl_stmt_city FROM @sl_rename_city;
EXECUTE sl_stmt_city;
DEALLOCATE PREPARE sl_stmt_city;

SET @sl_has_status := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sl_Projects'
    AND COLUMN_NAME = 'Status'
);

SET @sl_rename_status := IF(
  @sl_has_status > 0,
  'ALTER TABLE sl_Projects CHANGE COLUMN Status ProjectStatus VARCHAR(50) NOT NULL DEFAULT ''Active''',
  'SELECT 1'
);
PREPARE sl_stmt_status FROM @sl_rename_status;
EXECUTE sl_stmt_status;
DEALLOCATE PREPARE sl_stmt_status;

ALTER TABLE sl_Projects
  ADD COLUMN IF NOT EXISTS ProjectAddress VARCHAR(255) DEFAULT NULL AFTER ProjectStatus,
  ADD COLUMN IF NOT EXISTS ProjectState VARCHAR(100) DEFAULT NULL AFTER ProjectCity,
  ADD COLUMN IF NOT EXISTS ProjectZip VARCHAR(20) DEFAULT NULL AFTER ProjectState,
  ADD COLUMN IF NOT EXISTS FundingCompanyName VARCHAR(255) DEFAULT NULL AFTER ProjectLocale,
  ADD COLUMN IF NOT EXISTS PurchaseOrderNumber VARCHAR(100) DEFAULT NULL AFTER FundingCompanyName,
  ADD COLUMN IF NOT EXISTS ProjectManagerName VARCHAR(150) DEFAULT NULL AFTER PurchaseOrderNumber,
  ADD COLUMN IF NOT EXISTS ProjectManagerEmail VARCHAR(255) DEFAULT NULL AFTER ProjectManagerName,
  ADD COLUMN IF NOT EXISTS ProjectManagerPhone VARCHAR(50) DEFAULT NULL AFTER ProjectManagerEmail;

SET @sl_drop_saturn_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sl_Projects'
    AND INDEX_NAME = 'idx_saturn_ref'
);

SET @sl_drop_idx_sql := IF(
  @sl_drop_saturn_idx > 0,
  'ALTER TABLE sl_Projects DROP INDEX idx_saturn_ref',
  'SELECT 1'
);
PREPARE sl_stmt_drop_idx FROM @sl_drop_idx_sql;
EXECUTE sl_stmt_drop_idx;
DEALLOCATE PREPARE sl_stmt_drop_idx;

SET @sl_has_unique_ref := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sl_Projects'
    AND INDEX_NAME = 'idx_sl_projects_ref'
);

SET @sl_add_unique_ref := IF(
  @sl_has_unique_ref = 0,
  'ALTER TABLE sl_Projects ADD UNIQUE KEY idx_sl_projects_ref (MspSaturnProjectRef)',
  'SELECT 1'
);
PREPARE sl_stmt_unique_ref FROM @sl_add_unique_ref;
EXECUTE sl_stmt_unique_ref;
DEALLOCATE PREPARE sl_stmt_unique_ref;

SET @sl_has_name_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sl_Projects'
    AND INDEX_NAME = 'idx_projects_name'
);

SET @sl_add_name_idx := IF(
  @sl_has_name_idx = 0,
  'ALTER TABLE sl_Projects ADD KEY idx_projects_name (ProjectName)',
  'SELECT 1'
);
PREPARE sl_stmt_name_idx FROM @sl_add_name_idx;
EXECUTE sl_stmt_name_idx;
DEALLOCATE PREPARE sl_stmt_name_idx;
