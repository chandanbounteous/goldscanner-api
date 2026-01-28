#!/bin/bash

echo "🚀 Setting up GoldScanner API PRODUCTION environment..."

# Create .env.prod file if it doesn't exist
if [ ! -f .env.prod ]; then
    echo "📄 Creating .env.prod file from template..."
    cp .env.prod.example .env.prod
    echo "⚠️  IMPORTANT: Please update .env.prod with secure production values!"
    echo "🔐 Make sure to change all passwords and secrets!"
    exit 1
fi

# Validate critical environment variables
source .env.prod

if [[ "$JWT_SECRET" == *"CHANGE_THIS"* ]] || [[ "$POSTGRES_PASSWORD" == *"CHANGE_THIS"* ]]; then
    echo "❌ Please update the security credentials in .env.prod before proceeding!"
    exit 1
fi

# Pull latest image from Docker Hub
echo "📥 Pulling latest production image..."
docker pull ${DOCKER_USERNAME}/goldscanner-api:${VERSION}

# Start production stack
echo "🚀 Starting production stack..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

echo "✅ PRODUCTION environment setup complete!"
echo "🌐 API available at: http://localhost:3000"
echo "🔍 Check logs with: docker-compose -f docker-compose.prod.yml logs -f api"