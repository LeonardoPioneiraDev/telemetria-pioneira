#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DOCKERHUB_USER="felipebatista54"
IMAGE_NAME="telemetria-frontend"
FULL_IMAGE_NAME="$DOCKERHUB_USER/$IMAGE_NAME"
VERSION=${1:-"latest"}
DOCKERFILE="apps/frontend/Dockerfile.prod"

# Carregar .env.production se existir
if [ -f "apps/frontend/.env.production" ]; then
    export $(grep -v '^#' apps/frontend/.env.production | xargs)
fi

echo -e "${CYAN}🏗️  Building Frontend Docker Image${NC}"
echo -e "${CYAN}Version: $VERSION${NC}\n"

# Build
docker build \
    -f "$DOCKERFILE" \
    -t "$FULL_IMAGE_NAME:$VERSION" \
    -t "$FULL_IMAGE_NAME:latest" \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://telemetriaapi.vpioneira.com.br/api}" \
    --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Telemetria Pioneira}" \
    --build-arg NEXT_PUBLIC_APP_VERSION="${NEXT_PUBLIC_APP_VERSION:-1.0.0}" \
    --platform linux/amd64 \
    .

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Build concluído!${NC}"
    docker images "$FULL_IMAGE_NAME:$VERSION"
else
    echo -e "\n${RED}❌ Build falhou!${NC}"
    exit 1
fi

# Push
read -p "Push para DockerHub? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker push "$FULL_IMAGE_NAME:$VERSION"
    docker push "$FULL_IMAGE_NAME:latest"
    echo -e "\n${GREEN}✅ Push concluído!${NC}"
fi