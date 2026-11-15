# AKASHIC LIBRARY — PART I
# PHASE 6G: DEPLOYMENT AND RELEASE RUNBOOK

**Document Version:** 1.0.0-phase6g  
**Target Milestone:** Part I Production Release Preparation  
**Security Classification:** Operational Runbook (Zero Tracked Secrets)  

---

## SECTION A: DEPLOYMENT ARCHITECTURE

The Akashic Library Part I platform utilizes a **provider-neutral, same-origin reverse-proxy architecture**. This model eliminates CORS complexity, guarantees secure credentialed cookie transmission across API mutations, and cleanly isolates document persistence from relational identity data.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Internet / End Users                   │
                  └───────────────────────────┬────────────────────────────┘
                                              │ HTTPS (Port 443)
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │              Reverse Proxy / Web Server                │
                  │              (e.g., NGINX / Caddy / Traefik)           │
                  │                                                        │
                  │  • TLS Termination & HTTP/2                            │
                  │  • Static Asset Caching (/assets/*, cache immutable)   │
                  │  • SPA Root Fallback (/* -> index.html for ?view=...)  │
                  └───────────────┬────────────────────────┬───────────────┘
                                  │                        │
             Static File Serving  │                        │ Proxy Pass /api/
             (Pre-built React)    │                        │ (HTTP / Unix Socket)
                                  ▼                        ▼
                  ┌──────────────────────┐  ┌──────────────────────────────┐
                  │ Frontend SPA Assets  │  │ Production Django WSGI       │
                  │ (Vite Output: dist/) │  │ (Gunicorn Worker Cluster)    │
                  └──────────────────────┘  └──────────────┬───────────────┘
                                                           │
                                   ┌───────────────────────┴───────────────────────┐
                                   │ Private Internal VPC / Localhost Only         │
                                   ▼                                               ▼
                  ┌──────────────────────────────┐  ┌──────────────────────────────┐
                  │ PostgreSQL 14+               │  │ MongoDB 6.0+                 │
                  │ • Relational Identity (User) │  │ • Discovery Catalog (Books)  │
                  │ • Auth Sessions & Roles      │  │ • Reviews & Replies          │
                  │ • StoreProduct Catalog       │  │ • Annotations & Marginalia   │
                  │                              │  │ • Community Discussions      │
                  │                              │  │ • Moderation Reports & Audit │
                  └──────────────────────────────┘  └──────────────────────────────┘
```

### Outstanding Owner Decisions (Hosting Target Agnostic)
The application architecture is deliberately decoupled from proprietary hosting vendors. The project owner retains full autonomy over:
1. **Hosting Platform Selection:** Traditional Linux VM (Ubuntu/Debian with Systemd), Containerized Platform (Docker/Kubernetes), or Managed PaaS (e.g., Render, Railway, Fly.io, AWS ECS, GCP Cloud Run).
2. **Domain & DNS Registration:** Selection of production domain (e.g., `akashiclibrary.com`) and certificate authority (Let's Encrypt / Cloudflare).
3. **Database Hosting Topology:** Self-hosted managed containers vs. fully managed DB services (e.g., AWS RDS PostgreSQL + MongoDB Atlas).

---

## SECTION B: PREREQUISITES & SYSTEM REQUIREMENTS

| Component | Minimum Version | Verified Production Version |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu 22.04 LTS / Debian 12) or macOS (Dev) | POSIX-compliant x86_64 / arm64 |
| **Python** | 3.12+ (3.13 / 3.14 recommended) | Python 3.13.2 / 3.14.x |
| **Django** | 6.1.1+ | Django 6.1.3 |
| **Node.js** | 20.x LTS+ | Node v26.10.0 |
| **npm** | 10.x+ | npm 11.19.1 |
| **PostgreSQL** | 14.0+ | PostgreSQL 16+ |
| **MongoDB** | 6.0+ | MongoDB 7.0+ |
| **WSGI Server** | Gunicorn 21+ or uWSGI | Gunicorn 21.2.0 |
| **Reverse Proxy** | NGINX 1.22+ or Caddy 2+ | NGINX with TLS 1.3 |

---

## SECTION C: ENVIRONMENT CONFIGURATION SETUP

1. Clone or sync the verified repository working branch to the target deployment server.
2. Generate an isolated, secure production environment file at `Akashic_Library/.env`:
   ```bash
   cp Akashic_Library/.env.example Akashic_Library/.env
   chmod 600 Akashic_Library/.env
   ```
3. Populate all required secrets using a cryptographically secure random generator:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
4. Verify that `Akashic_Library/.env` is never world-readable and is ignored by version control.

---

## SECTION D: REPRODUCIBLE BUILD SEQUENCE

Execute the build sequence from the repository root:

```bash
# 1. Prepare Python Virtual Environment and Install Locked Dependencies
cd Akashic_Library
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Build React Frontend Production Bundle
cd ../frontend
npm ci
npm run typecheck
npm run lint
npm run build
cd ..
```

---

## SECTION E: DATABASE PREPARATION

All database operations must follow strict ordering to maintain referential integrity:

```bash
# 1. Execute PostgreSQL Relational Migrations
cd Akashic_Library
source venv/bin/activate
python manage.py migrate --settings=Akashic_Library.production_settings

# 2. Idempotently Initialize and Verify MongoDB Compound Indexes
python manage.py init_mongo_indexes --settings=Akashic_Library.production_settings
```

---

## SECTION F: STATIC FILES & REVERSE PROXY SERVING

```bash
# Collect Django administrative and DRF static assets
python manage.py collectstatic --noinput --settings=Akashic_Library.production_settings
```

### NGINX Configuration Reference (`/etc/nginx/sites-available/akashic`)
```nginx
server {
    listen 80;
    server_name akashic.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name akashic.example.com;

    ssl_certificate /etc/letsencrypt/live/akashic.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/akashic.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client body limit
    client_max_body_size 10M;

    # 1. React Frontend SPA static build
    root /var/www/akashic/frontend/dist;
    index index.html;

    # Hashed static assets — cache indefinitely
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA Root Fallback for query-parameter routing (/?view=...)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 2. Django Administrative Static Files
    location /static/ {
        alias /var/www/akashic/Akashic_Library/staticfiles/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # 3. API Reverse Proxy to Django Gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # 4. Django Admin Reverse Proxy
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## SECTION G: APPLICATION PROCESS MANAGEMENT (SYSTEMD)

Never use `manage.py runserver` in production. Run Gunicorn managed by Systemd:

### Systemd Service: `/etc/systemd/system/akashic-backend.service`
```ini
[Unit]
Description=Akashic Library Production Gunicorn Application Server
After=network.target postgresql.service mongod.service

[Service]
User=akashic
Group=akashic
WorkingDirectory=/var/www/akashic/Akashic_Library
EnvironmentFile=/var/www/akashic/Akashic_Library/.env
ExecStart=/var/www/akashic/Akashic_Library/venv/bin/gunicorn \
    --workers 4 \
    --worker-class gthread \
    --threads 2 \
    --bind 127.0.0.1:8000 \
    --access-logfile - \
    --error-logfile - \
    Akashic_Library.wsgi:application

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Commands to start and enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable akashic-backend
sudo systemctl start akashic-backend
sudo systemctl status akashic-backend
```

---

## SECTION H: HEALTH CHECKS & VERIFICATION

1. **Liveness Probe (Process Availability):**
   ```bash
   curl -i https://akashic.example.com/api/health/
   # Expected: HTTP 200 OK {"status": "ok", "service": "Akashic Library API"}
   ```
2. **Readiness Probe (PostgreSQL & MongoDB Connectivity):**
   ```bash
   curl -i https://akashic.example.com/api/health/ready/
   # Expected: HTTP 200 OK {"status": "ready", "databases": {"relational": "connected", "document": "connected"}}
   ```

---

## SECTION I: ORDERED PRODUCTION RELEASE CHECKLIST

- [ ] **Step 1: Code Baseline Certified:** Verify Git commit hash against approved release manifest.
- [ ] **Step 2: Environment Configured:** Verify `.env` contains valid production secrets and `DJANGO_DEBUG=False`.
- [ ] **Step 3: Database Backups Taken:** Execute PostgreSQL `pg_dump` and MongoDB `mongodump` prior to any release activity.
- [ ] **Step 4: Dependency Installation:** Run `pip install -r requirements.txt` and `npm ci`.
- [ ] **Step 5: Frontend Compilation:** Run `npm run build` in `frontend/`.
- [ ] **Step 6: Database Migrations:** Run `python manage.py migrate --settings=Akashic_Library.production_settings`.
- [ ] **Step 7: Mongo Index Initialization:** Run `python manage.py init_mongo_indexes --settings=Akashic_Library.production_settings`.
- [ ] **Step 8: Static Collection:** Run `python manage.py collectstatic --noinput --settings=Akashic_Library.production_settings`.
- [ ] **Step 9: Process Restart:** Reload Gunicorn workers via `sudo systemctl restart akashic-backend`.
- [ ] **Step 10: Health & Smoke Tests:** Query `/api/health/ready/` and verify Discovery, Login, and Personal Library workflows.

---

## SECTION J: ROLLBACK PROCEDURE

In the event of an unrecoverable failure during a release window:
1. **Stop Application Processes:**
   ```bash
   sudo systemctl stop akashic-backend
   ```
2. **Revert Frontend Assets:**
   Swap `frontend/dist` symlink to the previous verified release build directory.
3. **Revert Python Application Code:**
   Check out previous approved Git commit.
4. **Restore Database State (if migrations or writes modified data):**
   Follow the documented restoration steps in [PHASE_6G_DATABASE_BACKUP_AND_RECOVERY_RUNBOOK.md](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/PHASE_6G_DATABASE_BACKUP_AND_RECOVERY_RUNBOOK.md).
5. **Restart Application & Re-verify:**
   ```bash
   sudo systemctl start akashic-backend
   curl -i http://127.0.0.1:8000/api/health/ready/
   ```

---

## SECTION K: INCIDENT RESPONSE PROTOCOLS

| Incident Scenario | Diagnostic Action | Remediation Protocol |
| :--- | :--- | :--- |
| **Gunicorn Fails to Start** | `sudo journalctl -u akashic-backend -n 50 --no-pager` | Check for missing `DJANGO_SECRET_KEY` or invalid database connection settings in `.env`. |
| **502 Bad Gateway from NGINX** | `sudo nginx -t && sudo tail -n 50 /var/log/nginx/error.log` | Verify Gunicorn process is listening on `127.0.0.1:8000`. |
| **Database Readiness Failure (503)** | Query `/api/health/ready/` to identify failing tier (`relational` vs `document`). | Verify PostgreSQL service status (`systemctl status postgresql`) or MongoDB service status (`systemctl status mongod`). |
| **Authentication / CSRF Rejections (403)** | Check browser console for `CSRF verification failed`. | Verify `DJANGO_CSRF_TRUSTED_ORIGINS` contains the exact public HTTPS domain including scheme (`https://`). |
| **Stale Frontend Assets or White Screen** | Check HTTP response headers on `/index.html`. | Ensure NGINX serves `/index.html` with `Cache-Control: no-cache` while caching `/assets/*` with `immutable`. |
