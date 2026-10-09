import json, os

db_paths = [
    "p23-live/_private/admin-db.json",
    "frontend-v1/_private/admin-db.json",
    "p22-preview/_private/admin-db.json",
    "woodex-vlive-P20/site/_private/admin-db.json"
]

scrypt_h = "scrypt$ffdec6010fef7c2f0e3b9c40d7338ac1$b5d57af1eb07514ff10a1e9ae7da02c118007690aef596aee833a43b29c00d00" # Woodex@2026
bcrypt_h = "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a" # WoodexAdmin@2026! / Woodex@2026

team_data = [
    {
        "id": 1,
        "name": "Kamran Tariq",
        "email": "master@woodex.pk",
        "role": "owner",
        "role_label": "Master Admin & Managing Director",
        "department": "Executive Leadership",
        "phone": "+923001234567",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "KT",
        "bio": "Founding director overseeing luxury interior architecture, turnkey construction, and joinery manufacturing.",
        "permissions": ["all"]
    },
    {
        "id": 2,
        "name": "Ar. Bilal Ahmed",
        "email": "manager@woodex.pk",
        "role": "admin",
        "role_label": "Studio Manager & Lead Architect",
        "department": "Architecture & Operations",
        "phone": "+923214567890",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "BA",
        "bio": "PCATP registered architect specializing in high-end modern residential layouts and studio operations.",
        "permissions": ["website", "sales", "conversations", "settings"]
    },
    {
        "id": 3,
        "name": "Farhan Malik",
        "email": "developer@woodex.pk",
        "role": "editor",
        "role_label": "Lead Developer & Technical Architect",
        "department": "Digital Platforms & UI/UX",
        "phone": "+923007654321",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "FM",
        "bio": "Lead web platform engineer managing website architectures, builder integrations, and client portal.",
        "permissions": ["website", "builder", "media", "settings"]
    },
    {
        "id": 4,
        "name": "Usman Ali",
        "email": "sales@woodex.pk",
        "role": "sales",
        "role_label": "Head of Sales & Estimations",
        "department": "Sales & Client Relations",
        "phone": "+923338901234",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "UA",
        "bio": "Lead sales consultant for luxury residences, commercial fit-outs, and customized woodwork quotations.",
        "permissions": ["sales", "conversations"]
    },
    {
        "id": 5,
        "name": "Ayesha Khan",
        "email": "support@woodex.pk",
        "role": "support",
        "role_label": "Customer Support & Inbox Lead",
        "department": "Client Care & Operations",
        "phone": "+923119876543",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "AK",
        "bio": "Client care coordinator managing live chat communications, WhatsApp queries, and project ticket updates.",
        "permissions": ["conversations", "updates"]
    },
    {
        "id": 6,
        "name": "System Administrator",
        "email": "admin@woodex.pk",
        "role": "admin",
        "role_label": "System Administrator",
        "department": "IT & Systems",
        "phone": "+923214567890",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "SA",
        "bio": "System administrator managing security tokens, databases, backups, and server configurations.",
        "permissions": ["all"]
    },
    {
        "id": 7,
        "name": "Engr. Hamza Farooq",
        "email": "hamza.farooq@woodex.pk",
        "role": "editor",
        "role_label": "Senior Project & Site Manager",
        "department": "Site Execution & Fit-Out",
        "phone": "+923126789012",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "HF",
        "bio": "Project engineer overseeing on-site joinery installations, MEP coordination, and turnkey timeline adherence.",
        "permissions": ["sales", "website"]
    },
    {
        "id": 8,
        "name": "Dr. Sarah Mansoor",
        "email": "sarah.mansoor@woodex.pk",
        "role": "editor",
        "role_label": "Senior Interior Stylist",
        "department": "Interior Styling & Finishes",
        "phone": "+923451239876",
        "active": 1,
        "pass_hash": scrypt_h,
        "pw_hash": bcrypt_h,
        "pw_ver": 1,
        "avatar": "SM",
        "bio": "Specialist in material palettes, bespoke fabric selection, lighting moods, and modern luxury finishes.",
        "permissions": ["website", "conversations"]
    }
]

testimonials_data = [
    {
        "id": 1,
        "name": "Malik Riaz Hussain",
        "company": "1 Kanal Luxury Villa Owner",
        "location": "DHA Phase 6, Lahore",
        "rating": 5,
        "date": "2026-09-28",
        "avatar": "MR",
        "tag": "Turnkey Residential",
        "title": "Exceptional craftsmanship and seamless execution",
        "text": "Woodex Interior executed our complete 1 Kanal residence in DHA Phase 6 from architecture to final furniture handover. The Spanish quartz kitchen island and seamless floor-to-ceiling closets are absolutely world-class.",
        "featured": True,
        "published": True
    },
    {
        "id": 2,
        "name": "Dr. Tariq Jamil",
        "company": "Apex Medical & Aesthetics",
        "location": "Gulberg III, Lahore",
        "rating": 5,
        "date": "2026-09-15",
        "avatar": "TJ",
        "tag": "Commercial Clinic",
        "title": "Unrivalled aesthetic appeal and functional acoustic wall panelling",
        "text": "The patient waiting lounges and consultation suites delivered by Woodex have set a new benchmark in healthcare luxury in Lahore. Impeccable attention to detail and flawless finish.",
        "featured": True,
        "published": True
    },
    {
        "id": 3,
        "name": "Mrs. Ayesha Farooq",
        "company": "Lake City Executive Residence",
        "location": "Lake City, Lahore",
        "rating": 5,
        "date": "2026-08-30",
        "avatar": "AF",
        "tag": "Modular Kitchen & Wardrobes",
        "title": "German acrylic finish and smooth Blum fittings",
        "text": "Our modern open-concept kitchen was delivered on time with perfect laser-edge banded German UV acrylic shutters and Blum motorized servo-drive lifts. Outstanding after-sales service!",
        "featured": True,
        "published": True
    },
    {
        "id": 4,
        "name": "Chaudhry Noman",
        "company": "Horizon Capital Tower",
        "location": "Bahria Town Sector C, Lahore",
        "rating": 5,
        "date": "2026-08-12",
        "avatar": "CN",
        "tag": "Corporate Headquarters",
        "title": "Solid wood boardroom table and luxury acoustic fitout",
        "text": "Woodex customized our 24-seater executive boardroom table in solid walnut veneer alongside hidden acoustic wall doors. The craftsmanship is worthy of international corporate standards.",
        "featured": False,
        "published": True
    },
    {
        "id": 5,
        "name": "Engr. Salman Raza",
        "company": "Model Town Residence",
        "location": "Model Town, Lahore",
        "rating": 5,
        "date": "2026-07-20",
        "avatar": "SR",
        "tag": "Full House Renovation",
        "title": "Completely transformed our 20-year old family home",
        "text": "From architectural structural remodeling to bespoke TV consoles, false ceiling lighting, and bathroom vanities, Woodex turned our house into a contemporary luxury sanctuary.",
        "featured": False,
        "published": True
    },
    {
        "id": 6,
        "name": "Zainab Sheikh",
        "company": "Boutique Fashion Studio",
        "location": "DHA Phase 5, Lahore",
        "rating": 5,
        "date": "2026-06-18",
        "avatar": "ZS",
        "tag": "Retail & Display",
        "title": "Minimalist brass racks and seamless curved joinery",
        "text": "Woodex understood our minimalist design brief immediately. The warm LED display niches, curved cashier counter, and fitting room joinery are spectacular.",
        "featured": False,
        "published": True
    }
]

social_connectors = {
    "google": {
        "name": "Google Workspace & Analytics",
        "status": "connected",
        "account": "woodexinterior.pk@gmail.com",
        "last_sync": "2026-10-09 10:14:00",
        "client_id": "88401928374-woodex-cloud.apps.googleusercontent.com",
        "scopes": ["Google Analytics 4 (GA4)", "Google Search Console", "Google Business Profile"]
    },
    "meta": {
        "name": "Meta Business Suite (Facebook)",
        "status": "connected",
        "account": "Woodex Interior Design Studio Official",
        "page_id": "104928172635489",
        "last_sync": "2026-10-09 09:45:00",
        "scopes": ["Page Posts", "Lead Generation Forms", "Messenger Webhooks"]
    },
    "instagram": {
        "name": "Instagram Professional",
        "status": "connected",
        "account": "@woodex.interior.official",
        "last_sync": "2026-10-09 09:45:00",
        "scopes": ["Media Publishing", "Direct Message Auto-Sync", "Story Insights"]
    },
    "whatsapp": {
        "name": "WhatsApp Cloud API",
        "status": "connected",
        "account": "+92 300 4455667 (Verified Business WABA)",
        "phone_number_id": "109847261524312",
        "last_sync": "2026-10-09 10:30:00",
        "scopes": ["Template Broadcasts", "Live Two-Way Inbox", "Automated Milestones"]
    },
    "linkedin": {
        "name": "LinkedIn Company Pages",
        "status": "connected",
        "account": "Woodex Interior & Turnkey Architecture",
        "org_id": "89347261",
        "last_sync": "2026-10-08 18:20:00",
        "scopes": ["Company Updates", "Architecture Showcase Articles", "Lead Capture"]
    },
    "tiktok": {
        "name": "TikTok for Business",
        "status": "ready",
        "account": "@woodex_luxury_spaces",
        "last_sync": "2026-10-07 14:10:00",
        "scopes": ["Short-Form Video Renders", "Factory Tour Clips"]
    },
    "youtube": {
        "name": "YouTube Studio",
        "status": "connected",
        "account": "Woodex Interior Studio PK",
        "channel_id": "UC_woodex_interior_pakistan",
        "last_sync": "2026-10-08 12:00:00",
        "scopes": ["4K Project Walkthroughs", "Site Transformation Shorts"]
    }
}

for path in db_paths:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                d = json.load(f)
            d["users"] = team_data
            d["testimonials"] = testimonials_data
            d["social"] = social_connectors
            with open(path, "w", encoding="utf-8") as f:
                json.dump(d, f, indent=2, ensure_ascii=False)
            print(f"Successfully seeded {path} with {len(team_data)} team members and {len(testimonials_data)} testimonials.")
        except Exception as e:
            print(f"Error seeding {path}: {e}")
