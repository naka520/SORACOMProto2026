#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <resource-group-name> <subscription-id> [location] [parameters-file]"
  echo "Example: $0 rg-monooki-dev <subscription-id> japaneast infra/main.parameters.json"
  exit 1
fi

RG_NAME="$1"
SUBSCRIPTION_ID="$2"
LOCATION="${3:-japaneast}"
PARAM_FILE="${4:-infra/main.parameters.json}"

az account set --subscription "$SUBSCRIPTION_ID"

if ! az group show --name "$RG_NAME" >/dev/null 2>&1; then
  az group create --name "$RG_NAME" --location "$LOCATION" >/dev/null
fi

az deployment group create \
  --resource-group "$RG_NAME" \
  --template-file infra/main.bicep \
  --parameters "$PARAM_FILE"
