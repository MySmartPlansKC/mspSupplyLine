-- =========================================================================
-- Migration: 005_sl_staging_documents
-- Assembly Line pipeline: permanent submittal document register + sl_Staging
-- conveyor belt linked via SourceDocumentID (clean-slate TRUNCATE).
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 005_sl_staging_documents.sql
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE sl_Staging;

CREATE TABLE sl_SubmittalDocuments (
    DocumentID CHAR(36) NOT NULL PRIMARY KEY,
    ProjectID INT NOT NULL,
    SourceType ENUM('ManualUpload', 'RegistryIngestion') NOT NULL,
    FileTitle VARCHAR(512) NOT NULL,
    FileHash CHAR(64) NOT NULL,
    ProcessingStatus ENUM('Pending', 'Processing', 'AwaitingReview', 'Completed', 'Error')
        NOT NULL DEFAULT 'Pending',
    ErrorMessage TEXT NULL,
    UploadedBy CHAR(36) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submittal_project
        FOREIGN KEY (ProjectID) REFERENCES sl_Projects(ProjectID) ON DELETE CASCADE,
    UNIQUE KEY idx_proj_file_hash (ProjectID, FileHash),
    UNIQUE KEY idx_proj_file_title (ProjectID, FileTitle),
    INDEX idx_submittal_project_status (ProjectID, ProcessingStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sl_Staging
    ADD COLUMN SourceDocumentID CHAR(36) NOT NULL AFTER ProjectID;

ALTER TABLE sl_Staging
    ADD CONSTRAINT fk_staging_source_doc
        FOREIGN KEY (SourceDocumentID) REFERENCES sl_SubmittalDocuments(DocumentID) ON DELETE CASCADE;

ALTER TABLE sl_Staging
    ADD INDEX idx_staging_source_doc (SourceDocumentID);

SET FOREIGN_KEY_CHECKS = 1;
