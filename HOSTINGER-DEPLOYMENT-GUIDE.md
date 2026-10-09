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
