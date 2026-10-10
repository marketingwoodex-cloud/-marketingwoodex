# Woodex Architecture & Luxury Interior — Hostinger Production Deployment Guide

**Target Domain:** `woodex.com.pk`  
**Package:** `Woodex Live P23.zip` (27.3 MB) inside `woodex-live-p23/`  
**Compatibility:** Hostinger PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3 + MySQL 8.0 / MariaDB 10.3+  

---

## Direct GitHub Download Links

| Package | Direct Download Link | Size | Description |
|---|---|---|---|
| **Woodex Live P23.zip (Primary)** | [Download Woodex Live P23.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-p23/Woodex%20Live%20P23.zip) | 27.3 MB | Full flat root structure in `woodex-live-p23/`, all 147 pages, Admin v2.5 Pro, 70 Section Suite, CRM upgrades, and installer. |
| **Woodex Live P23 Folder (Browse Online)** | [Browse woodex-live-p23/](https://github.com/marketingwoodex-cloud/-marketingwoodex/tree/arena/8a776c65-marketingwoodex/woodex-live-p23) | — | Direct GitHub folder with all extracted website files. |
| **Woodex Master P22.2 Suite** | [Download woodex-master-P22.2.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-master-P22/woodex-master-P22.2.zip) | 27.3 MB | Production release with database schema, assets, and complete backend suite. |
| **Woodex Master P22.1 Suite** | [Download woodex-master-P22.1.zip](https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-master-P22/woodex-master-P22.1.zip) | 27.3 MB | Production package copy. |

---

## 1. Hostinger Web Structure & Recognition

Hostinger auto-scans your `public_html/` directory to recognize website technology and database connections. The master package is structured with the flat root layout:

```text
public_html/
├── index.php                      # Hostinger PHP Gateway & Routing
├── index.html                     # Luxury Homepage (130 KB)
├── config.php                     # Hostinger Database Configuration ($db_host, $db_name, $db_user, $db_pass)
├── .env                           # Environment Variables (DB_HOST, DB_DATABASE, etc.)
├── .htaccess                      # DirectoryIndex index.php index.html & security rules
├── woodex-database.sql            # Master MySQL Database Schema (for phpMyAdmin)
├── google0b104c3cfb7a4943.html    # Google Search Console Verification
├── favicon.ico                    # High-DPI Binary Favicon
├── admin/                         # Unified Woodex Admin v2.5 Pro Dashboard
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
3. Upload `Woodex Live P23.zip`.
4. Right-click `Woodex Live P23.zip` and choose **Extract**. Extract directly into `public_html/`.
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
$db_host = "localhost";
$db_name = "u128159657_woodex";
$db_user = "u128159657_woodex";
$db_pass = "YOUR_DATABASE_PASSWORD";
```

---

## 3. Woodex Admin Sign-in

Access the Admin Suite at: `https://woodex.com.pk/admin/`

### Sign-in Features:
- **Luxury Aesthetic:** Centered frosted glass card over full-screen luxury interior visual.
- **Google SSO:** Full-width **"Continue with Google"** button.
- **Clean Form:** Direct Email & Password sign-in.

### Pre-Configured Demo Credentials (Password: `Woodex@2026`):

| Role | Name | Email | Password | Permissions |
|---|---|---|---|---|
| **Master Admin / Owner** | Managing Director | `master@woodex.pk` | `Woodex@2026` | Full Control, Financials, DB Inspector, Settings |
| **Manager / Admin** | Ar. Bilal Ahmed | `manager@woodex.pk` | `Woodex@2026` | Design Director, Projects, Approvals, Sales |
| **Developer / Editor** | Engr. Hamza Farooq | `developer@woodex.pk` | `Woodex@2026` | Page Builder, SEO Agent, Theme Customizer |
| **Sales Lead** | Usman Ali | `sales@woodex.pk` | `Woodex@2026` | CRM Leads, Quotes, Invoices, WhatsApp Inbox |
| **Support Lead** | Dr. Sarah Mansoor | `support@woodex.pk` | `Woodex@2026` | Live Chat, Client Updates, Consultations |
| **Owner Fallback** | Woodex Owner | `admin@woodex.pk` | `Woodex@2026` | Master Administrative Access |
