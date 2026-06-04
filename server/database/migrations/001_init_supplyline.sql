-- =========================================================================
-- Migration: 001_init_supplyline
-- Target database: supplyLine_db (MySmartPlans SupplyLine)
-- All temporal columns use MariaDB TIMESTAMP defaults; application pool
-- sets session time_zone = '+00:00' for UTC-anchored reads/writes.
--
-- Apply (tracked):
--   cd server && npm run migration:up
--   cd server && npm run migration:run -- 001_init_supplyline.sql
--   cd server && npm run migration:status
-- =========================================================================

-- =========================================================================
-- 3.1 TENANT CONTAINERS & SECURITY PERIMETER
-- =========================================================================

CREATE TABLE sl_Clients (
    ClientID CHAR(36) NOT NULL PRIMARY KEY,
    ClientName VARCHAR(255) NOT NULL,
    CorporateAddress1 VARCHAR(255) NULL,
    CorporateAddress2 VARCHAR(255) NULL,
    City VARCHAR(100) NULL,
    StateProvince VARCHAR(100) NULL,
    PostalCode VARCHAR(20) NULL,
    CountryCode CHAR(2) NOT NULL DEFAULT 'US',
    PrimaryContactName VARCHAR(150) NULL,
    PrimaryContactEmail VARCHAR(255) NULL,
    PrimaryContactPhone VARCHAR(50) NULL,
    BillingEmail VARCHAR(255) NULL,
    DefaultLocale VARCHAR(10) DEFAULT 'en-US',
    AccountStatus ENUM('Active', 'Suspended', 'Trial', 'Cancelled') DEFAULT 'Active',
    Notes TEXT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_Projects (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    ClientID CHAR(36) NOT NULL,
    ProjectName VARCHAR(255) NOT NULL,
    City VARCHAR(100) NULL,
    CountryCode CHAR(2) NOT NULL DEFAULT 'US',
    ProjectLocale VARCHAR(10) DEFAULT 'en-US',
    MspSaturnProjectRef INT NULL,
    Status ENUM('Active', 'Archived') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ClientID) REFERENCES sl_Clients(ClientID),
    INDEX idx_saturn_ref (MspSaturnProjectRef)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_Users (
    UserID CHAR(36) NOT NULL PRIMARY KEY,
    ClientID CHAR(36) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FirstName VARCHAR(100) NULL,
    LastName VARCHAR(100) NULL,
    PreferredLocale VARCHAR(10) DEFAULT 'en-US',
    Role ENUM('SuperAdmin', 'PIM', 'ClientAdmin', 'FacilityViewer') DEFAULT 'FacilityViewer',
    IsActive TINYINT(1) DEFAULT 1,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ClientID) REFERENCES sl_Clients(ClientID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_UserProjectAccess (
    AccessID CHAR(36) NOT NULL PRIMARY KEY,
    UserID CHAR(36) NOT NULL,
    ProjectID INT NOT NULL,
    GrantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES sl_Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ProjectID) REFERENCES sl_Projects(ProjectID) ON DELETE CASCADE,
    UNIQUE KEY idx_user_project (UserID, ProjectID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 3.2 HUMAN-IN-THE-LOOP INGESTION LAYER (STAGING)
-- =========================================================================

CREATE TABLE sl_Staging (
    StagingID CHAR(36) NOT NULL PRIMARY KEY,
    ProjectID INT NOT NULL,
    SourceType ENUM('InternalProject', 'ExternalImport') NOT NULL,
    ExternalRecordRef VARCHAR(255) NULL,
    CategoryName VARCHAR(255) NULL,
    Manufacturer VARCHAR(255) NULL,
    ModelNumber VARCHAR(255) NULL,
    Description TEXT NULL,
    LocationInBuilding VARCHAR(255) NULL,
    Quantity INT DEFAULT 1,
    OriginalRawData JSON NULL,
    ReviewStatus ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    CreatedBy CHAR(36) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectID) REFERENCES sl_Projects(ProjectID),
    INDEX idx_status_project (ReviewStatus, ProjectID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 3.3 PRODUCTION CATALOG LAYER (LIVE LOGISTICS)
-- =========================================================================

CREATE TABLE sl_Categories (
    CategoryID CHAR(36) NOT NULL PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL,
    ParentCategoryID CHAR(36) NULL,
    Translations JSON NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_MasterCatalog (
    ItemID CHAR(36) NOT NULL PRIMARY KEY,
    Manufacturer VARCHAR(255) NOT NULL,
    ModelNumber VARCHAR(255) NOT NULL,
    ItemDescription TEXT NULL,
    CategoryID CHAR(36) NULL,
    Specs JSON NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_mfg_model (Manufacturer, ModelNumber),
    FOREIGN KEY (CategoryID) REFERENCES sl_Categories(CategoryID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_ProjectInventory (
    InventoryID CHAR(36) NOT NULL PRIMARY KEY,
    ProjectID INT NOT NULL,
    ItemID CHAR(36) NOT NULL,
    Quantity INT DEFAULT 1,
    LocationInBuilding VARCHAR(255) NOT NULL,
    SourceDocumentPath VARCHAR(512) NULL,
    InstallDate DATE NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectID) REFERENCES sl_Projects(ProjectID),
    FOREIGN KEY (ItemID) REFERENCES sl_MasterCatalog(ItemID),
    INDEX idx_project_item (ProjectID, ItemID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
