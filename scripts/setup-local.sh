#!/bin/bash

echo "🔧 Setting up GoldScanner API LOCAL development environment..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local file from template..."
    cp .env.local.example .env.local
    echo "✅ Please review and update the .env.local file with your configuration"
else
    echo "ℹ️  .env.local already exists, skipping creation..."
fi

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Start only PostgreSQL and Redis in Docker
echo "🐳 Starting Docker services (PostgreSQL + Redis only)..."
docker-compose -f docker-compose.local.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose -f docker-compose.local.yml exec postgres pg_isready -U goldscanner_user -d goldscanner_db; do
  sleep 1
done

# Load local environment
export $(cat .env.local | grep -v '#' | xargs)

# Generate Prisma client
echo "🔗 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

echo "✅ LOCAL development environment setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📊 To access database management:"
echo "   npx prisma studio"