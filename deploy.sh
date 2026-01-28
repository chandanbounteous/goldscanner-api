#!/bin/bash

set -e

# Configuration
DOCKER_USERNAME="bluekanishk"
APP_NAME="goldscanner-api"
VERSION=${1:-"latest"}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🚀 Starting deployment process..."
echo "📦 Building: ${DOCKER_USERNAME}/${APP_NAME}:${VERSION}"
echo "📅 Build Date: ${BUILD_DATE}"
echo "📝 Git Commit: ${GIT_COMMIT}"

# Step 1: Clean up previous builds
echo "🧹 Cleaning up previous builds..."
docker system prune -f

# Step 2: Build the production image
echo "🏗️  Building Docker image..."
docker build \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  --build-arg GIT_COMMIT="${GIT_COMMIT}" \
  --tag ${DOCKER_USERNAME}/${APP_NAME}:${VERSION} \
  --tag ${DOCKER_USERNAME}/${APP_NAME}:latest \
  -f Dockerfile .

# Step 3: Test the built image locally
echo "🧪 Testing the built image..."
docker run --rm ${DOCKER_USERNAME}/${APP_NAME}:${VERSION} node --version
echo "✅ Image test passed!"

# Step 4: Login to Docker Hub
echo "🔑 Logging into Docker Hub..."
if ! docker info | grep -q "Username:"; then
  echo "Please login to Docker Hub:"
  docker login
fi

# Step 5: Push to Docker Hub
echo "📤 Pushing to Docker Hub..."
docker push ${DOCKER_USERNAME}/${APP_NAME}:${VERSION}
docker push ${DOCKER_USERNAME}/${APP_NAME}:latest

# Step 6: Create deployment manifest
echo "📋 Creating deployment manifest..."
cat > deployment-manifest.json << EOF
{
  "image": "${DOCKER_USERNAME}/${APP_NAME}:${VERSION}",
  "buildDate": "${BUILD_DATE}",
  "gitCommit": "${GIT_COMMIT}",
  "version": "${VERSION}",
  "deploymentInstructions": {
    "pullCommand": "docker pull ${DOCKER_USERNAME}/${APP_NAME}:${VERSION}",
    "envFile": ".env.example",
    "composeFile": "docker-compose.prod.yml",
    "startCommand": "docker-compose -f docker-compose.prod.yml up -d"
  }
}
EOF

echo "✅ Deployment completed successfully!"
echo "📖 Deployment manifest created: deployment-manifest.json"
echo ""
echo "🎯 Next steps for production deployment:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Run: docker pull ${DOCKER_USERNAME}/${APP_NAME}:${VERSION}"
echo "3. Run: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "🔍 Monitor deployment with:"
echo "   docker-compose -f docker-compose.prod.yml logs -f api"