#!/bin/bash

echo "🔧 Setting up GoldScanner API DEV testing environment..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Create .env.dev file if it doesn't exist
if [ ! -f .env.dev ]; then
    echo "📄 Creating .env.dev file from template..."
    cp .env.dev.example .env.dev
    echo "✅ Please review and update the .env.dev file with your configuration"
else
    echo "ℹ️  .env.dev already exists, skipping creation..."
fi

# Create logs directory
mkdir -p logs

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.dev.yml down

# Start full Docker stack
echo "🐳 Starting full Docker stack..."
docker-compose -f docker-compose.dev.yml --env-file .env.dev up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

echo "✅ DEV testing environment setup complete!"
echo ""
echo "🌐 API available at: http://localhost:3000"
echo "🔍 Check logs with: docker-compose -f docker-compose.dev.yml logs -f api"
echo "🛑 Stop with: docker-compose -f docker-compose.dev.yml down"