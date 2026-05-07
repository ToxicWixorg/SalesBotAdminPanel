#!/bin/bash

R='\033[31m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; B='\033[1m'; W='\033[97m'; N='\033[0m'

PROJECT_DIR="/root/admin-panel"
API_DIR="$PROJECT_DIR/api"
CLIENT_DIR="$PROJECT_DIR/client"
PM2_API_NAME="admin-api"
REPO_URL="https://github.com/ToxicWixorg/SalesBotAdminPanel.git"
# اگر ریپوی جداگانه داری این را خالی بگذار
REPO_SUBDIR=""
# دامین سرور (خالی = فقط IP)
SERVER_DOMAIN=""
# پورت Nginx
NGINX_PORT=8080

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

  info "Running database migrations..."
  run_migrations

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

# ─── میگریشن ──────────────────────────────────────────────────────────────────
run_migrations() {
  header

  # خواندن DATABASE_URL از .env ادمین پنل
  DB_URL=$(grep -E "^DATABASE_URL=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | xargs)
  if [[ -z "$DB_URL" ]]; then
    err "DATABASE_URL not found in $API_DIR/.env"
    sleep 3; return 1
  fi

  info "Running migrations via psql..."

  psql "$DB_URL" << 'MIGRATIONS_EOF'
-- 0013: force_join_channels
CREATE TABLE IF NOT EXISTS "force_join_channels" (
  "id"           serial PRIMARY KEY,
  "channel_id"   text NOT NULL,
  "channel_url"  text NOT NULL,
  "channel_name" text NOT NULL,
  "is_active"    boolean NOT NULL DEFAULT true,
  "order"        integer NOT NULL DEFAULT 0,
  "created_at"   timestamp DEFAULT now(),
  "updated_at"   timestamp DEFAULT now()
);

-- 0014: payment_card_numbers + payment_settings
CREATE TABLE IF NOT EXISTS "payment_card_numbers" (
  "id"           serial PRIMARY KEY,
  "card_number"  text NOT NULL,
  "holder_name"  text NOT NULL,
  "bank_name"    text,
  "is_active"    boolean NOT NULL DEFAULT true,
  "order"        integer NOT NULL DEFAULT 0,
  "created_at"   timestamp DEFAULT now(),
  "updated_at"   timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id"                   serial PRIMARY KEY,
  "card_enabled"         boolean NOT NULL DEFAULT true,
  "zarinpal_enabled"     boolean NOT NULL DEFAULT false,
  "zarinpal_merchant_id" text,
  "zarinpal_sandbox"     boolean NOT NULL DEFAULT true,
  "crypto_enabled"       boolean NOT NULL DEFAULT false,
  "crypto_address"       text,
  "crypto_network"       text DEFAULT 'TRC20',
  "crypto_exchange_rate" integer NOT NULL DEFAULT 0,
  "updated_at"           timestamp DEFAULT now()
);

INSERT INTO "payment_settings" ("id","card_enabled","zarinpal_enabled","zarinpal_sandbox","crypto_enabled","crypto_network","crypto_exchange_rate")
VALUES (1, true, false, true, false, 'TRC20', 0)
ON CONFLICT ("id") DO NOTHING;

-- 0015: backup_settings
CREATE TABLE IF NOT EXISTS "backup_settings" (
  "id"                  serial PRIMARY KEY,
  "is_enabled"          boolean NOT NULL DEFAULT false,
  "telegram_channel_id" text,
  "cron_schedule"       text DEFAULT '0 3 * * *',
  "last_backup_at"      timestamp,
  "last_backup_status"  text,
  "last_backup_size"    integer,
  "updated_at"          timestamp DEFAULT now()
);

INSERT INTO "backup_settings" ("id","is_enabled","cron_schedule")
VALUES (1, false, '0 3 * * *')
ON CONFLICT ("id") DO NOTHING;

-- 0016: bot_settings
CREATE TABLE IF NOT EXISTS "bot_settings" (
  "id"                  serial PRIMARY KEY,
  "maintenance_mode"    boolean NOT NULL DEFAULT false,
  "maintenance_message" text,
  "referral_enabled"    boolean NOT NULL DEFAULT true,
  "shop_enabled"        boolean NOT NULL DEFAULT true,
  "updated_at"          timestamp DEFAULT now()
);

INSERT INTO "bot_settings" ("id","maintenance_mode","referral_enabled","shop_enabled")
VALUES (1, false, true, true)
ON CONFLICT ("id") DO NOTHING;
MIGRATIONS_EOF

  if [[ $? -eq 0 ]]; then
    ok "All migrations applied successfully!"
  else
    err "Migration failed — check DB connection or psql installation."
  fi
  sleep 3
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
    location ~* \.(js|css|woff2|ttf|png|svg|ico)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/;
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

# ─── SSL با acme.sh (DNS challenge) ──────────────────────────────────────────
setup_ssl() {
  header
  echo -e "${C}این گزینه با DNS Challenge کار می‌کند — نیازی به باز بودن پورت 80 نیست.${N}"
  echo -e "${Y}پیش‌نیاز: پورت 443 باید از طرف هاستینگ باز باشد.${N}"
  echo ""
  read -r -p "دامین خود را وارد کن (مثال: admin.example.ir): " ssl_domain
  [[ -z "$ssl_domain" ]] && { err "دامین خالی است."; sleep 2; return; }

  # نصب acme.sh اگر نیست
  if [[ ! -f ~/.acme.sh/acme.sh ]]; then
    info "Installing acme.sh..."
    curl -fsSL https://get.acme.sh | bash -s -- --email "admin@${ssl_domain}"
    # shellcheck disable=SC1090
    source ~/.bashrc
  fi
  ACME="${HOME}/.acme.sh/acme.sh"

  echo ""
  echo -e "${C}مرحله ۱: در حال دریافت TXT record مورد نیاز...${N}"
  "$ACME" --issue --dns -d "$ssl_domain" --yes-I-know-dns-manual-mode-enough-go-ahead-please 2>&1 | tee /tmp/acme_step1.txt

  echo ""
  echo -e "${C}┌─────────────────────────────────────────────────────┐${N}"
  echo -e "${C}│${N} در پنل DNS (ایران‌سرور) این TXT record را اضافه کن: ${C}│${N}"
  echo -e "${C}│${N}   Name: ${W}_acme-challenge.${ssl_domain}${N}           ${C}│${N}"
  echo -e "${C}│${N}   Type: ${W}TXT${N}                                       ${C}│${N}"
  echo -e "${C}│${N}   Value: به خروجی بالا (DCV value) نگاه کن         ${C}│${N}"
  echo -e "${C}└─────────────────────────────────────────────────────┘${N}"
  echo ""
  echo -e "${Y}بعد از اضافه کردن TXT record، چند دقیقه صبر کن تا DNS پروپاگیت بشه.${N}"
  read -r -p "آماده‌ای؟ Enter بزن تا گواهی صادر بشه..."

  # مرحله ۲: صدور گواهی
  info "در حال صدور گواهی SSL..."
  "$ACME" --renew -d "$ssl_domain" --yes-I-know-dns-manual-mode-enough-go-ahead-please

  CERT_DIR="${HOME}/.acme.sh/${ssl_domain}_ecc"
  [[ ! -d "$CERT_DIR" ]] && CERT_DIR="${HOME}/.acme.sh/${ssl_domain}"

  if [[ ! -f "$CERT_DIR/$ssl_domain.cer" ]]; then
    err "صدور گواهی ناموفق بود. TXT record را چک کن و دوباره امتحان کن."
    sleep 3; return
  fi

  # نصب گواهی در nginx
  mkdir -p /etc/nginx/ssl
  "$ACME" --install-cert -d "$ssl_domain" \
    --cert-file /etc/nginx/ssl/cert.pem \
    --key-file /etc/nginx/ssl/key.pem \
    --fullchain-file /etc/nginx/ssl/fullchain.pem \
    --reloadcmd "systemctl reload nginx"

  # پیکربندی Nginx برای HTTPS
  API_PORT=$(grep -E "^PORT=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | xargs)
  API_PORT=${API_PORT:-3000}

  # پورت HTTPS: اگر 443 بسته است از NGINX_PORT استفاده کن
  read -r -p "از پورت 443 استفاده کنم؟ (اگر بسته است n بزن — از پورت $NGINX_PORT استفاده می‌شود) [y/N]: " use_443
  if [[ "$use_443" =~ ^[Yy]$ ]]; then
    HTTPS_PORT=443
  else
    HTTPS_PORT=$NGINX_PORT
  fi

  cat > /etc/nginx/sites-available/admin-panel << EOF
server {
    listen $HTTPS_PORT ssl;
    server_name $ssl_domain;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root $CLIENT_DIR/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location ~* \.(js|css|woff2|ttf|png|svg|ico)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/admin-panel /etc/nginx/sites-enabled/admin-panel
  nginx -t && systemctl reload nginx

  # آپدیت .env
  if [[ $HTTPS_PORT -eq 443 ]]; then
    ORIGIN_URL="https://$ssl_domain"
  else
    ORIGIN_URL="https://$ssl_domain:$HTTPS_PORT"
  fi
  [[ -f "$API_DIR/.env" ]] && sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ORIGIN_URL|" "$API_DIR/.env"
  if [[ -f "$CLIENT_DIR/.env" ]]; then
    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$ORIGIN_URL/api|" "$CLIENT_DIR/.env"
  fi

  pm2 restart "$PM2_API_NAME" --update-env 2>/dev/null || true

  info "Rebuilding client with HTTPS URL..."
  cd "$CLIENT_DIR" && bun run build

  ok "HTTPS فعال شد!"
  echo -e "  سایت: ${W}$ORIGIN_URL${N}"
  echo -e "  ${Y}گواهی Let's Encrypt هر 90 روز منقضی می‌شود — گزینه r برای تجدید${N}"
  sleep 4
}

# ─── تجدید SSL ────────────────────────────────────────────────────────────────
renew_ssl() {
  header
  ACME="${HOME}/.acme.sh/acme.sh"
  if [[ ! -f "$ACME" ]]; then
    err "acme.sh نصب نیست. ابتدا SSL تنظیم کن (گزینه 8)."; sleep 2; return
  fi
  info "در حال تجدید گواهی..."
  "$ACME" --renew-all --yes-I-know-dns-manual-mode-enough-go-ahead-please
  systemctl reload nginx
  ok "تجدید انجام شد."
  sleep 2
}

# ─── setup دامین / HTTPS (Cloudflare) ────────────────────────────────────────
setup_domain() {
  header
  echo -e "${Y}این گزینه تنظیمات دامین را برای Cloudflare HTTPS آپدیت می‌کند.${N}"
  echo -e "${C}پیش‌نیاز:${N}"
  echo -e "  1) یک دامین داشته باشی (مثلاً admin.example.com)"
  echo -e "  2) دامین رو به IP ${W}77.223.214.210${N} پوینت کنی در Cloudflare"
  echo -e "  3) در Cloudflare، Proxy را ON کنی (ابر نارنجی)"
  echo ""
  read -r -p "دامین خود را وارد کن (مثال: admin.example.com): " input_domain
  [[ -z "$input_domain" ]] && { err "دامین خالی است."; sleep 2; return; }
  # validate: باید حداقل یک نقطه داشته باشد و فقط حروف/عدد/خط‌تیره/نقطه باشد
  if ! echo "$input_domain" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$'; then
    err "دامین نامعتبر است: '$input_domain'"
    err "مثال صحیح: admin.example.com"
    sleep 3; return
  fi

  SERVER_DOMAIN="$input_domain"
  ORIGIN_URL="https://$input_domain"

  # آپدیت API .env
  if [[ -f "$API_DIR/.env" ]]; then
    if grep -q "^ALLOWED_ORIGINS=" "$API_DIR/.env"; then
      sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ORIGIN_URL|" "$API_DIR/.env"
    else
      echo "ALLOWED_ORIGINS=$ORIGIN_URL" >> "$API_DIR/.env"
    fi
    ok "API .env آپدیت شد → ALLOWED_ORIGINS=$ORIGIN_URL"
  fi

  # آپدیت Client .env
  if [[ -f "$CLIENT_DIR/.env" ]]; then
    if grep -q "^VITE_API_URL=" "$CLIENT_DIR/.env"; then
      sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$ORIGIN_URL/api|" "$CLIENT_DIR/.env"
    else
      echo "VITE_API_URL=$ORIGIN_URL/api" >> "$CLIENT_DIR/.env"
    fi
    ok "Client .env آپدیت شد → VITE_API_URL=$ORIGIN_URL/api"
  fi

  # آپدیت Nginx
  setup_nginx

  # ری‌استارت API
  pm2 restart "$PM2_API_NAME" --update-env 2>/dev/null || true

  # ری‌بیلد کلاینت
  info "Rebuilding client with new API URL..."
  cd "$CLIENT_DIR" && bun run build

  echo ""
  ok "تنظیمات کامل شد!"
  echo -e "${C}حالا در Cloudflare:${N}"
  echo -e "  • A Record: ${W}$input_domain${N} → ${W}77.223.214.210${N} (Proxied ON)"
  echo -e "  • SSL/TLS mode: ${W}Flexible${N} (در Cloudflare dashboard)"
  echo -e "  • سایت: ${W}https://$input_domain${N}"
  sleep 4
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
  echo -e "${C}│${N}  ${B}${G}8)${N} � Setup Domain / HTTPS            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}9)${N} 📋 Logs                            ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}m)${N} 🗄️  Run DB Migrations              ${C}│${N}"
  echo -e "${C}│${N}  ${B}${G}s)${N} 📊 PM2 Status                      ${C}│${N}"
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
    8) setup_domain ;;
    9) show_logs ;;
    m) run_migrations ;;
    s) pm2 status; read -p "Press Enter to return..." ;;
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
