import json, os

db_paths = [
    "p23-live/_private/admin-db.json",
    "frontend-v1/_private/admin-db.json",
    "p22-preview/_private/admin-db.json",
    "woodex-vlive-P20/site/_private/admin-db.json"
]

team_data = [
    {
        "id": 1,
        "name": "Kamran Tariq",
        "email": "master@woodex.pk",
        "role": "owner",
        "role_label": "Master Admin & Managing Director",
        "department": "Executive Leadership",
        "phone": "+923001234567",
        "active": True,
        "pw_hash": "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a", # WoodexAdmin@2026!
        "pw_ver": 1,
        "avatar": "KT",
        "bio": "Founding director overseeing luxury interior architecture, turnkey construction, and joinery manufacturing.",
        "permissions": ["all"]
    },
    {
        "id": 2,
        "name": "Ar. Bilal Ahmed",
        "email": "admin@woodex.pk",
        "role": "admin",
        "role_label": "Lead Architect & Design Director",
        "department": "Architecture & 3D Visualization",
        "phone": "+923214567890",
        "active": True,
        "pw_hash": "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a",
        "pw_ver": 1,
        "avatar": "BA",
        "bio": "PCATP registered architect specializing in high-end modern residential layouts, spatial planning, and interior detailing.",
        "permissions": ["website", "sales", "conversations", "settings"]
    },
    {
        "id": 3,
        "name": "Usman Ali",
        "email": "sales@woodex.pk",
        "role": "sales",
        "role_label": "Head of Sales & Estimations",
        "department": "Sales & Client Relations",
        "phone": "+923338901234",
        "active": True,
        "pw_hash": "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a",
        "pw_ver": 1,
        "avatar": "UA",
        "bio": "Lead sales consultant for luxury residences, commercial fit-outs, and customized woodwork quotations.",
        "permissions": ["sales", "conversations"]
    },
    {
        "id": 4,
        "name": "Engr. Hamza Farooq",
        "email": "hamza.farooq@woodex.pk",
        "role": "editor",
        "role_label": "Senior Project & Site Manager",
        "department": "Site Execution & Fit-Out",
        "phone": "+923126789012",
        "active": True,
        "pw_hash": "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a",
        "pw_ver": 1,
        "avatar": "HF",
        "bio": "Project engineer overseeing on-site joinery installations, MEP coordination, and turnkey timeline adherence.",
        "permissions": ["sales", "website"]
    },
    {
        "id": 5,
        "name": "Dr. Sarah Mansoor",
        "email": "sarah.mansoor@woodex.pk",
        "role": "editor",
        "role_label": "Senior Interior Stylist",
        "department": "Interior Styling & Finishes",
        "phone": "+923451239876",
        "active": True,
        "pw_hash": "$2y$10$e0MYzXyjpJS7Pd0RVvHwHe9yL1O0vY2K8z1Q.j7Yq4q7Pz0U2wG9a",
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
        "name": "Mrs. Naveen Sheikh",
        "company": "Residence",
        "location": "Bahria Town Sector C, Lahore",
        "rating": 5,
        "date": "2026-09-15",
        "avatar": "NS",
        "tag": "Modular Kitchen & Wardrobes",
        "title": "German acrylic finish with flawless soft-close hardware",
        "text": "Our modular acrylic kitchen with Blum fittings was delivered right on time. The 3D render matched the finished kitchen down to the exact LED warm-white lighting tone.",
        "featured": True,
        "published": True
    },
    {
        "id": 3,
        "name": "Dr. Asadullah Khan",
        "company": "Apex Dental & Wellness Clinic",
        "location": "Gulberg III, Lahore",
        "rating": 5,
        "date": "2026-08-20",
        "avatar": "AK",
        "tag": "Commercial Fit-Out",
        "title": "Professional medical clinic design & acoustic panelling",
        "text": "The Woodex team transformed our 3,000 sq ft clinic with soundproof executive doors, acoustic wall panelling, and a striking modern reception desk. Outstanding durability and finish.",
        "featured": True,
        "published": True
    },
    {
        "id": 4,
        "name": "Tariq Mahmood",
        "company": "Mahmood Textiles",
        "location": "Main Boulevard, Gulberg, Lahore",
        "rating": 5,
        "date": "2026-08-04",
        "avatar": "TM",
        "tag": "Corporate Boardroom",
        "title": "Solid wood boardroom table & executive interior",
        "text": "We commissioned a custom solid wood 18-seater boardroom table and director suite. The joinery precision and wood polish quality exceeded our highest expectations.",
        "featured": True,
        "published": True
    },
    {
        "id": 5,
        "name": "Ayesha Farooq",
        "company": "Lake City Villa",
        "location": "Lake City, Lahore",
        "rating": 5,
        "date": "2026-07-19",
        "avatar": "AF",
        "tag": "Kitchen & Island",
        "title": "Modern matte charcoal kitchen island",
        "text": "The team was courteous, organized, and delivered impeccable finishing. Every visitor compliments our kitchen island and custom breakfast counter.",
        "featured": False,
        "published": True
    },
    {
        "id": 6,
        "name": "Zubair Hashmi",
        "company": "Hashmi Architects",
        "location": "Model Town, Lahore",
        "rating": 5,
        "date": "2026-07-02",
        "avatar": "ZH",
        "tag": "Walk-in Closet",
        "title": "Architect-grade glass walk-in wardrobe",
        "text": "As an architect, I am very particular about tolerances. Woodex demonstrated flawless edge banding, glass door framing, and concealed sensor lighting.",
        "featured": False,
        "published": True
    }
]

social_connectors = {
    "google": {
        "connected": True,
        "account": "woodexinterior.pk@gmail.com",
        "name": "Google Workspace & Analytics",
        "services": ["Google Analytics 4 (GA4)", "Google Search Console", "Google Business Profile"],
        "last_sync": "2026-10-09 09:30:00"
    },
    "meta": {
        "connected": True,
        "account": "Woodex Interior Pakistan",
        "name": "Meta / Facebook Business",
        "services": ["Facebook Page", "Lead Generation Ads", "Messenger Sync"],
        "last_sync": "2026-10-09 09:00:00"
    },
    "instagram": {
        "connected": True,
        "account": "@woodexinterior",
        "name": "Instagram Professional",
        "services": ["Instagram Direct Chat", "Feed Showcase", "Story Highlights"],
        "last_sync": "2026-10-09 08:45:00"
    },
    "whatsapp": {
        "connected": True,
        "account": "+92 300 4455667",
        "name": "WhatsApp Cloud API",
        "services": ["Direct wa.me link", "Lead alerts", "Quick template launcher"],
        "last_sync": "2026-10-09 09:40:00"
    },
    "linkedin": {
        "connected": True,
        "account": "Woodex Interior Studio",
        "name": "LinkedIn Business Page",
        "services": ["Corporate Commercial Inquiries", "Recruitment & Talent"],
        "last_sync": "2026-10-08 18:00:00"
    },
    "tiktok": {
        "connected": False,
        "account": "",
        "name": "TikTok Creator Hub",
        "services": ["Site Videos & Reels"],
        "last_sync": ""
    },
    "youtube": {
        "connected": True,
        "account": "Woodex Interior Architecture",
        "name": "YouTube Channel",
        "services": ["3D Walkthrough Tours", "Project Videos"],
        "last_sync": "2026-10-05 12:00:00"
    }
}

for path in db_paths:
    if os.path.exists(path):
        with open(path, "r") as f:
            db = json.load(f)
        
        db["users"] = team_data
        db["testimonials"] = testimonials_data
        db["social"] = social_connectors
        
        with open(path, "w") as f:
            json.dump(db, f, indent=2)
        print(f"Updated rich showcase data in {path}")
