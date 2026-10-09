<<<<<<< HEAD
# 🚀 Hostinger Deployment & Live Setup Guide
**Woodex Interior Architecture Platform (v2.5 Pro)**  
**Target Host:** Hostinger Business / Cloud Web Hosting (LiteSpeed / Apache + PHP 8.1 / 8.2)

---

## 📦 Master Package Information
* **Primary Deployment Archive**: `woodex-live-P23/woodex-live-p23.zip` (**27.27 MB**)
* **Direct HTTPS Download Link**:  
  [`https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-P23/woodex-live-p23.zip`](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-P23/woodex-live-p23.zip)
* **Archive Integrity Check**: Pre-verified with all 153 HTML pages, assets, fonts, responsive templates, Preline Pro Admin suite, and pre-seeded database.

---

## ⚡ 3-Step Instant Hostinger Installation

### Step 1: Upload and Extract ZIP to `public_html/`
1. Log into your **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Navigate to **Websites** → Select your domain → Open **File Manager**.
3. Go into the `public_html/` directory.
4. Click **Upload** → Select `woodex-live-p23.zip`.
5. Right-click `woodex-live-p23.zip` → Select **Extract** → Choose current directory (`public_html/`).
6. *Optional*: Delete the `.zip` file after extraction to free up disk space.

---

### Step 2: Verify PHP Version & Directory Permissions
* Ensure your domain is set to **PHP 8.1** or **PHP 8.2** (Hostinger default is 8.1/8.2).
* Ensure directory permissions:
  * `_private/` → `755` (or `700`) — Note: `.htaccess` inside `_private/` automatically blocks all direct web access.
  * `assets/uploads/` → `755` (writable for photo uploads in Media & Builder).
  * `_private/admin-db.json` → `644` (writable by PHP process).

---

### Step 3: Access Admin Portal & Sign In
1. Visit: `https://yourdomain.com/admin/`
2. Use any of the pre-configured credentials below or click any **Quick Demo Access** button:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Master Administrator** | `master@woodex.pk` | `Woodex@2026` | Full Control (Users, Backups, Approvals, Settings) |
| **📐 Studio Manager** | `manager@woodex.pk` | `Woodex@2026` | Architecture, Sales, Content, Telegram & WhatsApp |
| **💻 Lead Developer** | `developer@woodex.pk` | `Woodex@2026` | Page Builder, Hero Slides, SEO Agent, Media |
| **💼 Sales Director** | `sales@woodex.pk` | `Woodex@2026` | Inquiries, Quotes, Invoices, Client CRM, Live Chat |
| **🎧 Customer Support** | `support@woodex.pk` | `Woodex@2026` | Live Chat Inbox, WhatsApp Messages, Client Updates |

*(Secondary password accepted across all accounts: `WoodexAdmin@2026!`)*

---

## 🛡️ Security & Environment Specifications
* **Google Verification**: Verified file `google0b104c3cfb7a4943.html` is pre-placed at the root.
* **HTTPS & SEO Canonicalization**: Root `.htaccess` automatically enforces HTTPS and redirects `www` to non-www.
* **AI Agent & MCP Bridge**: Endpoint at `https://yourdomain.com/api/mcp.php` accepts `Authorization: Bearer <token>` for external LLM connectors (Claude Desktop, ChatGPT).
* **2-Way Telegram Webhook**: Webhook endpoint at `https://yourdomain.com/api/tg-webhook.php` for direct lead updates from Telegram.
=======
# Woodex Architecture & Luxury Interior — Hostinger Production Deployment Guide

**Target Domain:** `woodex.com.pk`  
**Package:** `woodex-live-p23.zip` (27.28 MB) / `woodex-master-P22.1.zip` (27.28 MB)  
**Compatibility:** Hostinger PHP 8.1 / 8.2 / 8.3 + MySQL 8.0 / MariaDB 10.3+  

---

## Direct GitHub Download Links

| Package | Direct Download Link | Size | Description |
|---|---|---|---|
| **Woodex Live P23 Master ZIP** | [Download woodex-live-p23.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-P23/woodex-live-p23.zip) | 27.3 MB | Full flat root structure, all 147 pages, Admin v2.5, 70 Section Suite, CRM upgrades, and installer. |
| **Woodex Master P22.2 Production Suite** | [Download woodex-master-P22.2.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-master-P22/woodex-master-P22.2.zip) | 27.3 MB | Production release with database schema, assets, and complete backend suite. |
| **Woodex Master P22.1 Suite** | [Download woodex-master-P22.1.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-master-P22/woodex-master-P22.1.zip) | 27.3 MB | Production package copy. |
| **Full Repository Archive (.zip)** | [Download GitHub Archive](https://github.com/marketingwoodex-cloud/-marketingwoodex/archive/refs/heads/arena/8a776c65-marketingwoodex.zip) | ~30 MB | Complete repository snapshot. |

---

## 1. Hostinger Web Structure & Recognition

Hostinger auto-scans your `public_html/` directory to recognize website technology and database connections. The master package is structured with the flat root layout:

```text
public_html/
├── index.php                      # Hostinger PHP Gateway & Routing
├── index.html                     # Luxury Homepage (130 KB)
├── config.php                     # Hostinger Database Configuration
├── .env                           # Environment Variables
├── .htaccess                      # Security, HTTPS redirect & caching
├── woodex-database.sql            # Master MySQL Database Schema & Seed Data
├── google0b104c3cfb7a4943.html    # Google Search Console Verification
├── favicon.ico                    # High-DPI Binary Favicon
├── admin/                         # Woodex Admin v2.5 Pro Dashboard
├── api/                           # PHP 8 REST API Endpoints
├── assets/                        # High-resolution images, fonts, styles, scripts
├── css/                           # Standard stylesheet folder (imports /assets/site-p21.css)
├── js/                            # Standard JS folder (imports /assets/site.js)
├── images/                        # Standard images directory
├── uploads/                       # User upload storage
├── includes/                      # Bridge configuration includes
│   └── config.php
├── _private/                      # Protected configuration & backups (.htaccess locked)
├── _database/                     # Database schemas and backups
└── [147 Luxury Service Pages]    # 1-kanal-house-design/, interior-design/, etc.
```

---

## 2. Step-by-Step Hostinger Deployment

### Step 1: Upload & Extract to `public_html/`
1. Log in to **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Go to **Websites** → **Dashboard** (`woodex.com.pk`) → **File Manager** (`public_html/`).
3. Upload `woodex-live-p23.zip`.
4. Right-click `woodex-live-p23.zip` and choose **Extract**. Extract directly into `public_html/`.
5. Verify that `index.php`, `index.html`, `config.php`, `woodex-database.sql`, and `admin/` are located directly in `public_html/`.

### Step 2: Create Database & Import Schema
1. In hPanel, go to **Databases** → **Management**.
2. Create a new MySQL database:
   - **Database Name:** `u128159657_woodex` (or your preferred name)
   - **Username:** `u128159657_woodex`
   - **Password:** Set your secure password (e.g., `Woodex@2026`)
3. Click **Enter phpMyAdmin** next to the created database.
4. Go to the **Import** tab.
5. Click **Choose File**, select `woodex-database.sql` (from your extracted files or downloaded locally), and click **Go** / **Import**.
6. All 20 tables and initial seed data will be created instantly.

### Step 3: Configure Database Connection
Edit `public_html/config.php` (or use the Admin setup screen) with your database credentials:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u128159657_woodex');
define('DB_USER', 'u128159657_woodex');
define('DB_PASS', 'YOUR_DATABASE_PASSWORD');
```
*Note: You can also use the one-click web installer at `https://woodex.com.pk/wx-install.php` to automatically connect and verify the database.*

---

## 3. Woodex Admin Sign-in & Team Roles

Access the Admin Suite at: `https://woodex.com.pk/admin/`

### Sign-in Features:
- **Luxury Aesthetic:** Centered frosted glass card over full-screen luxury interior visual.
- **Quick Demo Access:** 1-Click Auto Fill role pills for instant access.
- **Removed GitHub SSO:** Clean, focused email/password and Google SSO options.

### Pre-Configured Demo Credentials (Password: `Woodex@2026`):

| Role | Name | Email | Password | Permissions |
|---|---|---|---|---|
| **Master Admin / Owner** | Managing Director | `master@woodex.pk` | `Woodex@2026` | Full Control, Financials, DB Inspector, Settings |
| **Manager / Admin** | Ar. Bilal Ahmed | `manager@woodex.pk` | `Woodex@2026` | Design Director, Projects, Approvals, Sales |
| **Developer / Editor** | Engr. Hamza Farooq | `developer@woodex.pk` | `Woodex@2026` | Page Builder, SEO Agent, Theme Customizer |
| **Sales Lead** | Usman Ali | `sales@woodex.pk` | `Woodex@2026` | CRM Leads, Quotes, Invoices, WhatsApp Inbox |
| **Support Lead** | Dr. Sarah Mansoor | `support@woodex.pk` | `Woodex@2026` | Live Chat, Client Updates, Consultations |
| **Owner Fallback** | Woodex Owner | `admin@woodex.pk` | `Woodex@2026` | Master Administrative Access |

---

## 4. Verification & Health Check

1. **System Health Check:** Open `https://woodex.com.pk/wx-check.php` in your browser to verify PHP extensions (`pdo_mysql`, `curl`, `mbstring`, `zip`, `openssl`), file permissions, and directory writes.
2. **Google Search Console:** Open `https://woodex.com.pk/google0b104c3cfb7a4943.html` to confirm domain verification for Google Search Console.
3. **Live Chat & WhatsApp Dock:** Test the floating interactive chat widget on any of the 147 pages.
>>>>>>> d21c542 (Fix Hostinger website recognition, flat folder structure, centered luxury login, demo pills, and deploy woodex-live-p23.zip)
