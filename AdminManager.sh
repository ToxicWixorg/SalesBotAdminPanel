#!/bin/bash

R='\033[31m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; B='\033[1m'; W='\033[97m'; N='\033[0m'

PROJECT_DIR="/root/admin-panel"
API_DIR="$PROJECT_DIR/api"
CLIENT_DIR="$PROJECT_DIR/client"
PM2_API_NAME="admin-api"
REPO_URL="https://github.com/ToxicWixorg/SalesBotAdminPanel.git"
# اگر ریپوی جداگانه داری این را خالی بگذار
REPO_SUBDIR=""

header() {
  clear
  echo -e "${C}╔══════════════════════════════════════════════════════════════════════════╗${N}"
  echo -e "${C}║${N}      ${W}${B}⚡ Admin Panel Manager ⚡${N}                                      ${C}║${N}"
  echo -e "${C}╠══════════════════════════════════════════════════════════════════════════╣${N}"
  echo -e "${C}║${N}   ${B}${G}Project Path:${N}  $PROJECT_DIR                                     ${C}║${N}"
  echo -e "${C}║${N}   ${B}${G}API Status:${N}    $(get_api_status)                                       ${C}║${N}"
  echo -e "${C}╚══════════════════════════════════════════════════════════════════════════╝${N}"
  echo ""
}

get_api_status() {
  if pm2 jlist 2>/dev/null | grep -q "\"name\":\"$PM2_API_NAME\"" && \
     pm2 jlist 2>/dev/null | grep -q "\"status\":\"online\""; then
    echo -e "${G}🟢 Online${N}"
  else
    echo -e "${R}🔴 Offline${N}"
  fi
}

info() { echo -e "${Y}➜ $*${N}"; }
ok()   { echo -e "${G}✓ $*${N}"; }
err()  { echo -e "${R}✗ $*${N}"; }

# ─── ۰. نصب پیش‌نیازها ────────────────────────────────────────────────────────
install_prereqs() {
  header
  info "Installing prerequisites: Git, Bun, Node.js, PM2, Nginx..."

  apt-get update -y
  apt-get install -y git curl unzip nginx

  # Bun
  if ! command -v bun &>/dev/null; then
    info "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
  else
    ok "Bun $(bun --version) already installed"
  fi

  # Node + PM2
  if ! command -v pm2 &>/dev/null; then
    info "Installing Node.js & PM2..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
  else
    ok "PM2 already installed"
  fi

  ok "Prerequisites installed."
  sleep 2
}

# ─── ۱. نصب / نصب مجدد ────────────────────────────────────────────────────────
install_panel() {
  header
  info "Cloning repository..."

  TMPDIR=$(mktemp -d)
  git clone "$REPO_URL" "$TMPDIR/repo"

  # اگر admin-panel در یک زیرپوشه است آن را جابجا کن
  if [[ -n "$REPO_SUBDIR" && -d "$TMPDIR/repo/$REPO_SUBDIR" ]]; then
    rm -rf "$PROJECT_DIR"
    mv "$TMPDIR/repo/$REPO_SUBDIR" "$PROJECT_DIR"
  else
    rm -rf "$PROJECT_DIR"
    mv "$TMPDIR/repo" "$PROJECT_DIR"
  fi
  rm -rf "$TMPDIR"

  # ─── API ───────────────────────────────────────────────────────────────────
  info "Installing API dependencies..."
  cd "$API_DIR"
  bun install

  if [[ ! -f "$API_DIR/.env" ]]; then
    info "Creating API .env..."
    cat > "$API_DIR/.env" << 'EOF'
PORT=3000
DATABASE_URL=postgresql://bot:991fa522db6ddb9935c7d9b1@localhost:5433/bot
JWT_SECRET=change-this-to-a-random-secret
BOT_TOKEN=
# Origins جدا شده با کاما (دامنه یا IP ادمین پنل)
ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP
EOF
    err "Fill in API .env (Option 3) before starting."
  fi

  # ─── Client (build) ────────────────────────────────────────────────────────
  info "Installing client dependencies & building..."
  cd "$CLIENT_DIR"
  bun install

  if [[ ! -f "$CLIENT_DIR/.env" ]]; then
    cat > "$CLIENT_DIR/.env" << 'EOF'
VITE_API_URL=http://YOUR_SERVER_IP:3000
EOF
    err "Set VITE_API_URL in client/.env to your server address, then rebuild (Option 5)."
  fi

  bun run build

  # ─── Nginx ─────────────────────────────────────────────────────────────────
  setup_nginx

  ok "Installation complete!"
  sleep 2
}

# ─── ۲. آپدیت از گیت ─────────────────────────────────────────────────────────
update_panel() {
  header
  info "Stopping API..."
  pm2 stop "$PM2_API_NAME" 2>/dev/null || true

  TMPDIR=$(mktemp -d)
  info "Fetching latest code..."
  git clone "$REPO_URL" "$TMPDIR/repo"

  if [[ -n "$REPO_SUBDIR" && -d "$TMPDIR/repo/$REPO_SUBDIR" ]]; then
    SRC="$TMPDIR/repo/$REPO_SUBDIR"
  else
    SRC="$TMPDIR/repo"
  fi

  # حفظ .env فایل‌ها
  [[ -f "$API_DIR/.env" ]]    && cp "$API_DIR/.env"    /tmp/api.env.bak
  [[ -f "$CLIENT_DIR/.env" ]] && cp "$CLIENT_DIR/.env" /tmp/client.env.bak

  # جایگزینی کد
  rm -rf "$PROJECT_DIR"
  mv "$SRC" "$PROJECT_DIR"
  rm -rf "$TMPDIR"

  # برگرداندن .env
  [[ -f /tmp/api.env.bak ]]    && mv /tmp/api.env.bak    "$API_DIR/.env"
  [[ -f /tmp/client.env.bak ]] && mv /tmp/client.env.bak "$CLIENT_DIR/.env"

  info "Updating API dependencies..."
  cd "$API_DIR" && bun install

  info "Rebuilding client..."
  cd "$CLIENT_DIR" && bun install && bun run build

  info "Restarting API..."
  pm2 startOrRestart "$API_DIR/ecosystem.config.cjs" 2>/dev/null || start_api
  pm2 save

  ok "Update complete!"
  sleep 2
}

# ─── ۳. ویرایش .env ───────────────────────────────────────────────────────────
edit_env() {
  header
  echo -e "${C}┌────────────────────────────────────┐${N}"
  echo -e "${C}│${N}  ${B}${G}1)${N} Edit API .env               ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}2)${N} Edit Client .env            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${W}b)${N} Back                        ${C}│${N}"
  echo -e "${C}└────────────────────────────────────┘${N}"
  read -r -p "Select: " e
  case $e in
    1) nano "$API_DIR/.env" ;;
    2) nano "$CLIENT_DIR/.env" ;;
    b) return ;;
  esac
}

# ─── ۴. شروع / ری‌استارت API ──────────────────────────────────────────────────
start_api() {
  header
  if [[ ! -f "$API_DIR/.env" ]]; then
    err "API .env not found. Install first (Option 1)."; sleep 2; return; fi

  # بررسی متغیرهای اجباری
  missing=()
  for var in BOT_TOKEN JWT_SECRET DATABASE_URL; do
    val=$(grep -E "^${var}=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | xargs)
    [[ -z "$val" || "$val" == "change-this-to-a-random-secret" || "$val" == "YOUR_BOT_TOKEN" ]] && missing+=("$var")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing or default .env values: ${missing[*]}"
    err "Edit .env (Option 3) first."
    sleep 3; return 1
  fi

  cd "$API_DIR"
  if [[ -f "ecosystem.config.cjs" ]]; then
    pm2 startOrRestart ecosystem.config.cjs --update-env
  elif pm2 jlist 2>/dev/null | grep -q "\"name\":\"$PM2_API_NAME\""; then
    pm2 restart "$PM2_API_NAME" --update-env
  else
    pm2 start bun --name "$PM2_API_NAME" -- run start
  fi
  pm2 save
  ok "API started."
  sleep 2
}

# ─── ۵. ری‌بیلد کلاینت ────────────────────────────────────────────────────────
rebuild_client() {
  header
  info "Rebuilding client..."
  cd "$CLIENT_DIR"
  bun install
  bun run build
  ok "Client rebuilt. Files are in $CLIENT_DIR/dist"
  setup_nginx
  sleep 2
}

# ─── ۶. توقف API ──────────────────────────────────────────────────────────────
stop_api() {
  header
  pm2 stop "$PM2_API_NAME" 2>/dev/null || info "API not running"
  ok "API stopped."
  sleep 2
}

# ─── ۷. راه‌اندازی Nginx ──────────────────────────────────────────────────────
setup_nginx() {
  info "Configuring Nginx..."

  # خواندن پورت از API .env اگر وجود دارد
  API_PORT=$(grep -E "^PORT=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | xargs)
  API_PORT=${API_PORT:-3000}

  cat > /etc/nginx/sites-available/admin-panel << EOF
server {
    listen 80;
    server_name _;

    # Client (SPA)
    root $CLIENT_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/admin-panel /etc/nginx/sites-enabled/admin-panel
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null
  nginx -t && systemctl reload nginx
  ok "Nginx configured. Panel is available on port 80."
}

# ─── ۸. لاگ‌ها ────────────────────────────────────────────────────────────────
show_logs() {
  echo -e "${C}┌────────────────────────────────────┐${N}"
  echo -e "${C}│${N}  ${B}${G}1)${N} Live logs                   ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}2)${N} Last 100 lines              ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}3)${N} Nginx error log             ${C}│${N}"
  echo -e "${C}│${N}  ${B}${W}b)${N} Back                        ${C}│${N}"
  echo -e "${C}└────────────────────────────────────┘${N}"
  read -r -p "Select: " l
  case $l in
    1) pm2 logs "$PM2_API_NAME" ;;
    2) pm2 logs "$PM2_API_NAME" --lines 100 --nostream ;;
    3) tail -n 50 /var/log/nginx/error.log ;;
    b) return ;;
  esac
}

# ─── منوی اصلی ────────────────────────────────────────────────────────────────
while true; do
  header
  echo -e "${C}┌──────────────────────────────────────┐${N}"
  echo -e "${C}│${N}  ${B}${G}0)${N} 🛠️  Install Prerequisites           ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}1)${N} 📥 Install / Reinstall Panel       ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}2)${N} 🔄 Update from GitHub              ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}3)${N} ✏️  Edit .env settings              ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}4)${N} ▶️  Start / Restart API             ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}5)${N} 🔨 Rebuild Client (frontend)       ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}6)${N} ⏹️  Stop API                       ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}7)${N} 🌐 Setup / Reload Nginx            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}8)${N} 📋 Logs                            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}9)${N} 📊 PM2 Status                      ${C}│${N}"
  echo -e "${C}│${N}  ${B}${R}d)${N} 🗑️  Remove Project                 ${C}│${N}"
  echo -e "${C}│${N}  ${B}${R}q)${N} 🚪 Exit                            ${C}│${N}"
  echo -e "${C}└──────────────────────────────────────┘${N}"
  echo ""
  read -r -p "Select an option: " choice

  case $choice in
    0) install_prereqs ;;
    1) install_panel ;;
    2) update_panel ;;
    3) edit_env ;;
    4) start_api ;;
    5) rebuild_client ;;
    6) stop_api ;;
    7) setup_nginx; sleep 2 ;;
    8) show_logs ;;
    9) pm2 status; read -p "Press Enter to return..." ;;
    d)
      read -p "Remove entire project? (y/n): " confirm
      if [[ $confirm == "y" ]]; then
        pm2 delete "$PM2_API_NAME" 2>/dev/null
        rm -rf "$PROJECT_DIR"
        rm -f /etc/nginx/sites-enabled/admin-panel
        rm -f /etc/nginx/sites-available/admin-panel
        nginx -t && systemctl reload nginx
        ok "Removed."
      fi
      sleep 2
      ;;
    q) exit 0 ;;
    *) echo "Invalid option"; sleep 1 ;;
  esac
done
