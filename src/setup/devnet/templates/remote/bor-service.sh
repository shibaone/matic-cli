#!/usr/bin/env bash
set -euo pipefail

# Explicit paths for ubuntu user
UBUNTU_HOME="/home/ubuntu"
NODE_DIR="$UBUNTU_HOME/node"
BOR_HOME="/var/lib/bor"
BIN_DIR="$(go env GOPATH)/bin"
SERVICE_USER="ubuntu"

# Load nvm from ubuntu's home even if run as root
export NVM_DIR="$UBUNTU_HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

NODE_BIN="$(nvm which node)"
GO_BIN="$(go env GOROOT)/bin"
PATH="$NODE_BIN:$BIN_DIR:$GO_BIN:$PATH"

VALIDATOR_ADDRESS="$(cat "$NODE_DIR/bor/address.txt")"
FLAG="${1:-}"

# metadata file
cat > "$UBUNTU_HOME/metadata" <<EOF
VALIDATOR_ADDRESS=$VALIDATOR_ADDRESS
EOF

# bor.service
if [ "$FLAG" = "config" ]; then
  cat > bor.service <<EOF
[Unit]
Description=bor
StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
Restart=on-failure
RestartSec=5s
WorkingDirectory=$NODE_DIR
Environment=PATH=$PATH
EnvironmentFile=$UBUNTU_HOME/metadata
ExecStart=/bin/bash $NODE_DIR/bor-start-config.sh
Type=simple
User=$SERVICE_USER
KillSignal=SIGINT
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF
else
  cat > bor.service <<EOF
[Unit]
Description=bor
StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
Restart=on-failure
RestartSec=5s
WorkingDirectory=$NODE_DIR
Environment=PATH=$PATH
EnvironmentFile=$UBUNTU_HOME/metadata
ExecStart=/bin/bash $NODE_DIR/bor-start.sh
Type=simple
User=$SERVICE_USER
KillSignal=SIGINT
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF
fi

# heimdalld services
cat > heimdalld.service <<EOF
[Unit]
Description=heimdalld

[Service]
WorkingDirectory=$NODE_DIR
ExecStart=$BIN_DIR/heimdalld start --home /var/lib/heimdall --chain=/var/lib/heimdall/config/genesis.json --bridge --all --rest-server
Type=simple
User=$SERVICE_USER

[Install]
WantedBy=multi-user.target
EOF

cat > heimdalld-rest-server.service <<EOF
[Unit]
Description=heimdalld-rest-server

[Service]
WorkingDirectory=$NODE_DIR
ExecStart=$BIN_DIR/heimdalld rest-server
Type=simple
User=$SERVICE_USER

[Install]
WantedBy=multi-user.target
EOF

cat > heimdalld-bridge.service <<EOF
[Unit]
Description=heimdalld-bridge

[Service]
WorkingDirectory=$NODE_DIR
ExecStart=$BIN_DIR/bridge start --all
Type=simple
User=$SERVICE_USER

[Install]
WantedBy=multi-user.target
EOF
