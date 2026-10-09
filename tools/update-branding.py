import os, re

def update_branding(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Update title and small labels
    content = content.replace("Admin v2.1", "Admin v2.5 Pro")
    content = content.replace("ADMIN V2.1", "ADMIN V2.5 PRO")
    content = content.replace("Admin v2", "Admin v2.5 Pro")
    
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Updated branding in {filepath}")

for p in ["p23-live/admin/index.html", "frontend-v1/admin/index.html", "frontend-v1/admin-v2.1/index.html"]:
    if os.path.exists(p):
        update_branding(p)
