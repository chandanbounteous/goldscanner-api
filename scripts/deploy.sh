#!/bin/bash
set -e

DOCKER_USERNAME=${DOCKER_USERNAME:-"bluekanishk"}
VERSION=${1:-"latest"}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "🚀 Building production image: ${DOCKER_USERNAME}/goldscanner-api:${VERSION}"

# Build production image
docker build \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  -t ${DOCKER_USERNAME}/goldscanner-api:${VERSION} \
  -t ${DOCKER_USERNAME}/goldscanner-api:latest \
  -f Dockerfile .

# Test the image
echo "🧪 Testing production image..."
docker run --rm ${DOCKER_USERNAME}/goldscanner-api:${VERSION} node --version

# Push to Docker Hub
echo "📤 Pushing to Docker Hub..."
docker login
docker push ${DOCKER_USERNAME}/goldscanner-api:${VERSION}
docker push ${DOCKER_USERNAME}/goldscanner-api:latest

echo "✅ Deployment completed!"
echo "🎯 Pull with: docker pull ${DOCKER_USERNAME}/goldscanner-api:${VERSION}"