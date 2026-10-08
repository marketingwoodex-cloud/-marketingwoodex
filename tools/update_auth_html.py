import os

with open("frontend-v1/admin-v2.1/index.html", "r") as f:
    html = f.read()

auth_start = html.find("<!-- ============ AUTH")
auth_end = html.find("<!-- ============ APP")

if auth_start != -1 and auth_end != -1:
    new_auth = """<!-- ============ AUTH (Glassmorphic Obsidian Reference) ============ -->
<div class="auth" id="auth" hidden>
  <div class="auth-glow"></div>
  <div class="auth-card">
    <div class="brand" style="margin-bottom: 16px; justify-content: center; display: flex; align-items: center; gap: 10px;">
      <span class="logo" style="background:#00b8db;color:#04222b;font-weight:800;border-radius:10px;width:38px;height:38px;display:grid;place-items:center;font-size:18px;">W</span>
      <div><b>Woodex</b><small style="color: #00d3f2; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">ADMIN V2.1</small></div>
    </div>

    <!-- Login Form (Exact Match to Screenshot) -->
    <form id="login-form">
      <h1 class="auth-title">Welcome Back!</h1>
      <p class="auth-sub">Enter your details below to sign in into your account</p>

      <!-- Social SSO Row (Google & GitHub) -->
      <div class="auth-sso-row">
        <button type="button" class="btn-sso" id="l-soc-google">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.09-6.68-4.91H1.21v3.13C3.25 21.43 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.32 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.13z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.57 1.21 6.58l4.11 3.13c.94-2.82 3.58-4.96 6.68-4.96z"/></svg>
          <span>Continue Google</span>
        </button>
        <button type="button" class="btn-sso" id="l-soc-github">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          <span>Continue GitHub</span>
        </button>
      </div>

      <!-- Divider -->
      <div class="auth-divider"><span>or</span></div>

      <!-- Input Fields -->
      <div class="auth-field">
        <label for="l-email">Email</label>
        <div class="auth-input-pill">
          <input type="text" inputmode="email" id="l-email" autocomplete="username" autocapitalize="none" required placeholder="Enter your email">
        </div>
      </div>

      <div class="auth-field">
        <label for="l-pass">Password</label>
        <div class="auth-input-pill">
          <input type="password" id="l-pass" autocomplete="current-password" required placeholder="Enter Password">
          <button type="button" class="auth-eye-btn" id="l-pass-toggle" aria-label="Toggle password visibility">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div class="auth-sub-row">
        <a href="#" id="l-forgot" class="auth-link-cyan">Forgot Password?</a>
      </div>

      <p class="err" id="l-err"></p>

      <button type="submit" class="btn-auth-main" id="l-btn">Login</button>

      <p class="auth-signup-text">Don't Have An Account? <a href="#" id="l-signup" class="auth-link-cyan">Sign Up</a></p>

      <!-- Quick 1-Click Demo Roles -->
      <div class="auth-demo-box">
        <span class="auth-demo-title">🚀 Quick Demo Access:</span>
        <div class="auth-demo-pills">
          <button type="button" class="btn-demo-pill" data-e="master@woodex.pk" title="Owner / Full Control">Master</button>
          <button type="button" class="btn-demo-pill" data-e="manager@woodex.pk" title="Admin / Operations">Manager</button>
          <button type="button" class="btn-demo-pill" data-e="developer@woodex.pk" title="Developer / Editor">Developer</button>
          <button type="button" class="btn-demo-pill" data-e="sales@woodex.pk" title="Sales Executive">Sales</button>
          <button type="button" class="btn-demo-pill" data-e="support@woodex.pk" title="Support Specialist">Support</button>
        </div>
      </div>
    </form>

    <!-- Forgot Password Form -->
    <form id="fp-form" hidden>
      <h1 class="auth-title">Reset Password</h1>
      <p class="auth-sub">Enter your Admin email. We will email you a secure link to choose a new password.</p>
      <div class="auth-field">
        <label for="fp-email">Email</label>
        <div class="auth-input-pill">
          <input type="email" id="fp-email" autocomplete="username" required placeholder="Enter your registered email">
        </div>
      </div>
      <p class="err" id="fp-err"></p>
      <p class="muted" id="fp-ok" style="font-size:13px"></p>
      <button type="submit" class="btn-auth-main" id="fp-btn">Send Reset Link</button>
      <p class="auth-signup-text"><a href="#" class="fp-back auth-link-cyan">Back to sign in</a></p>
    </form>

    <!-- Two-Step Verification Form -->
    <form id="tfa-form" hidden>
      <h1 class="auth-title">Two-Step Sign In</h1>
      <p class="auth-sub">Enter the 6-digit verification code from your authenticator app.</p>
      <div class="auth-field">
        <label for="t-code">Verification Code</label>
        <div class="auth-input-pill">
          <input id="t-code" inputmode="numeric" autocomplete="one-time-code" maxlength="9" required placeholder="123456">
        </div>
      </div>
      <p class="err" id="t-err"></p>
      <button type="submit" class="btn-auth-main" id="t-btn">Verify Code</button>
      <p class="auth-signup-text"><a href="#" id="t-back" class="auth-link-cyan">Back to sign in</a></p>
    </form>

    <!-- Setup Form -->
    <form id="setup-form" hidden>
      <h1 class="auth-title">Set up Woodex Admin</h1>
      <p class="auth-sub">One-time installation. Creates database tables and owner account.</p>
      <div class="auth-field"><label>Your Name</label><div class="auth-input-pill"><input id="s-uname" placeholder="Admin Name"></div></div>
      <div class="auth-field"><label>Email</label><div class="auth-input-pill"><input type="email" id="s-email" placeholder="admin@woodex.pk"></div></div>
      <div class="auth-field"><label>Password</label><div class="auth-input-pill"><input type="password" id="s-pass" minlength="8" placeholder="Password (8+ chars)"></div></div>
      <div class="auth-field"><label>Page-Builder Password</label><div class="auth-input-pill"><input type="password" id="s-bpass" placeholder="Woodex@2026"></div></div>
      <p class="err" id="s-err"></p>
      <button type="submit" class="btn-auth-main" id="s-btn">Install &amp; Create Owner</button>
    </form>

    <!-- Reconnect Database Form -->
    <form id="db-form" hidden>
      <h1 class="auth-title">Reconnect Database</h1>
      <p class="auth-sub">Enter your Hostinger MySQL database details to restore connection.</p>
      <div class="auth-field"><label>Database Name</label><div class="auth-input-pill"><input id="d-name" placeholder="u128159657_woodex"></div></div>
      <div class="auth-field"><label>Database User</label><div class="auth-input-pill"><input id="d-user" placeholder="u128159657_woodex"></div></div>
      <div class="auth-field"><label>Database Password</label><div class="auth-input-pill"><input type="password" id="d-dpass"></div></div>
      <div class="auth-field"><label>Page-Builder Password</label><div class="auth-input-pill"><input type="password" id="d-bpass" placeholder="Woodex@2026"></div></div>
      <p class="err" id="d-err"></p>
      <button type="submit" class="btn-auth-main" id="d-btn">Test &amp; Reconnect</button>
    </form>
  </div>
</div>\n\n"""
    html = html[:auth_start] + new_auth + html[auth_end:]
    with open("frontend-v1/admin-v2.1/index.html", "w") as f:
        f.write(html)
    print("Updated index.html with new glassmorphic auth screen!")
else:
    print("Could not find auth markers in index.html")
