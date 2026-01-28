#!/bin/bash

# GoldScanner API Development Setup Script

echo "🔧 Setting up GoldScanner API development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Please review and update the .env file with your configuration"
fi

# Create logs directory
mkdir -p logs

# Start Docker services for development
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U goldscanner_user -d goldscanner_db_dev; do
  sleep 1
done

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Generate Prisma client
echo "🔗 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name init

# Seed database (optional)
echo "🌱 Seeding database..."
# npx prisma db seed (uncomment when seed file is created)

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📚 API documentation will be available at:"
echo "   http://localhost:3000/api-docs"
echo ""
echo "🏥 Health check endpoint:"
echo "   http://localhost:3000/api/v1/health"
echo ""
echo "🗄️ Database management:"
echo "   npx prisma studio"