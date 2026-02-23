#!/bin/bash
set -e

DOCKER_USERNAME=${DOCKER_USERNAME:-"bluekanishk"}
VERSION=${1:-"latest"}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "🚀 Building multi-platform production image: ${DOCKER_USERNAME}/goldscanner-api:${VERSION}"

# Create and use buildx builder for multi-platform builds
echo "🔧 Setting up buildx for multi-platform builds..."
docker buildx create --use --name goldscanner-builder --driver docker-container --bootstrap || docker buildx use goldscanner-builder

# Build and push multi-platform image (supports Windows Docker Desktop)
echo "🏗️ Building for multiple platforms (linux/amd64, linux/arm64)..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  -t ${DOCKER_USERNAME}/goldscanner-api:${VERSION} \
  -t ${DOCKER_USERNAME}/goldscanner-api:latest \
  -f Dockerfile \
  --push \
  .

# Test the image (pull and test locally)
echo "🧪 Testing production image..."
docker pull ${DOCKER_USERNAME}/goldscanner-api:${VERSION}
docker run --rm ${DOCKER_USERNAME}/goldscanner-api:${VERSION} node --version

echo "✅ Multi-platform deployment completed!"
echo "🎯 Pull with: docker pull ${DOCKER_USERNAME}/goldscanner-api:${VERSION}"
echo "🪟 Compatible with Windows Docker Desktop (linux/amd64, linux/arm64)"