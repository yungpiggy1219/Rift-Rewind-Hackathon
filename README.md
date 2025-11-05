# Rift Rewind: AI-Powered League of Legends Insights

An AI agent that transforms League of Legends match data into personalized insights, year-end summaries, and actionable coaching advice using AWS AI services.

## Features

- 📊 **Performance Analytics**: Track your growth over time with real match data
- 🎯 **Personalized Insights**: AI-powered coaching recommendations  
- 🏆 **Year-End Summaries**: Shareable highlights and achievements
- 📈 **Trend Analysis**: Identify patterns in your gameplay
- 🔥 **Live Data**: Real-time analysis from Riot Games API

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript
- **AI**: AWS Bedrock for insights generation
- **Data**: League of Legends API (Riot Games)
- **Styling**: Tailwind CSS

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Get your Riot API key:
   - Go to https://developer.riotgames.com/
   - Sign in and generate an API key

3. Set up environment variables:
```bash
cp .env.example .env.local
# Add your Riot API key (required)
# Add AWS credentials (optional for AI features)
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Required Setup

### Riot API Key (Required)
```env
RIOT_API_KEY=RGAPI-your-api-key-here
```

### AWS Credentials (Optional - for AI insights)
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

## Development Status

- [x] Project setup
- [x] Real League API integration
- [x] Match data analysis
- [x] Performance insights
- [x] AWS Bedrock integration
- [x] Year-end summaries
- [x] Error handling
- [x] Social sharing features
