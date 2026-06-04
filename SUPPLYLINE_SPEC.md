# Comprehensive Technical Specification: MySmartPlans SupplyLine (mspSupplyLine)

## 1. System & Architecture Overview
MySmartPlans SupplyLine is an autonomous asset catalog microservice. It operates on its own dedicated database instance (supplyLine_db) to ensure high-performance data isolation and future SaaS market portability. 

### Core Guardrails
* Decoupled Data Bridge: No direct SQL cross-database joins are allowed between external platforms (mspSaturn) and supplyLine_db. Communication occurs exclusively via application-level services using serialized JSON payloads.
* Namespacing: Every single database table utilizes the sl_ prefix to enforce isolation within database access code.
* Key Strategy: Identifiers leverage UUIDv4 (CHAR(36)) keys to ensure absolute uniqueness across platforms, with the exception of physical property/project containers (sl_Projects.ProjectID), which use an auto-incrementing INT.
* Universal Time: All temporal state properties (CreatedAt, UpdatedAt) are managed natively by the MariaDB engine and anchored strictly to UTC.

---

## 2. Technical Stack & Environment Layout

### Backend Environment
* Runtime / Framework: Node.js with TypeScript and Express.
* Database Driver / Data Access: Root connection pool built with mysql2/promise executing raw, highly optimized parameterized SQL statements (no heavy ORM abstractions).
* Data Types: Direct mapping of MariaDB native structures (e.g., streaming JSON types mapped to TypeScript typed objects).

### Target Directory Structure
mspSupplyLine/
├── config/
│   └── database.ts          # Dual-pool: supplyLine_db (primary) + mspSaturn read pool (SATURN_DB_*)
├── database/
│   └── migrations/
│       └── 001_init_supplyline.sql  # Complete relational architecture setup script
└── src/
    ├── controllers/         # Ingestion, validation, and dashboard route handlers
    ├── middleware/          # Strict Multi-Tenant Project Context Verification 
    ├── models/              # Clean TypeScript structural interfaces
    └── repositories/        # Parameterized data access layers

### 2.2 Industrial Design System Tokens

Permanent UI layout rulebook for the SupplyLine client. All views, shared primitives, and feature screens must conform to this **high-density industrial** contract. Deviations (large radii, generous padding, decorative whitespace) are out of spec unless explicitly approved.

#### Typography Baseline

**Single root contract** — enforced in [`client/src/index.css`](client/src/index.css). All views, shared primitives (`Button`, `Input`, `DiagnosticModal`), and feature screens inherit this baseline. Do **not** add ad-hoc font-size utilities (`text-xs`, `text-sm`, `text-[10px]`, …) or per-element slate shade utilities unless explicitly listed below.

| Root token | Value |
|------------|--------|
| Font family | **System sans-serif only** — one face everywhere: body copy, form controls, PIDs, SIDs, JSON `<pre>` blocks, stack traces, and diagnostic timestamps all use the same inherited stack (`ui-sans-serif`, system-ui, Segoe UI, Roboto, …). No alternate typefaces. |
| Font size | **`14px`** on `html` — all `div`, `span`, `p`, and form controls inherit via `font-size: inherit` |
| Default text color | **`slate-900`** (`var(--color-slate-900)`) on `html` |

| Role | Convention |
|------|------------|
| Default body, labels, metrics, metadata | Inherit root — **no** inline size or color utilities |
| Primary row identifiers (project name, manufacturer • model) | `font-semibold` only |
| Section / column headers (uppercase) | `uppercase tracking-wider` + `font-bold` or `font-semibold` — **no** `text-xs` |
| Dark sidebar section headers (`bg-slate-900`) | `font-bold uppercase tracking-wider text-slate-400`; operational accent headers (e.g. Staging Dock) may use `text-emerald-400` |
| Dark sidebar data labels / values | Explicit contrast overrides required: `text-slate-300` (labels), `text-slate-200` / `text-white` (values) — root `slate-900` is unreadable on dark panels |
| Status badges (light fill) | Structural classes + semantic text override, e.g. `text-emerald-700!` on `bg-emerald-50` |
| Semantic feedback on tinted surfaces | Use Tailwind **important** text utilities (`text-red-700!`, `text-emerald-700!`) to beat `color: inherit` on `button` / nested elements |
| Form labels | `.sl-input-label` — uppercase, `font-semibold`, inherits root size |
| Form section banners | `.sl-form-section-banner` — dark bar with `text-white!` on `bg-slate-800` |

**`Button` text:** Colored variants must bundle explicit `text-white!` (primary/success/danger) or locked slate shades (`text-slate-200!`, `text-slate-700!`) because global `button { color: inherit }` otherwise forces charcoal text on colored fills. See [`Button.tsx`](client/src/components/Common/Button.tsx).

#### Padding & Spacing Boundaries

Maximum panel inner padding is **`p-3`**. Prefer tighter when nested (`p-2`, `px-2 py-1.5`). Application shells use the spacious tier defined under **Premium Split-Panel View Architecture** (`space-y-6` between major regions).

* Grid and table layouts stay **dense**; avoid card stacks with large vertical gaps.
* No empty whitespace bloat: if a region has no content, collapse it; do not pad to “balance” the viewport.
* List/table row spacing uses compact gaps (`gap-1`, `gap-1.5`, `space-y-1`) unless a control requires touch targets.

#### Border and Component Radii

Border radius is locked to the sharp default: **`rounded`** (4px). **Do not** use `rounded-lg`, `rounded-xl`, or pill/full-radius on panels, cards, inputs, or buttons unless a one-off exception is documented in code review.

* Borders: muted **`border-slate-200/70`** (or `border-slate-200` where opacity is unsupported).
* Dividers and table chrome follow the same muted border token for visual consistency.

#### Color Alignment

Primary branding is tied strictly to the SupplyLine logo palette. Semantic color must not drift to generic grays or alternate brand hues.

| Semantic | Token | Usage |
|----------|--------|--------|
| Primary / normal operations | `bg-blue-600` (`hover:bg-blue-700`) | Default actions, navigation emphasis, platform workflows |
| Progression / success paths | `bg-emerald-600` (`hover:bg-emerald-700`) | Confirmations, promote/approve flows, positive completion |
| Alerts / attention | `border-l-2 border-amber-500` (soft amber left border) | Warnings, dependency notices, non-blocking alerts—pair with compact copy, not full amber backgrounds |

Ghost and secondary controls may use slate neutrals; primary and success buttons must use the blue/emerald pair above, not ad-hoc greens or indigos.

#### Premium Split-Panel View Architecture

Styling source of truth for authenticated application shells and complex workspaces. This layer sits above primitives (buttons, inputs, cards) and defines how full views are composed.

##### View Structure

* **Avoid uniform full-width card loops** on complex screens (Dashboard, Staging Dock, Catalog control surfaces). Do not stack equal-width cards in a repeating grid when the screen carries both primary operational data and secondary context.
* **Implement asymmetrical column splits** for multi-region workspaces:
  * **Primary column (~70%)** — ledger data matrix, project registry rows, staging intake queue, inventory tables.
  * **Context column (~30%)** — utility actions, filters, metadata summaries, impersonation controls, phase navigation, and scoped status panels.
* Reference layout: `grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-4` (or equivalent flex split). Mobile collapses to a single column with primary content first.

##### Dark-Panel Continuity

* Carry **`bg-slate-900`** depth from the Login brand editorial panel into **persistent navigation** and **primary header blocks** across the app.
* Dark panels use **`border-slate-800`**, white/slate-100 headings, and logo blue/emerald accents only—no ad-hoc indigo or decorative gradients on operational chrome.
* Light content canvases (`bg-slate-50`, `bg-white`) host forms and data grids; dark panels frame identity, wayfinding, and top-level operations context.

##### Typography & Spacing (Two-Tier Model)

| Tier | Scope | Convention |
|------|--------|------------|
| **Application shell** | Page wrappers, section stacks, split-panel gutters | **`space-y-6`** (or `gap-6`) between major regions; comfortable horizontal padding (`px-4`–`px-6` on large breakpoints). Shell copy **inherits root 14px** — no per-view size upscaling. |
| **Internal data grid** | Rows, cells, IDs, JSON keys inside ledgers | **Same 14px inherited baseline** as the shell. Density comes from compact **`p-2`–`p-3`** row padding and **`gap-1`–`gap-2`**, not smaller font sizes. Registry rows use `items-baseline` alignment. |

Shell spaciousness and grid compactness are **both required**—do not apply `space-y-6` inside ledger rows, and do not reintroduce micro type scales (`text-xs`, `text-[10px]`) for “density.”

---

### 2.3 Project Provisioning Pipeline

Unified **provisioning gate** for operational project containers (`sl_Projects`). Core **identity** and **project manager contact** fields are required at setup time; financial purchase-order data is optional. Provisioning is tenant-scoped: every row is owned by the authenticated user's **`ClientID`** (JWT / session — never accepted from the request body). Optional permanent linkage to mspSaturn uses `MspSaturnProjectRef` (INT, `UNIQUE`) with **no federated SQL** between databases (§1 decoupled bridge; §3.0 dual-pool).

| Deliverable | Route / surface | Implementation |
|-------------|-----------------|----------------|
| Provisioning gate | `POST /api/projects/` | [`projectController.ts`](server/src/controllers/projectController.ts) `postProject` |
| Saturn discovery | `GET /api/projects/saturn-available` | `getSaturnAvailableProjectsHandler` |
| Registry hydration | [`saturnProjectRegistryService.ts`](server/src/services/saturnProjectRegistryService.ts) | `getSaturnAvailableProjects`, `getSaturnProjectById` via `saturnQuery` |
| Atomic persist | [`ProjectRepository.ts`](server/src/repositories/ProjectRepository.ts) | `createProject` + `grantUserProjectAccess` in one transaction |
| Dashboard panel | [`DashboardView.tsx`](client/src/views/DashboardView.tsx) | Multi-section gate UI + client-side field validation |

**Route registration order:** Register `GET /saturn-available` **before** `/:projectId/...` so `saturn-available` is not captured as a `projectId`.

---

#### A. Strict Provisioning Gate (all inlets)

**Middleware:** `authenticateJwt` + platform provisioner RBAC (`MspAdmin`, `Admin`, `PIM`).

**Gate variables:**

| Domain | API fields (camelCase) | `sl_Projects` columns | Required |
|--------|------------------------|----------------------|----------|
| Identity | `projectName`, `projectAddress`, `projectCity`, `projectState`, `projectZip`, `countryCode` | `ProjectName`, `ProjectAddress`, `ProjectCity`, `ProjectState`, `ProjectZip`, `CountryCode` | Yes |
| Locale | `projectLocale` (default `en-US` if omitted) | `ProjectLocale` | No (default) |
| Financial | `fundingCompanyName`, `purchaseOrderNumber` | `FundingCompanyName`, `PurchaseOrderNumber` | No (`purchaseOrderNumber` optional) |
| Personnel | `projectManagerName`, `projectManagerEmail`, `projectManagerPhone` | `ProjectManagerName`, `ProjectManagerEmail`, `ProjectManagerPhone` | Name + email required; phone optional |
| Lifecycle | — (server-enforced) | `ProjectStatus` = `'Active'` on create | Yes (server) |
| Saturn bind | `mspSaturnProjectRef` (import inlet only) | `MspSaturnProjectRef` | Import only |

**Server processing (both inlets):**

1. Resolve `clientId` from session; reject body `clientId`.
2. If `mspSaturnProjectRef` present: `409 ConflictError` when ref already indexed (`listAssignedSaturnRefs` / `isSaturnRefAssigned`); hydrate missing identity/financial/personnel from Saturn registry (§2.3.C) then merge explicit body overrides.
3. Validate required gate fields; `400` on missing identity or PM contact (email shape, `countryCode` length 2). `purchaseOrderNumber` may be omitted or empty.
4. **Single transaction:** `createProject` → `grantUserProjectAccess` → commit.
5. Respond `201` with `project` object from `toProjectApiRecord` (camelCase).

---

#### B. Inlet 1 — Clean Slate (manual input)

Operator supplies the full gate payload manually. `mspSaturnProjectRef` omitted or `null`.

```json
{
  "projectName": "North Campus Expansion",
  "projectAddress": "1200 Industrial Blvd",
  "projectCity": "Kansas City",
  "projectState": "MO",
  "projectZip": "64108",
  "countryCode": "US",
  "fundingCompanyName": "Acme Development LLC",
  "purchaseOrderNumber": "PO-2026-0142",
  "projectManagerName": "Jordan Lee",
  "projectManagerEmail": "jordan.lee@example.com",
  "projectManagerPhone": "+18165550100"
}
```

---

#### C. Inlet 2 — Saturn Auto-Hydration (cross-table read)

**SupplyLine pass (primary pool):** `listAssignedSaturnRefs()` → `usedRefs[]`.

**Saturn pass (secondary pool only):** Optimized application-level JOIN (never inside `supplyLine_db`):

```sql
SELECT p.project_id, p.project_name, p.project_address, p.project_city, p.project_state,
       p.project_zip, p.project_country, p.project_status,
       p.project_billing, p.project_billing_email,
       gc.gc_name, gc.gc_email, gc.gc_phone
FROM projects p
LEFT JOIN general_contractors gc ON gc.gc_identifier = p.gc_identifier
WHERE LOWER(COALESCE(p.project_status, '')) <> 'archived'
  AND p.project_id NOT IN (/* usedRefs */)
ORDER BY p.project_name ASC;
```

**Hydration mapping (Saturn → gate → `sl_Projects`):**

| Saturn source | Gate field |
|---------------|------------|
| `project_name` | `projectName` |
| `project_address` | `projectAddress` |
| `project_city` / `project_state` / `project_zip` | `projectCity` / `projectState` / `projectZip` |
| `project_country` (normalized to ISO-2) | `countryCode` |
| `project_billing` | `fundingCompanyName` |
| `gc_name` / `gc_email` / `gc_phone` | `projectManagerName` / `projectManagerEmail` / `projectManagerPhone` |
| `project_id` | `mspSaturnProjectRef` |

`purchaseOrderNumber` is optional and not present in the Saturn registry — operator may supply it in the Dashboard when available.

**Duplicate guard:** Assigned `mspSaturnProjectRef` → **`409 ConflictError`** (no insert).

`GET /api/projects/saturn-available` returns hydrated candidate rows for the Dashboard selector. `POST` with `mspSaturnProjectRef` re-fetches via `getSaturnProjectById` for authoritative bind-time merge.

---

#### D. Dashboard Provisioning Panel (`DashboardView.tsx`)

High-density multi-section panel (§2.2: `p-3` max, `rounded`, `.sl-input` / `.sl-input-label` / `.sl-form-section-banner` / `.sl-form-section-grid`, shared `Button` primary/secondary — default `md` size).

| Section | Fields |
|---------|--------|
| Mode | **Clean Slate** vs **Saturn Import** (segmented `Button` controls) |
| Identity | `projectName`, `projectAddress`, `projectCity`, `projectState`, `projectZip`, `countryCode` |
| Financial | `fundingCompanyName`, `purchaseOrderNumber` (optional) |
| Personnel | `projectManagerName`, `projectManagerEmail`, `projectManagerPhone` |
| Saturn (import only) | `<select>` from `saturn-available`; selection hydrates form state |

**Client validation:** Submit disabled until core identity and project manager name/email (valid format) are present. Server remains authoritative.

**Failure UX:** `border-l-2 border-red-500` alert; preserve mode and field state.

---

#### E. Environment & Configuration

| Variable | Purpose |
|----------|---------|
| `SATURN_DB_*` | Read-only mspSaturn pool (`saturnQuery`) |
| `MARIA_DB_*` | supplyLine_db writes (`sl_Projects`, `sl_UserProjectAccess`) |

Migration: [`004_20250602_sl_projects_provisioning_gate.sql`](server/database/migrations/004_20250602_sl_projects_provisioning_gate.sql) — tracked in `sl_SchemaMigrations`.

---

#### F. Acceptance Criteria

- [ ] `POST /api/projects/` persists full gate schema with `ProjectStatus = Active` and session `ClientID`
- [ ] Duplicate `mspSaturnProjectRef` returns **409** without insert
- [ ] `GET /api/projects/saturn-available` anti-joins `usedRefs` via dual-pool reads only
- [ ] Saturn hydration uses JOIN across `projects` and `general_contractors`
- [ ] Dashboard panel validates all gate fields before enabling Create
- [ ] `npm run typecheck` passes in `client/` and `server/`
- [ ] No cross-database SQL joins (§1)

---

## 3. Definitive Relational Schema (supplyLine_db)

### 3.0 Database Schema Infrastructure (Dual-Pool Architecture)

SupplyLine runtime uses **two isolated MariaDB connection pools** in [`server/config/database.ts`](server/config/database.ts). This enforces the §1 decoupled data bridge: no federated SQL joins between databases.

| Pool | Module variable | Environment | Database | Usage |
|------|-----------------|-------------|----------|--------|
| **Primary** | `supplylinePool` | `MARIA_DB_*` | `supplyLine_db` | All `sl_*` writes and SupplyLine-native reads (`query`, `execute`, `getConnection`) |
| **Saturn read** | `saturnPool` | `SATURN_DB_*` | `mspsaturn` (legacy) | Read-only historical registry lookups (`saturnQuery`, `getSaturnConnection`) |

**Lazy initialization:** `saturnPool` is created on first Saturn access via `getSaturnPool()` / `getSaturnConnection()`. If `SATURN_DB_*` variables are missing, `readSaturnDbConfig()` returns `null`, `isSaturnPoolConfigured()` is `false`, and the API must not call Saturn helpers (prevents boot crashes when Saturn env is absent).

**Decoupled bridge (project sync, §2.3):**

1. **Local pass (primary pool):** Load assigned references from `sl_Projects.MspSaturnProjectRef` in `supplyLine_db`.
2. **Saturn pass (secondary pool):** Query mspSaturn `projects` with anti-join semantics (`NOT IN` / equivalent LEFT JOIN exclusion) using only `saturnQuery` — never in the same SQL statement as `sl_*` tables.
3. **Write path:** New `sl_Projects` rows and `sl_UserProjectAccess` grants use the **primary pool only**.

**Exports (Saturn):** `isSaturnPoolConfigured()`, `initSaturnPool()`, `getSaturnPool()`, `getSaturnConnection()`, `saturnQuery()`, `closeSaturnPool()`.

**Connection limits:** Primary `DB_POOL_LIMIT` (default 10); Saturn `SATURN_DB_POOL_LIMIT` (default 5). Both pools set session `time_zone = '+00:00'` on connect.

---

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
    PrimaryContactPhone VARCHAR(50) NULL,  -- E.164 international standard (+1...)
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

CREATE TABLE sl_Users (
    UserID CHAR(36) NOT NULL PRIMARY KEY,
    ClientID CHAR(36) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FirstName VARCHAR(100) NULL,
    LastName VARCHAR(100) NULL,
    PreferredLocale VARCHAR(10) DEFAULT 'en-US', -- Drives regional formatters on UI
    Role ENUM('SuperAdmin', 'PIM', 'ClientAdmin', 'FacilityViewer') DEFAULT 'FacilityViewer',
    IsActive TINYINT(1) DEFAULT 1,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ClientID) REFERENCES sl_Clients(ClientID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Multi-Tenant Security Fence table
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
    OriginalRawData JSON NULL, -- Intact source payload for PIM reference/audit
    ReviewStatus ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    CreatedBy CHAR(36) NOT NULL, -- UserID (UUID) of executing worker/PIM
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
    Translations JSON NULL, -- Multilingual dictionary format: {"es": "Plomería", "fr": "Plomberie"}
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_MasterCatalog (
    ItemID CHAR(36) NOT NULL PRIMARY KEY,
    Manufacturer VARCHAR(255) NOT NULL,
    ModelNumber VARCHAR(255) NOT NULL,
    ItemDescription TEXT NULL,
    CategoryID CHAR(36) NULL,
    Specs JSON NULL, -- Flexible attribute bucket (Voltage, dimensional data, tonnage)
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_mfg_model (Manufacturer, ModelNumber),
    FOREIGN KEY (CategoryID) REFERENCES sl_Categories(CategoryID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_ProjectInventory (
    InventoryID CHAR(36) NOT NULL PRIMARY KEY,
    ProjectID INT NOT NULL, -- Core authorization verification boundary
    ItemID CHAR(36) NOT NULL,
    Quantity INT DEFAULT 1,
    LocationInBuilding VARCHAR(255) NOT NULL, -- Real-world destination (e.g., "7th Floor Breakroom")
    SourceDocumentPath VARCHAR(512) NULL, -- Production asset path for spec sheet PDFs/Warranties
    InstallDate DATE NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectID) REFERENCES sl_Projects(ProjectID),
    FOREIGN KEY (ItemID) REFERENCES sl_MasterCatalog(ItemID),
    INDEX idx_project_item (ProjectID, ItemID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_CatalogRelationships (
    RelationshipID CHAR(36) NOT NULL PRIMARY KEY,
    PrimaryItemID CHAR(36) NOT NULL,
    RelatedItemID CHAR(36) NOT NULL,
    RelationType ENUM('RequiredForInstall', 'OptionalUpgrade', 'DirectSubstitute') DEFAULT 'RequiredForInstall',
    Notes VARCHAR(255) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PrimaryItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE,
    FOREIGN KEY (RelatedItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sl_CatalogPricing (
    PricingID CHAR(36) NOT NULL PRIMARY KEY,
    ItemID CHAR(36) NOT NULL,
    ManufacturerURL VARCHAR(512) NULL,
    EstimatedUnitPrice DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    CurrencyCode CHAR(3) NOT NULL DEFAULT 'USD',
    EstimatedLeadTimeDays INT DEFAULT 0,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ItemID) REFERENCES sl_MasterCatalog(ItemID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

---

## 4. Operational Requirements & Programmatic Logic

### A. Context-Enforced Multi-Tenancy Middleware
Every API path accessing or manipulating catalog inventories must inject strict multi-tenant evaluation validation. The application runtime must extract the requesting identity context, intercept the parameter payload execution, and verify database mapping access:

SELECT 1 FROM sl_UserProjectAccess 
WHERE UserID = ? AND ProjectID = ? 
LIMIT 1;

If an intersection record is absent, the execution lifecycle terminates instantly with an explicit unauthorized exception to protect property records from cross-tenant visibility.

### B. Bulk Intake Extraction Parser
The file parsing application routine maps intake sources into `sl_Staging` via the Phase 5 contracts: **§5.1** (tabular CSV/Excel) and **§5.2** (Original PDF Submittal drawing-sheet rows). Both paths use `POST projects/:projectId/staging` → transactional batch insert. Each row is stored with `ReviewStatus = Pending`, `SourceType = ExternalImport`, the acting user UUID in `CreatedBy`, and `OriginalRawData` for audit (tabular: keyed source row; PDF: verbatim `rawRow` string per §5.2.B).

### C. HITL Staging Gatekeeper Promotion Flow
When a PIM pushes an adjustment or verifies an onboarding inventory block, the transaction commits atomically:
1. Verify if the target string combination (Manufacturer + ModelNumber) exists inside sl_MasterCatalog.
2. If absent: generate a fresh item identifier UUID, record the global spec schema row line, and inherit that identity string. If present: directly capture the active matching ItemID.
3. Generate a clean warehouse instance entry inside sl_ProjectInventory hard-bound to the localized asset container property context (ProjectID).
4. Update the processing status flag inside sl_Staging to Approved.

---

## 5. Phase 5 — Staging Intake (Implementation Contract)

Phase 5 delivers end-to-end **file ingestion** into the human-in-the-loop staging layer (`sl_Staging`, §3.2). Work is split across a **server batch-insert API** and a **client intake surface** inside the Staging Queue. Both halves are mandatory; neither may ship without the other.

| Deliverable | Location | Status |
|-------------|----------|--------|
| Server ingestion API | `POST projects/:projectId/staging` | Required |
| Staging list (existing) | `GET projects/:projectId/staging` | Implemented |
| Client intake + parser (tabular) | `client/src/views/StagingQueueView.tsx` (+ `stagingIngestParser.ts`) | Required — §5.1 |
| PDF submittal pipeline | Drawing-sheet parser → same `POST` contract | Required — §5.2 |
| Post-ingest UX | Emerald success banner + ledger refresh | Required |

All routes run behind **§4.A** project-access middleware (`verifyProjectAccess`). Only platform roles (`SuperAdmin`, `PIM`) may invoke staging write operations; client preview / `FacilityViewer` paths remain read-only or hidden per existing RBAC.

**Ingestion schema rulebook:** §5.1 governs tabular CSV/Excel intake; §5.2 governs **Original PDF Submittal** drawing-sheet rows. Both converge on the same `sl_Staging` PascalCase columns and `POST projects/:projectId/staging` API envelope (`{ items: [...] }` with camelCase JSON keys mapping to DB columns per tables below).

---

### 5.1 File Ingestion Requirements

Authoritative contract for catalog file intake. Supersedes any informal `/staging/ingest` naming; the canonical write path is **`POST projects/:projectId/staging`**.

#### A. Server Ingestion Target

**Route:** `POST /api/projects/:projectId/staging`  
**Middleware stack:** JWT auth → `verifyProjectAccess` (projectId from route) → controller → repository.

**Request body (JSON):**

```json
{
  "items": [
    {
      "manufacturer": "Acme HVAC",
      "modelNumber": "RTU-9000",
      "quantity": 2,
      "locationInBuilding": "Roof — North wing",
      "categoryName": "Rooftop Units",
      "description": "Optional line notes",
      "externalRecordRef": "ROW-42",
      "originalRawData": { "Manufacturer": "Acme HVAC", "Qty": "2" }
    }
  ]
}
```

| Field | Required | Validation | `sl_Staging` column |
|-------|----------|------------|---------------------|
| `manufacturer` | Yes | Non-empty trimmed string | `Manufacturer` |
| `modelNumber` | Yes | Non-empty trimmed string | `ModelNumber` |
| `quantity` | Yes | Integer ≥ 1; default `1` if omitted at parse time only when file column blank | `Quantity` |
| `locationInBuilding` | Yes | Non-empty trimmed string | `LocationInBuilding` |
| `categoryName` | No | Trimmed string or null | `CategoryName` |
| `description` | No | Trimmed string or null | `Description` |
| `externalRecordRef` | No | Trimmed string or null | `ExternalRecordRef` |
| `originalRawData` | No | JSON object; server may set from source row if client omits | `OriginalRawData` |

**Server processing rules:**

1. Reject empty `items` arrays with `400 Bad Request`.
2. Validate **every** element; on first failure return `400` with a row-indexed message (e.g. `Item at index 3: manufacturer is required`).
3. For each valid item, **batch-insert** into `sl_Staging` under the scoped `ProjectID` from the route:
   * `StagingID` — new UUIDv4
   * `ProjectID` — from `:projectId`
   * `SourceType` — `'ExternalImport'`
   * `ReviewStatus` — `'Pending'`
   * `CreatedBy` — authenticated `UserID` from JWT
   * Mapped fields per table above
4. Use a **single transaction** for the batch; roll back entirely on any insert failure.
5. **Response `201 Created`:**

```json
{
  "inserted": 12,
  "stagingIds": ["uuid", "..."]
}
```

**Implementation files (server):**

* `server/src/routes/projectRoutes.ts` — register `POST /:projectId/staging` beside existing GET
* `server/src/controllers/stagingController.ts` — `postProjectStaging` handler
* `server/src/repositories/StagingRepository.ts` — `insertStagingBatch(projectId, createdBy, items)`

---

#### B. Client Intake Component

**Primary view:** `client/src/views/StagingQueueView.tsx`  
**Parser (recommended extraction):** `client/src/utils/stagingIngestParser.ts` — keeps the view orchestration-only.

**Layout placement:** Inside the main staging **ledger `Card`** (`noBodyPadding`), **immediately above** the `divide-y` row list—same structural pattern as `CatalogView` ledger chrome. Not modal-first.

**Visual contract (§2.2):**

* **Drag-and-drop zone** plus hidden file input fallback (`accept`: `.csv`, `.xlsx`, `.xls`)
* Inherits root typography; maximum inner padding **`p-3`**
* `rounded border border-dashed border-slate-300`
* Compact trigger: **“Select Catalog File”** (inherits root size)
* While parsing or POSTing: inline **micro-`Spinner`** and disabled drop zone
* Drag-over state: subtle `bg-slate-50` highlight (no large radii)

**Supported file formats:** CSV (UTF-8, header row required) and Excel (`.xlsx` / `.xls` via client parser dependency).

**Header alias matrix (case-insensitive, first match wins):**

| Canonical field | Accepted column headers |
|-----------------|-------------------------|
| `manufacturer` | `manufacturer`, `mfr`, `mfg`, `make` |
| `modelNumber` | `model`, `model number`, `modelnumber`, `model #`, `sku` |
| `quantity` | `quantity`, `qty`, `count` |
| `locationInBuilding` | `location`, `location in building`, `locationinbuilding`, `room`, `area` |
| `categoryName` | `category`, `category name`, `categoryname` |
| `description` | `description`, `desc`, `notes` |
| `externalRecordRef` | `external ref`, `externalrecordref`, `ref`, `row id`, `id` |

**Client validation (before POST):**

* At least one data row after header
* All four required fields populated per row (trimmed non-empty; `quantity` coerced to integer ≥ 1)
* Failures: inline alert in the zone — `border-l-2 border-amber-500` for warnings, `border-l-2 border-red-500` for blocking errors

**Payload mapping:** Parsed rows → `StagingIngestItem[]` using **exact server keys** (`manufacturer`, `modelNumber`, `quantity`, `locationInBuilding`, optional fields). Attach `originalRawData` as the raw keyed object from the source row when available.

**Transmit:** `fetchWrapper` `POST` to `projects/${projectId}/staging` with body `{ items: [...] }`. No raw `fetch`. Surface `FetchWrapperError.message` on failure.

---

#### C. Flow Integration

On **successful `POST`** (`201`):

1. **Emerald progress banner** — dismissible or auto-clear after ~5s:
   * `rounded border-l-2 border-emerald-600 bg-emerald-50/60 px-2 py-1.5 text-emerald-900!`
   * Copy example: `Imported {inserted} item(s) into the staging queue.`
2. **Refresh ledger** — re-invoke the same loader used on mount: `GET projects/:projectId/staging`, replace local `staging` state.
3. Reset file input / drag state; clear parse errors.

On **failure:** keep banner hidden; show zone-level error; do not clear the ledger.

**State extraction (client):** Refactor `loadStaging` out of `useEffect` into a named `refreshStaging()` callable from `handleFileIngestion` after POST success.

---

#### D. Acceptance Criteria (Phase 5 complete when all pass)

- [ ] `POST projects/:projectId/staging` inserts N rows into `sl_Staging` with `ReviewStatus = Pending`, `SourceType = ExternalImport`
- [ ] Invalid payloads return `400` without partial inserts (transactional batch)
- [ ] Staging Queue shows drag-and-drop + file picker conforming to §2.2 density tokens
- [ ] CSV and Excel sample files ingest and appear in the ledger after refresh
- [ ] Success path shows emerald banner and updated row count
- [ ] Unauthorized / wrong-project requests return `401` / `403` per existing middleware
- [ ] `npm run typecheck` passes in `client/` and `server/`

---

### 5.2 Original PDF Submittal Pipeline

Permanent ingestion schema rulebook for **drawing-sheet / submittal PDF** extraction. Every parsed document item row MUST persist into **`sl_Staging`** using the exact PascalCase column names defined in §3.2 (`001_init_supplyline.sql`). No alternate staging tables, no camelCase column names at the database layer.

**Write path:** Same as §5.1 — transactional batch insert via `POST /api/projects/:projectId/staging` (repository: `insertStagingBatch`). JSON request keys remain camelCase; the server maps them to PascalCase `sl_Staging` columns on insert.

#### A. Target DB Column Mapping (Document → `sl_Staging`)

For each item row extracted from a submittal PDF or drawing sheet, map document semantics to **`sl_Staging`** as follows:

| Document field (extracted) | `sl_Staging` column | SQL type | Required on insert |
|----------------------------|---------------------|----------|-------------------|
| Submittal Number | `ExternalRecordRef` | `VARCHAR(255)` | No — NULL when absent |
| Spec Division Title | `CategoryName` | `VARCHAR(255)` | No — NULL when absent |
| Fabricator Vendor | `Manufacturer` | `VARCHAR(255)` | Yes — non-empty trimmed string |
| Drawing Mark / SKU | `ModelNumber` | `VARCHAR(255)` | Yes — non-empty trimmed string |
| Profile Details | `Description` | `TEXT` | No — NULL when absent |
| Assembly Count | `Quantity` | `INT` | Yes — integer ≥ 1; default `1` when count missing or unparsable only at parser discretion before validation |

**Columns not sourced from PDF row text** (set by system / route context, not by document field labels):

| `sl_Staging` column | Source | Value |
|---------------------|--------|--------|
| `StagingID` | Server | New UUIDv4 (`CHAR(36)`) per row |
| `ProjectID` | Route | `:projectId` from `POST projects/:projectId/staging` |
| `LocationInBuilding` | Optional context | `VARCHAR(255)` — NULL unless sheet-level or project-level location is supplied outside the row mapping (not part of the six document fields above) |
| `SourceType` | System | **`'ExternalImport'`** (strict; never `InternalProject` for this pipeline) |
| `ReviewStatus` | System | **`'Pending'`** (strict on insert) |
| `CreatedBy` | Session | Authenticated user **`UserID`** UUID string (`CHAR(36)`) from JWT |
| `CreatedAt` / `UpdatedAt` | MariaDB | `TIMESTAMP` defaults (UTC session per pool config) |

**JSON POST item shape** (camelCase API keys → PascalCase DB columns):

```json
{
  "items": [
    {
      "externalRecordRef": "SUB-2024-0142",
      "categoryName": "Division 08 — Openings",
      "manufacturer": "Pacific Metal Fab",
      "modelNumber": "HM-440-A",
      "description": "14ga hollow metal frame, 3-sided profile",
      "quantity": 12,
      "originalRawData": {
        "rawRow": "SUB-2024-0142 | Division 08 — Openings | Pacific Metal Fab | HM-440-A | 14ga hollow metal frame, 3-sided profile | Qty: 12"
      }
    }
  ]
}
```

#### B. Raw Auditing (`OriginalRawData`)

The **`OriginalRawData`** column (`JSON NULL`) MUST capture audit fidelity for every PDF-derived row:

1. Store the **raw, unformatted string row** exactly as extracted from the drawing sheet (single-line or block text prior to normalization), keyed at minimum as:
   * `"rawRow": "<verbatim extracted string>"`
2. Optional: include parser metadata siblings (e.g. `sheetNumber`, `pageIndex`, `extractorVersion`) as additional JSON keys — these MUST NOT replace `rawRow`.
3. Do **not** overwrite `rawRow` with normalized or mapped values; mapped values live only in `ExternalRecordRef`, `CategoryName`, `Manufacturer`, `ModelNumber`, `Description`, and `Quantity`.

Example persisted JSON:

```json
{
  "rawRow": "SUB-2024-0142  DIV 08  PACIFIC METAL FAB  HM-440-A  14ga HM frame 3-side  QTY 12",
  "pageIndex": 4,
  "sheetId": "A-501"
}
```

#### C. System Attributes (Non-Negotiable)

On every PDF submittal insert, the following **`sl_Staging`** attributes are fixed by the platform — parsers and clients MUST NOT send alternate values:

| Column | Required value |
|--------|----------------|
| `SourceType` | `'ExternalImport'` |
| `ReviewStatus` | `'Pending'` |
| `CreatedBy` | Session user UUID (`sl_Users.UserID` / JWT `sub`) |

`StagingID` is server-generated. `ProjectID` is route-scoped. PIM promotion (§4.C) is the only path that later sets `ReviewStatus` to `'Approved'` or `'Rejected'`.

#### D. Validation (PDF pipeline)

Before `POST`:

* `Manufacturer` and `ModelNumber` MUST be present after trim (mapped from Fabricator Vendor and Drawing Mark/SKU).
* `Quantity` MUST be integer ≥ 1.
* `externalRecordRef`, `categoryName`, `description` may be omitted or null when the extractor finds no value.
* `originalRawData.rawRow` MUST be present for every item (non-empty string).

Server-side validation in `postProjectStaging` (§5.1) remains authoritative; PDF parsers MUST produce payloads that pass the same `items[]` contract.

#### E. Cross-Reference: Full `sl_Staging` DDL

```sql
-- §3.2 / 001_init_supplyline.sql (abbreviated)
StagingID CHAR(36) PK,
ProjectID INT NOT NULL,
SourceType ENUM('InternalProject','ExternalImport') NOT NULL,
ExternalRecordRef VARCHAR(255) NULL,
CategoryName VARCHAR(255) NULL,
Manufacturer VARCHAR(255) NULL,
ModelNumber VARCHAR(255) NULL,
Description TEXT NULL,
LocationInBuilding VARCHAR(255) NULL,
Quantity INT DEFAULT 1,
OriginalRawData JSON NULL,
ReviewStatus ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
CreatedBy CHAR(36) NOT NULL,
CreatedAt TIMESTAMP,
UpdatedAt TIMESTAMP
```

#### F. Acceptance Criteria (§5.2)

- [ ] PDF/drawing parser maps all six document fields to the correct `sl_Staging` PascalCase columns per table in §5.2.A
- [ ] Each inserted row includes `OriginalRawData.rawRow` with verbatim sheet text
- [ ] Every row inserts with `SourceType = ExternalImport`, `ReviewStatus = Pending`, `CreatedBy` = session UUID
- [ ] Rows reach `sl_Staging` only through `POST projects/:projectId/staging` transactional batch insert
- [ ] TypeScript ingest DTOs (`StagingIngestInput` / client `StagingIngestItem`) align with camelCase keys listed in §5.2.A JSON example

---

## 6. Phase 1 Implementation Goals
1. Establish the dual-pool database connection layer in [`server/config/database.ts`](server/config/database.ts): primary `supplylinePool` (`MARIA_DB_*`) and lazy `saturnPool` (`SATURN_DB_*`), each initializing `SET time_zone = '+00:00'` on connection.
2. Produce and run the complete database migration setup using clean, production-ready InnoDB engine properties.
3. Scaffold clean TypeScript structural definitions, data models, and parameterized database query engines handling localized context routing boundaries.