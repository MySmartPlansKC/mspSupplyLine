-- One-time provision: supplyLine_db + supplyline_app (run as MariaDB root)
-- Set the password below to match MARIA_DB_PASSWORD in server/.env

CREATE DATABASE IF NOT EXISTS supplyLine_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'supplyline_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_MARIA_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'supplyline_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_MARIA_DB_PASSWORD';

GRANT ALL PRIVILEGES ON supplyLine_db.* TO 'supplyline_app'@'localhost';
GRANT ALL PRIVILEGES ON supplyLine_db.* TO 'supplyline_app'@'127.0.0.1';

FLUSH PRIVILEGES;
