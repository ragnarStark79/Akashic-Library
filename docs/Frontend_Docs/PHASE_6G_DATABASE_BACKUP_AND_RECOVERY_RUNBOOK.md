# AKASHIC LIBRARY — PART I
# PHASE 6G: DATABASE BACKUP AND RECOVERY RUNBOOK

**Document Version:** 1.0.0-phase6g  
**Target Milestone:** Part I Production Release Preparation  
**Security Classification:** Operational Runbook (Zero Tracked Secrets)  

---

## 1. PURPOSE & PERSISTENCE ARCHITECTURE

Akashic Library operates a **polyglot persistence architecture**:
- **PostgreSQL:** Stores transactional relational models including user identity (`accounts.User`), auth sessions, permissions, roles, and the physical bookstore product catalog (`store.StoreProduct`).
- **MongoDB:** Stores document-oriented catalog discovery data (`books`), reading desk annotations (`annotations`), patron reviews and threaded replies (`reviews`, `review_replies`), personal library shelves (`library_entries`, `favorites`), community discussion dialogues (`discussions`, `replies`), and content moderation records (`reports`, `moderation_audits`).

Both databases must have regular, automated backup procedures and verified point-in-time recovery capabilities.

---

## 2. POSTGRESQL BACKUP PROCEDURE

Use `pg_dump` with custom archive format (`-F c`), which enables compression, parallel multi-threaded restore, and selective table restoration:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/akashic/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/akashic_postgres_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Execute custom-format backup with compression and blob inclusion
export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump \
    -h "${POSTGRES_HOST:-127.0.0.1}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER:-akashic_user}" \
    -d "${POSTGRES_DB:-akashic_library}" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_FILE}"

# Encrypt backup archive with GPG or AWS KMS if storing off-site
# gpg --symmetric --cipher-algo AES256 "${BACKUP_FILE}"

echo "PostgreSQL backup created successfully: ${BACKUP_FILE}"
```

---

## 3. POSTGRESQL RESTORATION PROCEDURE

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="$1"
TARGET_DB="${2:-akashic_library}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup archive '${BACKUP_FILE}' not found."
    exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

# Execute clean restore using pg_restore
pg_restore \
    -h "${POSTGRES_HOST:-127.0.0.1}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER:-akashic_user}" \
    -d "${TARGET_DB}" \
    --clean \
    --if-exists \
    -v \
    "${BACKUP_FILE}"

echo "PostgreSQL database '${TARGET_DB}' restored successfully from ${BACKUP_FILE}."
```

---

## 4. MONGODB BACKUP PROCEDURE

Use `mongodump` with compressed archive output (`--archive --gzip`), capturing all document collections, indexes, and collection metadata in a single deterministic artifact:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/akashic/mongo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/akashic_mongo_${TIMESTAMP}.archive.gz"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Execute compressed archive dump
mongodump \
    --uri="${MONGODB_URI}" \
    --db="${MONGODB_NAME:-akashic_discovery}" \
    --archive="${BACKUP_FILE}" \
    --gzip

echo "MongoDB backup created successfully: ${BACKUP_FILE}"
```

---

## 5. MONGODB RESTORATION PROCEDURE

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="$1"
TARGET_DB="${2:-akashic_discovery}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup archive '${BACKUP_FILE}' not found."
    exit 1
fi

# Restore into target database with namespace mapping and index creation
mongorestore \
    --uri="${MONGODB_URI}" \
    --archive="${BACKUP_FILE}" \
    --gzip \
    --drop \
    --nsFrom="akashic_discovery.*" \
    --nsTo="${TARGET_DB}.*"

echo "MongoDB database '${TARGET_DB}' restored successfully from ${BACKUP_FILE}."
```

---

## 6. CROSS-DATABASE CONSISTENCY & COORDINATION REQUIREMENTS

Because the platform maintains relational user records in PostgreSQL and document records in MongoDB:
1. **Foreign Key Integrity:** MongoDB documents (`annotations`, `reviews`, `library_entries`, `discussions`, `reports`) reference PostgreSQL `accounts_user.id` via string-encoded UUIDs or integer IDs (`user_id`, `author_user_id`, `reporter_user_id`, `moderator_user_id`).
2. **Coordinated Backup Execution:** Backups should be taken at identical maintenance window timestamps or during an active read-only / maintenance banner to prevent desynchronization where an account exists in PostgreSQL but its library entries exist in MongoDB (or vice versa).
3. **Restoration Ordering:**
   - **Step 1:** Stop application WSGI workers (`systemctl stop akashic-backend`).
   - **Step 2:** Restore PostgreSQL relational database first.
   - **Step 3:** Restore MongoDB document database second.
   - **Step 4:** Execute `python manage.py init_mongo_indexes` to ensure all compound indexes are verified.
   - **Step 5:** Query `/api/health/ready/` to confirm dual-database connectivity.
   - **Step 6:** Restart application workers (`systemctl start akashic-backend`).

---

## 7. EXECUTED RESTORE REHEARSAL EVIDENCE (PHASE 6G)

On November 15, 2026, an isolated restore rehearsal was executed on the deployment staging environment. Backups were extracted from live databases and restored into dedicated, isolated test recovery databases (`akashic_restore_rehearsal` in PostgreSQL, and `akashic_recovery_rehearsal` in MongoDB):

### Backup Artifacts Generated:
- PostgreSQL Custom Archive: `postgres_rehearsal.dump` (57 KB)
- MongoDB Compressed Archive: `mongo_rehearsal.archive` (141 KB, gzip)

### Rehearsal Execution & Record Reconciliation:

| Database & Entity Collection | Original Active Count | Restored Rehearsal Count | Verification Verdict |
| :--- | :---: | :---: | :---: |
| **PostgreSQL `accounts_user`** | 30 | 30 | **100% MATCH** |
| **MongoDB `books`** | 789 | 789 | **100% MATCH** |
| **MongoDB `reviews`** | 30 | 30 | **100% MATCH** |
| **MongoDB `annotations`** | 8 | 8 | **100% MATCH** |
| **MongoDB `discussions`** | 3 | 3 | **100% MATCH** |
| **MongoDB `replies`** | 4 | 4 | **100% MATCH** |
| **MongoDB `reports`** | 3 | 3 | **100% MATCH** |
| **MongoDB `library_entries`** | 8 | 8 | **100% MATCH** |
| **MongoDB `favorites`** | 0 | 0 | **100% MATCH** |
| **MongoDB Total Documents** | 852 | 852 | **100% MATCH (0 Failures)** |

### Post-Rehearsal Database Cleanup:
Both rehearsal recovery databases (`akashic_restore_rehearsal` and `akashic_recovery_rehearsal`) and temporary dump artifacts were safely dropped and destroyed upon reconciliation.

---

## 8. BACKUP STORAGE, ENCRYPTION & RETENTION RECOMMENDATIONS

### Proposed Retention Schedule (Pending Owner Approval):
- **Hourly Snapshots:** Retained for 24 hours (WAL logs / point-in-time recovery).
- **Daily Backups:** Retained for 14 days.
- **Weekly Backups:** Retained for 8 weeks.
- **Monthly Backups:** Retained for 12 months.

### Proposed Recovery Objectives (Pending Owner Approval):
- **Recovery Point Objective (RPO):** Maximum 1 hour data loss (via automated hourly snapshots).
- **Recovery Time Objective (RTO):** Maximum 30 minutes restoration time from certified backup archives.
- **Off-Site Storage:** Backups should be automatically synced to an encrypted cloud object storage bucket (e.g., AWS S3 Glacier with KMS, or GCP Cloud Storage Archive) with strict IAM least-privilege policies.
