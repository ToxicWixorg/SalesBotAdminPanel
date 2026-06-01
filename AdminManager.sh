#!/bin/bash

R='\033[31m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; B='\033[1m'; W='\033[97m'; N='\033[0m'

PROJECT_DIR="/root/proj/admin-panel-demo"
API_DIR="$PROJECT_DIR/api"
CLIENT_DIR="$PROJECT_DIR/client"
PM2_API_NAME="admin-api-demo"
REPO_URL="https://github.com/ToxicWixorg/SalesBotAdminPanel.git"
# Ø§Ú¯Ø± Ø±ÛŒÙ¾ÙˆÛŒ Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø¯Ø§Ø±ÛŒ Ø§ÛŒÙ† Ø±Ø§ Ø®Ø§Ù„ÛŒ Ø¨Ú¯Ø°Ø§Ø±
REPO_SUBDIR=""
# Ø¯Ø§Ù…ÛŒÙ† Ø³Ø±ÙˆØ± (Ø®Ø§Ù„ÛŒ = ÙÙ‚Ø· IP)
SERVER_DOMAIN=""
# Ù¾ÙˆØ±Øª Nginx
NGINX_PORT=8080

header() {
  clear
  echo -e "${C}â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—${N}"
  echo -e "${C}â•‘${N}      ${W}${B}âš¡ Admin Panel Manager âš¡${N}                                      ${C}â•‘${N}"
  echo -e "${C}â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£${N}"
  echo -e "${C}â•‘${N}   ${B}${G}Project Path:${N}  $PROJECT_DIR                                     ${C}â•‘${N}"
  echo -e "${C}â•‘${N}   ${B}${G}API Status:${N}    $(get_api_status)                                       ${C}â•‘${N}"
  echo -e "${C}â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•${N}"
  echo ""
}

get_api_status() {
  if pm2 jlist 2>/dev/null | grep -q "\"name\":\"$PM2_API_NAME\"" && \
     pm2 jlist 2>/dev/null | grep -q "\"status\":\"online\""; then
    echo -e "${G}ðŸŸ¢ Online${N}"
  else
    echo -e "${R}ðŸ”´ Offline${N}"
  fi
}

info() { echo -e "${Y}âžœ $*${N}"; }
ok()   { echo -e "${G}âœ“ $*${N}"; }
err()  { echo -e "${R}âœ— $*${N}"; }

# â”€â”€â”€ Û°. Ù†ØµØ¨ Ù¾ÛŒØ´â€ŒÙ†ÛŒØ§Ø²Ù‡Ø§ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
install_prereqs() {
  header

  info "Installing prerequisites: Git, Bun, Node.js, PM2, Nginx, PostgreSQL client..."


  apt-get update -y
  apt-get install -y git curl unzip nginx postgresql-client

  # Ø¨Ø±Ø±Ø³ÛŒ Ù†ØµØ¨ Ø¨ÙˆØ¯Ù† pg_dump
  if command -v pg_dump &>/dev/null; then
    ok "pg_dump version: $(pg_dump --version)"
  else
    err "pg_dump Ù†ØµØ¨ Ù†Ø´Ø¯! Ù„Ø·ÙØ§ Ø¨Ù‡ ØµÙˆØ±Øª Ø¯Ø³ØªÛŒ Ø¨Ø³ØªÙ‡ postgresql-client Ø±Ø§ Ù†ØµØ¨ Ú©Ù†ÛŒØ¯."
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
    err "PostgreSQL client (psql) Ù†ØµØ¨ Ù†Ø´Ø¯! Ù„Ø·ÙØ§ Ø¯Ø³ØªÛŒ Ù†ØµØ¨ Ú©Ù†ÛŒØ¯."
  else
    ok "psql $(psql --version) already installed"
  fi

  ok "Prerequisites installed."
  sleep 2
}

# â”€â”€â”€ Û±. Ù†ØµØ¨ / Ù†ØµØ¨ Ù…Ø¬Ø¯Ø¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
install_panel() {
  header
  info "Cloning repository..."

  TMPDIR=$(mktemp -d)
  git clone "$REPO_URL" "$TMPDIR/repo"

  # Ø§Ú¯Ø± admin-panel Ø¯Ø± ÛŒÚ© Ø²ÛŒØ±Ù¾ÙˆØ´Ù‡ Ø§Ø³Øª Ø¢Ù† Ø±Ø§ Ø¬Ø§Ø¨Ø¬Ø§ Ú©Ù†
  if [[ -n "$REPO_SUBDIR" && -d "$TMPDIR/repo/$REPO_SUBDIR" ]]; then
    rm -rf "$PROJECT_DIR"
    mv "$TMPDIR/repo/$REPO_SUBDIR" "$PROJECT_DIR"
  else
    rm -rf "$PROJECT_DIR"
    mv "$TMPDIR/repo" "$PROJECT_DIR"
  fi
  rm -rf "$TMPDIR"

  # â”€â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
# Origins Ø¬Ø¯Ø§ Ø´Ø¯Ù‡ Ø¨Ø§ Ú©Ø§Ù…Ø§ (Ø¯Ø§Ù…Ù†Ù‡ ÛŒØ§ IP Ø§Ø¯Ù…ÛŒÙ† Ù¾Ù†Ù„)
ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP
EOF
    err "Fill in API .env (Option 3) before starting."
  fi

  # â”€â”€â”€ Client (build) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  info "Installing client dependencies & building..."
  cd "$CLIENT_DIR"
  bun install

  if [[ ! -f "$CLIENT_DIR/.env" ]]; then
    cat > "$CLIENT_DIR/.env" << 'EOF'
  VITE_API_URL=http://YOUR_SERVER_IP:8080
EOF
    err "Set VITE_API_URL in client/.env to your server address, then rebuild (Option 5)."
  fi

  bun run build

  # â”€â”€â”€ Nginx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  setup_nginx

  ok "Installation complete!"
  sleep 2
}

# â”€â”€â”€ Û². Ø¢Ù¾Ø¯ÛŒØª Ø§Ø² Ú¯ÛŒØª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  # Ø­ÙØ¸ .env ÙØ§ÛŒÙ„â€ŒÙ‡Ø§
  [[ -f "$API_DIR/.env" ]]    && cp "$API_DIR/.env"    /tmp/api.env.bak
  [[ -f "$CLIENT_DIR/.env" ]] && cp "$CLIENT_DIR/.env" /tmp/client.env.bak

  # Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ Ú©Ø¯
  rm -rf "$PROJECT_DIR"
  mv "$SRC" "$PROJECT_DIR"
  rm -rf "$TMPDIR"

  # Ø¨Ø±Ú¯Ø±Ø¯Ø§Ù†Ø¯Ù† .env
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

# â”€â”€â”€ Û³. ÙˆÛŒØ±Ø§ÛŒØ´ .env â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
edit_env() {
  header
  echo -e "${C}â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”${N}"
  echo -e "${C}â”‚${N}  ${B}${G}1)${N} Edit API .env               ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}2)${N} Edit Client .env            ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${W}b)${N} Back                        ${C}â”‚${N}"
  echo -e "${C}â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜${N}"
  read -r -p "Select: " e
  case $e in
    1) nano "$API_DIR/.env" ;;
    2) nano "$CLIENT_DIR/.env" ;;
    b) return ;;
  esac
}

# â”€â”€â”€ Ù…ÛŒÚ¯Ø±ÛŒØ´Ù† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
run_migrations() {
  header

  # Ø®ÙˆØ§Ù†Ø¯Ù† DATABASE_URL Ø§Ø² .env Ø§Ø¯Ù…ÛŒÙ† Ù¾Ù†Ù„
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

  $PSQL_CMD << 'MIGRATIONS_EOF'
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
    err "Migration failed â€” check DB connection or psql installation."
  fi
  sleep 3
}

# â”€â”€â”€ Û´. Ø´Ø±ÙˆØ¹ / Ø±ÛŒâ€ŒØ§Ø³ØªØ§Ø±Øª API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
start_api() {
  header
  if [[ ! -f "$API_DIR/.env" ]]; then
    err "API .env not found. Install first (Option 1)."; sleep 2; return; fi

  # Ø¨Ø±Ø±Ø³ÛŒ Ù…ØªØºÛŒØ±Ù‡Ø§ÛŒ Ø§Ø¬Ø¨Ø§Ø±ÛŒ
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

# â”€â”€â”€ Ûµ. Ø±ÛŒâ€ŒØ¨ÛŒÙ„Ø¯ Ú©Ù„Ø§ÛŒÙ†Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

# â”€â”€â”€ Û¶. ØªÙˆÙ‚Ù API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
stop_api() {
  header
  pm2 stop "$PM2_API_NAME" 2>/dev/null || info "API not running"
  ok "API stopped."
  sleep 2
}

# â”€â”€â”€ Û·. Ø±Ø§Ù‡â€ŒØ§Ù†Ø¯Ø§Ø²ÛŒ Nginx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setup_nginx() {
  info "Configuring Nginx..."

  # Ø®ÙˆØ§Ù†Ø¯Ù† Ù¾ÙˆØ±Øª Ø§Ø² API .env Ø§Ú¯Ø± ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø±Ø¯
  API_PORT=$(grep -E "^PORT=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | xargs)
  API_PORT=${API_PORT:-3000}

  # server_name: Ø¯Ø§Ù…ÛŒÙ† ÛŒØ§ wildcard
  SNAME=${SERVER_DOMAIN:-_}

  cat > /etc/nginx/sites-available/admin-panel-demo << EOF
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
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$http_x_forwarded_proto;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/admin-panel-demo /etc/nginx/sites-enabled/admin-panel-demo
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null
  nginx -t && systemctl reload nginx
  ok "Nginx configured. Panel is available on port $NGINX_PORT."
}

# â”€â”€â”€ SSL Ø¨Ø§ acme.sh (DNS challenge) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setup_ssl() {
  header
  echo -e "${C}Ø§ÛŒÙ† Ú¯Ø²ÛŒÙ†Ù‡ Ø¨Ø§ DNS Challenge Ú©Ø§Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯ â€” Ù†ÛŒØ§Ø²ÛŒ Ø¨Ù‡ Ø¨Ø§Ø² Ø¨ÙˆØ¯Ù† Ù¾ÙˆØ±Øª 80 Ù†ÛŒØ³Øª.${N}"
  echo -e "${Y}Ù¾ÛŒØ´â€ŒÙ†ÛŒØ§Ø²: Ù¾ÙˆØ±Øª 443 Ø¨Ø§ÛŒØ¯ Ø§Ø² Ø·Ø±Ù Ù‡Ø§Ø³ØªÛŒÙ†Ú¯ Ø¨Ø§Ø² Ø¨Ø§Ø´Ø¯.${N}"
  echo ""
  read -r -p "Ø¯Ø§Ù…ÛŒÙ† Ø®ÙˆØ¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù† (Ù…Ø«Ø§Ù„: admin.example.ir): " ssl_domain
  [[ -z "$ssl_domain" ]] && { err "Ø¯Ø§Ù…ÛŒÙ† Ø®Ø§Ù„ÛŒ Ø§Ø³Øª."; sleep 2; return; }

  # Ù†ØµØ¨ acme.sh Ø§Ú¯Ø± Ù†ÛŒØ³Øª
  if [[ ! -f ~/.acme.sh/acme.sh ]]; then
    info "Installing acme.sh..."
    curl -fsSL https://get.acme.sh | bash -s -- --email "admin@${ssl_domain}"
    # shellcheck disable=SC1090
    source ~/.bashrc
  fi
  ACME="${HOME}/.acme.sh/acme.sh"

  echo ""
  echo -e "${C}Ù…Ø±Ø­Ù„Ù‡ Û±: Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª TXT record Ù…ÙˆØ±Ø¯ Ù†ÛŒØ§Ø²...${N}"
  "$ACME" --issue --dns -d "$ssl_domain" --yes-I-know-dns-manual-mode-enough-go-ahead-please 2>&1 | tee /tmp/acme_step1.txt

  echo ""
  echo -e "${C}â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”${N}"
  echo -e "${C}â”‚${N} Ø¯Ø± Ù¾Ù†Ù„ DNS (Ø§ÛŒØ±Ø§Ù†â€ŒØ³Ø±ÙˆØ±) Ø§ÛŒÙ† TXT record Ø±Ø§ Ø§Ø¶Ø§ÙÙ‡ Ú©Ù†: ${C}â”‚${N}"
  echo -e "${C}â”‚${N}   Name: ${W}_acme-challenge.${ssl_domain}${N}           ${C}â”‚${N}"
  echo -e "${C}â”‚${N}   Type: ${W}TXT${N}                                       ${C}â”‚${N}"
  echo -e "${C}â”‚${N}   Value: Ø¨Ù‡ Ø®Ø±ÙˆØ¬ÛŒ Ø¨Ø§Ù„Ø§ (DCV value) Ù†Ú¯Ø§Ù‡ Ú©Ù†         ${C}â”‚${N}"
  echo -e "${C}â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜${N}"
  echo ""
  echo -e "${Y}Ø¨Ø¹Ø¯ Ø§Ø² Ø§Ø¶Ø§ÙÙ‡ Ú©Ø±Ø¯Ù† TXT recordØŒ Ú†Ù†Ø¯ Ø¯Ù‚ÛŒÙ‚Ù‡ ØµØ¨Ø± Ú©Ù† ØªØ§ DNS Ù¾Ø±ÙˆÙ¾Ø§Ú¯ÛŒØª Ø¨Ø´Ù‡.${N}"
  read -r -p "Ø¢Ù…Ø§Ø¯Ù‡â€ŒØ§ÛŒØŸ Enter Ø¨Ø²Ù† ØªØ§ Ú¯ÙˆØ§Ù‡ÛŒ ØµØ§Ø¯Ø± Ø¨Ø´Ù‡..."

  # Ù…Ø±Ø­Ù„Ù‡ Û²: ØµØ¯ÙˆØ± Ú¯ÙˆØ§Ù‡ÛŒ
  info "Ø¯Ø± Ø­Ø§Ù„ ØµØ¯ÙˆØ± Ú¯ÙˆØ§Ù‡ÛŒ SSL..."
  "$ACME" --renew -d "$ssl_domain" --yes-I-know-dns-manual-mode-enough-go-ahead-please

  CERT_DIR="${HOME}/.acme.sh/${ssl_domain}_ecc"
  [[ ! -d "$CERT_DIR" ]] && CERT_DIR="${HOME}/.acme.sh/${ssl_domain}"

  if [[ ! -f "$CERT_DIR/$ssl_domain.cer" ]]; then
    err "ØµØ¯ÙˆØ± Ú¯ÙˆØ§Ù‡ÛŒ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯. TXT record Ø±Ø§ Ú†Ú© Ú©Ù† Ùˆ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ù…ØªØ­Ø§Ù† Ú©Ù†."
    sleep 3; return
  fi

  # Ù†ØµØ¨ Ú¯ÙˆØ§Ù‡ÛŒ Ø¯Ø± nginx
  mkdir -p /etc/nginx/ssl
  "$ACME" --install-cert -d "$ssl_domain" \
    --cert-file /etc/nginx/ssl/cert.pem \
    --key-file /etc/nginx/ssl/key.pem \
    --fullchain-file /etc/nginx/ssl/fullchain.pem \
    --reloadcmd "systemctl reload nginx"

  # Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Nginx Ø¨Ø±Ø§ÛŒ HTTPS
  API_PORT=$(grep -E "^PORT=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | xargs)
  API_PORT=${API_PORT:-3000}

  # Ù¾ÙˆØ±Øª HTTPS: Ø§Ú¯Ø± 443 Ø¨Ø³ØªÙ‡ Ø§Ø³Øª Ø§Ø² NGINX_PORT Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†
  read -r -p "Ø§Ø² Ù¾ÙˆØ±Øª 443 Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†Ù…ØŸ (Ø§Ú¯Ø± Ø¨Ø³ØªÙ‡ Ø§Ø³Øª n Ø¨Ø²Ù† â€” Ø§Ø² Ù¾ÙˆØ±Øª $NGINX_PORT Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯) [y/N]: " use_443
  if [[ "$use_443" =~ ^[Yy]$ ]]; then
    HTTPS_PORT=443
  else
    HTTPS_PORT=$NGINX_PORT
  fi

  cat > /etc/nginx/sites-available/admin-panel-demo << EOF
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

  ln -sf /etc/nginx/sites-available/admin-panel-demo /etc/nginx/sites-enabled/admin-panel-demo
  nginx -t && systemctl reload nginx

  # Ø¢Ù¾Ø¯ÛŒØª .env
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

  ok "HTTPS ÙØ¹Ø§Ù„ Ø´Ø¯!"
  echo -e "  Ø³Ø§ÛŒØª: ${W}$ORIGIN_URL${N}"
  echo -e "  ${Y}Ú¯ÙˆØ§Ù‡ÛŒ Let's Encrypt Ù‡Ø± 90 Ø±ÙˆØ² Ù…Ù†Ù‚Ø¶ÛŒ Ù…ÛŒâ€ŒØ´ÙˆØ¯ â€” Ú¯Ø²ÛŒÙ†Ù‡ r Ø¨Ø±Ø§ÛŒ ØªØ¬Ø¯ÛŒØ¯${N}"
  sleep 4
}

# â”€â”€â”€ ØªØ¬Ø¯ÛŒØ¯ SSL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
renew_ssl() {
  header
  ACME="${HOME}/.acme.sh/acme.sh"
  if [[ ! -f "$ACME" ]]; then
    err "acme.sh Ù†ØµØ¨ Ù†ÛŒØ³Øª. Ø§Ø¨ØªØ¯Ø§ SSL ØªÙ†Ø¸ÛŒÙ… Ú©Ù† (Ú¯Ø²ÛŒÙ†Ù‡ 8)."; sleep 2; return
  fi
  info "Ø¯Ø± Ø­Ø§Ù„ ØªØ¬Ø¯ÛŒØ¯ Ú¯ÙˆØ§Ù‡ÛŒ..."
  "$ACME" --renew-all --yes-I-know-dns-manual-mode-enough-go-ahead-please
  systemctl reload nginx
  ok "ØªØ¬Ø¯ÛŒØ¯ Ø§Ù†Ø¬Ø§Ù… Ø´Ø¯."
  sleep 2
}

# â”€â”€â”€ setup Ø¯Ø§Ù…ÛŒÙ† / HTTPS (Cloudflare) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setup_domain() {
  header
  echo -e "${Y}Ø§ÛŒÙ† Ú¯Ø²ÛŒÙ†Ù‡ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø¯Ø§Ù…ÛŒÙ† Ø±Ø§ Ø¨Ø±Ø§ÛŒ Cloudflare HTTPS Ø¢Ù¾Ø¯ÛŒØª Ù…ÛŒâ€ŒÚ©Ù†Ø¯.${N}"
  echo -e "${C}Ù¾ÛŒØ´â€ŒÙ†ÛŒØ§Ø²:${N}"
  echo -e "  1) ÛŒÚ© Ø¯Ø§Ù…ÛŒÙ† Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´ÛŒ (Ù…Ø«Ù„Ø§Ù‹ admin.example.com)"
  echo -e "  2) Ø¯Ø§Ù…ÛŒÙ† Ø±Ùˆ Ø¨Ù‡ IP ${W}77.223.214.210${N} Ù¾ÙˆÛŒÙ†Øª Ú©Ù†ÛŒ Ø¯Ø± Cloudflare"
  echo -e "  3) Ø¯Ø± CloudflareØŒ Proxy Ø±Ø§ ON Ú©Ù†ÛŒ (Ø§Ø¨Ø± Ù†Ø§Ø±Ù†Ø¬ÛŒ)"
  echo ""
  read -r -p "Ø¯Ø§Ù…ÛŒÙ† Ø®ÙˆØ¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù† (Ù…Ø«Ø§Ù„: admin.example.com): " input_domain
  [[ -z "$input_domain" ]] && { err "Ø¯Ø§Ù…ÛŒÙ† Ø®Ø§Ù„ÛŒ Ø§Ø³Øª."; sleep 2; return; }
  # validate: Ø¨Ø§ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© Ù†Ù‚Ø·Ù‡ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯ Ùˆ ÙÙ‚Ø· Ø­Ø±ÙˆÙ/Ø¹Ø¯Ø¯/Ø®Ø·â€ŒØªÛŒØ±Ù‡/Ù†Ù‚Ø·Ù‡ Ø¨Ø§Ø´Ø¯
  if ! echo "$input_domain" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$'; then
    err "Ø¯Ø§Ù…ÛŒÙ† Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª: '$input_domain'"
    err "Ù…Ø«Ø§Ù„ ØµØ­ÛŒØ­: admin.example.com"
    sleep 3; return
  fi

  SERVER_DOMAIN="$input_domain"
  ORIGIN_URL="https://$input_domain"

  # Ø¢Ù¾Ø¯ÛŒØª API .env
  if [[ -f "$API_DIR/.env" ]]; then
    if grep -q "^ALLOWED_ORIGINS=" "$API_DIR/.env"; then
      sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ORIGIN_URL|" "$API_DIR/.env"
    else
      echo "ALLOWED_ORIGINS=$ORIGIN_URL" >> "$API_DIR/.env"
    fi
    ok "API .env Ø¢Ù¾Ø¯ÛŒØª Ø´Ø¯ â†’ ALLOWED_ORIGINS=$ORIGIN_URL"
  fi

  # Ø¢Ù¾Ø¯ÛŒØª Client .env
  if [[ -f "$CLIENT_DIR/.env" ]]; then
    if grep -q "^VITE_API_URL=" "$CLIENT_DIR/.env"; then
      sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$ORIGIN_URL/api|" "$CLIENT_DIR/.env"
    else
      echo "VITE_API_URL=$ORIGIN_URL/api" >> "$CLIENT_DIR/.env"
    fi
    ok "Client .env Ø¢Ù¾Ø¯ÛŒØª Ø´Ø¯ â†’ VITE_API_URL=$ORIGIN_URL/api"
  fi

  # Ø¢Ù¾Ø¯ÛŒØª Nginx
  setup_nginx

  # Ø±ÛŒâ€ŒØ§Ø³ØªØ§Ø±Øª API
  pm2 restart "$PM2_API_NAME" --update-env 2>/dev/null || true

  # Ø±ÛŒâ€ŒØ¨ÛŒÙ„Ø¯ Ú©Ù„Ø§ÛŒÙ†Øª
  info "Rebuilding client with new API URL..."
  cd "$CLIENT_DIR" && bun run build

  echo ""
  ok "ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ú©Ø§Ù…Ù„ Ø´Ø¯!"
  echo -e "${C}Ø­Ø§Ù„Ø§ Ø¯Ø± Cloudflare:${N}"
  echo -e "  â€¢ A Record: ${W}$input_domain${N} â†’ ${W}77.223.214.210${N} (Proxied ON)"
  echo -e "  â€¢ SSL/TLS mode: ${W}Flexible${N} (Ø¯Ø± Cloudflare dashboard)"
  echo -e "  â€¢ Ø³Ø§ÛŒØª: ${W}https://$input_domain${N}"
  sleep 4
}

# â”€â”€â”€ Û¸. Ù„Ø§Ú¯â€ŒÙ‡Ø§ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
show_logs() {
  echo -e "${C}â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”${N}"
  echo -e "${C}â”‚${N}  ${B}${G}1)${N} Live logs                   ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}2)${N} Last 100 lines              ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}3)${N} Nginx error log             ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${W}b)${N} Back                        ${C}â”‚${N}"
  echo -e "${C}â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜${N}"
  read -r -p "Select: " l
  case $l in
    1) pm2 logs "$PM2_API_NAME" ;;
    2) pm2 logs "$PM2_API_NAME" --lines 100 --nostream ;;
    3) tail -n 50 /var/log/nginx/error.log ;;
    b) return ;;
  esac
}

# â”€â”€â”€ Ù…Ù†ÙˆÛŒ Ø§ØµÙ„ÛŒ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
while true; do
  header
  echo -e "${C}â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”${N}"
  echo -e "${C}â”‚${N}  ${B}${G}0)${N} ðŸ› ï¸  Install Prerequisites           ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}1)${N} ðŸ“¥ Install / Reinstall Panel       ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}2)${N} ðŸ”„ Update from GitHub              ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}3)${N} âœï¸  Edit .env settings              ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}4)${N} â–¶ï¸  Start / Restart API             ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}5)${N} ðŸ”¨ Rebuild Client (frontend)       ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}6)${N} â¹ï¸  Stop API                       ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}7)${N} ðŸŒ Setup / Reload Nginx            ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}8)${N} ï¿½ Setup Domain / HTTPS            ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}9)${N} ðŸ“‹ Logs                            ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}m)${N} ðŸ—„ï¸  Run DB Migrations              ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${G}s)${N} ðŸ“Š PM2 Status                      ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${R}d)${N} ðŸ—‘ï¸  Remove Project                 ${C}â”‚${N}"
  echo -e "${C}â”‚${N}  ${B}${R}q)${N} ðŸšª Exit                            ${C}â”‚${N}"
  echo -e "${C}â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜${N}"
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
        rm -f /etc/nginx/sites-enabled/admin-panel-demo
        rm -f /etc/nginx/sites-available/admin-panel-demo
        nginx -t && systemctl reload nginx
        ok "Removed."
      fi
      sleep 2
      ;;
    q) exit 0 ;;
    *) echo "Invalid option"; sleep 1 ;;
  esac
done

