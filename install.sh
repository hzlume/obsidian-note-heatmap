#!/bin/bash
# Install plugin to specified Obsidian vault
# Usage: ./install.sh /path/to/your/vault

VAULT_PATH="${1}"

if [ -z "$VAULT_PATH" ]; then
  echo "Usage: ./install.sh /path/to/your/vault"
  echo "Example: ./install.sh ~/Documents/MyVault"
  exit 1
fi

PLUGIN_DIR="${VAULT_PATH}/.obsidian/plugins/obsidian-note-heatmap"

echo "📦 Installing Note Heatmap plugin..."
echo "   Target: ${PLUGIN_DIR}"

mkdir -p "${PLUGIN_DIR}"
cp main.js "${PLUGIN_DIR}/main.js"
cp manifest.json "${PLUGIN_DIR}/manifest.json"
cp styles.css "${PLUGIN_DIR}/styles.css"

echo "✅ Installation complete!"
echo "   Enable in Obsidian: Settings → Community Plugins → Note Heatmap"
