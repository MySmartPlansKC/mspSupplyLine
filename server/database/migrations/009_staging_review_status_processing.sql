-- =========================================================================
-- Migration: 009_staging_review_status_processing
-- Allow intake placeholder rows while PDF + AI extraction runs asynchronously.
--
-- Apply (tracked):
--   cd server && npm run migration:run -- 009_staging_review_status_processing.sql
-- =========================================================================

ALTER TABLE sl_Staging
    MODIFY COLUMN ReviewStatus
        ENUM('Processing', 'Pending', 'Approved', 'Rejected')
        DEFAULT 'Pending';
