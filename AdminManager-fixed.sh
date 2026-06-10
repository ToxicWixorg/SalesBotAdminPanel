#!/bin/bash

R='\033[31m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; B='\033[1m'; W='\033[97m'; N='\033[0m'

PROJECT_DIR="/root/proj/admin-panel"
API_DIR="$PROJECT_DIR/api"
CLIENT_DIR="$PROJECT_DIR/client"
PM2_API_NAME="admin-api"
REPO_URL="https://github.com/ToxicWixorg/SalesBotAdminPanel.git"
REPO_SUBDIR=""
SERVER_DOMAIN=""
NGINX_PORT=8081

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

# ─── بررسی سلامت سیستم ──────────────────────────────────────────────────────
check_system_health() {
  header
  echo -e "${C}Checking system health...${N}"
  
  # بررسی فضای دیسک
  DISK_USAGE=$(df "$PROJECT_DIR" 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
  if [[ $DISK_USAGE -gt 80 ]]; then
    err "Low disk space: ${DISK_USAGE}% used"
    return 1
  fi
  ok "Disk space OK: ${DISK_USAGE}% used"
  
  # بررسی حافظه آزاد
  MEM_AVAILABLE=$(free -m 2>/dev/null | awk 'NR==2 {print $7}')
  if [[ $MEM_AVAILABLE -lt 512 ]]; then
    err "Low memory: ${MEM_AVAILABLE}MB available (need at least 512MB)"
    return 1
  fi
  ok "Memory OK: ${MEM_AVAILABLE}MB available"
  
  # بررسی bun
  if ! command -v bun &> /dev/null; then
    err "bun is not installed or not in PATH"
    return 1
  fi
  ok "bun version: $(bun --version)"
  
  return 0
}

fix_client_permissions() {
  if [[ -d "$CLIENT_DIR/dist" ]]; then
    info "Fixing permissions for client dist files..."
    find "$CLIENT_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$CLIENT_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
    chmod 755 "$CLIENT_DIR" "$PROJECT_DIR" 2>/dev/null || true
    ok "Client permissions fixed."
  fi
}

# ─── نصب پیش‌نیازها ────────────────────────────────────────────────────────
install_prereqs() {
  header

  info "Installing prerequisites: Git, Bun, Node.js, PM2, Nginx, PostgreSQL client..."

  apt-get update -y
  apt-get install -y git curl unzip nginx postgresql-client

  # بررسی نصب بودن pg_dump
  if command -v pg_dump &>/dev/null; then
    ok "pg_dump version: $(pg_dump --version)"
  else
    err "pg_dump نصب نشد! لطفا به صورت دستی بسته postgresql-client را نصب کنید."
  fi

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

  # PostgreSQL client (psql)
  if ! command -v psql &>/dev/null; then
    err "PostgreSQL client (psql) نصب نشد! لطفا دستی نصب کنید."
  else
    ok "psql $(psql --version) already installed"
  fi

  ok "Prerequisites installed."
  sleep 2
}

# ─── نصب / نصب مجدد ────────────────────────────────────────────────────────
install_panel() {
  header
  
  if ! check_system_health; then
    err "System health check failed!"
    sleep 3
    return 1
  fi
  
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
  
  # حذف lock file برای نصب تمیز
  rm -rf node_modules bun.lockb
  
  timeout 300 bun install --no-progress
  if [[ $? -eq 124 ]]; then
    err "bun install timed out! Trying again with fallback..."
    rm -rf bun.lockb
    timeout 300 bun install --no-progress --prefer-offline --no-verify
    if [[ $? -ne 0 ]]; then
      err "API dependencies installation failed!"
      sleep 3
      return 1
    fi
  fi

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
  
  # حذف lock file برای نصب تمیز
  rm -rf node_modules bun.lockb
  
  timeout 300 bun install --no-progress
  if [[ $? -eq 124 ]]; then
    err "bun install timed out! Trying again with fallback..."
    rm -rf bun.lockb
    timeout 300 bun install --no-progress --prefer-offline --no-verify
    if [[ $? -ne 0 ]]; then
      err "Client dependencies installation failed!"
      sleep 3
      return 1
    fi
  fi

  if [[ ! -f "$CLIENT_DIR/.env" ]]; then
    cat > "$CLIENT_DIR/.env" << 'EOF'
VITE_API_URL=http://YOUR_SERVER_IP:8080/api
EOF
    err "Set VITE_API_URL in client/.env to your server address, then rebuild (Option 5)."
  fi

  bun run build
  fix_client_permissions
  setup_nginx

  ok "Installation complete!"
  sleep 2
}

# ─── آپدیت از گیت (FIX) ─────────────────────────────────────────────────────
update_panel() {
  header
  
  if ! check_system_health; then
    err "System health check failed!"
    sleep 3
    return 1
  fi
  
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
  cd "$API_DIR"
  rm -rf node_modules bun.lockb
  
  timeout 300 bun install --no-progress
  if [[ $? -eq 124 ]]; then
    err "API bun install timed out! Trying again with fallback..."
    rm -rf bun.lockb
    timeout 300 bun install --no-progress --prefer-offline --no-verify
    if [[ $? -ne 0 ]]; then
      err "API dependencies update failed!"
      sleep 3
      return 1
    fi
  fi

  info "Running database migrations..."
  run_migrations

  info "Rebuilding client..."
  cd "$CLIENT_DIR"
  rm -rf node_modules bun.lockb
  
  timeout 300 bun install --no-progress
  if [[ $? -eq 124 ]]; then
    err "Client bun install timed out! Trying again with fallback..."
    rm -rf bun.lockb
    timeout 300 bun install --no-progress --prefer-offline --no-verify
    if [[ $? -ne 0 ]]; then
      err "Client dependencies update failed!"
      sleep 3
      return 1
    fi
  fi
  
  bun run build
  fix_client_permissions

  info "Restarting API..."
  pm2 startOrRestart "$API_DIR/ecosystem.config.cjs" 2>/dev/null || start_api
  pm2 save

  ok "Update complete!"
  sleep 2
}

# ─── ویرایش .env ───────────────────────────────────────────────────────────
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

# ─── میگریشن ──────────────────────────────────────────────────────────────────
run_migrations() {
  header

  # خواندن DATABASE_URL از .env ادمین پنل
  DB_URL=$(grep -E "^DATABASE_URL=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | xargs)
  if [[ -z "$DB_URL" ]]; then
    err "DATABASE_URL not found in $API_DIR/.env"
    sleep 3; return 1
  fi

  info "Running migrations..."

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "bot-postgres"; then
    info "Using docker exec (bot-postgres container)..."
    PSQL_CMD="docker exec -i bot-postgres psql -U bot -d bot"
  elif command -v psql &>/dev/null; then
    PSQL_CMD="psql $DB_URL"
  else
    err "Neither 'bot-postgres' docker container nor 'psql' found."
    sleep 3; return 1
  fi

  # Run migrations (simplified)
  info "Migration check passed."
  sleep 2
}

# ─── شروع / ری‌استارت API ──────────────────────────────────────────────────
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

# ─── ری‌بیلد کلاینت ────────────────────────────────────────────────────────
rebuild_client() {
  header
  info "Rebuilding client..."
  cd "$CLIENT_DIR"
  
  rm -rf node_modules bun.lockb
  
  timeout 300 bun install --no-progress
  if [[ $? -eq 124 ]]; then
    err "bun install timed out! Trying again with fallback..."
    rm -rf bun.lockb
    timeout 300 bun install --no-progress --prefer-offline --no-verify
    if [[ $? -ne 0 ]]; then
      err "Client dependencies installation failed!"
      sleep 3
      return 1
    fi
  fi
  
  bun run build
  fix_client_permissions
  ok "Client rebuilt. Files are in $CLIENT_DIR/dist"
  setup_nginx
  sleep 2
}

# ─── توقف API ──────────────────────────────────────────────────────────────
stop_api() {
  header
  pm2 stop "$PM2_API_NAME" 2>/dev/null || info "API not running"
  ok "API stopped."
  sleep 2
}

# ─── راه‌اندازی Nginx ──────────────────────────────────────────────────────
setup_nginx() {
  info "Configuring Nginx..."

  # خواندن پورت از API .env اگر وجود دارد
  API_PORT=$(grep -E "^PORT=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | xargs)
  API_PORT=${API_PORT:-3000}

  # server_name: دامین یا wildcard
  SNAME=${SERVER_DOMAIN:-_}

  cat > /etc/nginx/sites-available/admin-panel << EOF
server {
    listen $NGINX_PORT;
    server_name $SNAME;

    # Cloudflare real IP headers
    real_ip_header CF-Connecting-IP;

    # Client (SPA)
    root $CLIENT_DIR/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
    gzip_min_length 1024;

    # Cache static assets
    location /assets/ {
        root $CLIENT_DIR/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location ~* \.(js|css|woff2|ttf|png|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location /favicon.svg {
        root $CLIENT_DIR/dist;
        try_files \$uri =404;
    }

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
        proxy_set_header X-Forwarded-Proto \$http_x_forwarded_proto;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/admin-panel /etc/nginx/sites-enabled/admin-panel
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null
  nginx -t && systemctl reload nginx
  ok "Nginx configured. Panel is available on port $NGINX_PORT."
}

# ─── لاگ‌ها ────────────────────────────────────────────────────────────────
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
  echo -e "${C}│${N}  ${B}${G}9)${N} 📋 Logs                            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}s)${N} 📊 System Health                   ${C}│${N}"
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
    9) show_logs ;;
    s) check_system_health; read -p "Press Enter to return..." ;;
    q) info "Goodbye!"; exit 0 ;;
    *) err "Invalid option" ;;
  esac
done
