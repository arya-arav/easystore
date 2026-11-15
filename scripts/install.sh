#!/usr/bin/env bash
# EasyStore one-line installer for Ubuntu/Debian servers.
#   curl -fsSL https://raw.githubusercontent.com/arya-arav/easystore/main/scripts/install.sh | bash
set -euo pipefail

REPO="${EASYSTORE_REPO:-https://github.com/arya-arav/easystore.git}"
DIR="${EASYSTORE_DIR:-$HOME/easystore}"
PORT="${PORT:-3000}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v git >/dev/null 2>&1; then
  say "Installing git…"
  (sudo apt-get update -y && sudo apt-get install -y git) || { echo "Please install git and run again."; exit 1; }
fi

DOCKER="docker"
if ! docker info >/dev/null 2>&1; then DOCKER="sudo docker"; fi

if [ -d "$DIR/.git" ]; then
  say "Updating EasyStore in $DIR…"
  git -C "$DIR" pull --ff-only
else
  say "Downloading EasyStore to $DIR…"
  git clone --depth 1 "$REPO" "$DIR"
fi
cd "$DIR"

if [ ! -f .env ]; then
  say "Creating .env with a random database password…"
  cat > .env <<ENV
POSTGRES_PASSWORD=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
PORT=$PORT
# SITE_URL=https://shop.example.com
ENV
fi

say "Building and starting (first build takes a few minutes)…"
$DOCKER compose up -d --build

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
say "EasyStore is starting at http://${IP:-localhost}:$PORT"
echo "Open it in your browser to run the setup wizard."
echo "Logs: cd $DIR && $DOCKER compose logs -f app"
