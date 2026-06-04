-- =========================================================================
-- Migration: 002_align_user_roles
-- Aligns sl_Users.Role with mspSaturn-style platform RBAC:
--   Platform: MspAdmin, Admin, PIM
--   Client:   ClientAdmin, FacilityViewer
-- =========================================================================

ALTER TABLE sl_Users
  MODIFY Role ENUM(
    'SuperAdmin',
    'MspAdmin',
    'Admin',
    'PIM',
    'ClientAdmin',
    'FacilityViewer'
  ) NOT NULL DEFAULT 'FacilityViewer';

UPDATE sl_Users SET Role = 'MspAdmin' WHERE Role = 'SuperAdmin';

ALTER TABLE sl_Users
  MODIFY Role ENUM(
    'MspAdmin',
    'Admin',
    'PIM',
    'ClientAdmin',
    'FacilityViewer'
  ) NOT NULL DEFAULT 'FacilityViewer';
