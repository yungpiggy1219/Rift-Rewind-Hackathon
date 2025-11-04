#!/bin/bash

echo "🎮 Setting up Rift Rewind for the hackathon..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env.local
    echo "⚠️  Don't forget to add your AWS credentials and Riot API key to .env.local"
fi

# Build the project to check for errors
echo "🏗️  Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your AWS credentials to .env.local"
echo "2. Get a Riot API key from https://developer.riotgames.com/"
echo "3. Run 'npm run dev' to start development"
echo "4. Open http://localhost:3000"
echo ""
echo "🚀 Happy hacking!"