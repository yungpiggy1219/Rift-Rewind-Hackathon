# Rift Rewind: League of Legends Year-End Recap

An interactive slideshow-style League of Legends year-end recap that analyzes your 2025 Season 14 journey with personalized insights, statistics, and memorable moments.

## ✨ New Slideshow Experience

Transform your League journey into an engaging, slide-by-slide story:

### 🎮 User Flow
1. **Entry Screen** - Enter your Riot ID (GameName#TagLine) with data consent
2. **Loading Analysis** - We fetch and analyze ALL your 2025 matches (complete year coverage)
3. **Menu Screen** - Choose between quick stats or full year-end recap slideshow
4. **Interactive Slideshow** - Experience your journey through 12+ personalized slides

### 📊 Slideshow Features
- **Comprehensive Stats**: Total games, win rate, queue distribution, role analysis
- **Champion Mastery**: Your most-played champions with detailed KDA and win rates
- **Performance Trends**: Monthly performance analysis and peak periods
- **Memorable Moments**: Best games, longest streaks, and clutch performances
- **Growth Insights**: Areas of improvement and achievements
- **Interactive Controls**: Auto-play, keyboard navigation, and progress tracking
- **Share & Export**: Share your recap or download as text summary

### 🎯 Slide Categories
- Timeframe Detection & Match Analysis
- Total Games & Win Rate Overview  
- Queue Mix (Ranked/ARAM/Other)
- Champion Mastery & Performance
- Role Identity & Position Analysis
- Peak Performance Periods
- Damage Output & Team Impact
- Win/Loss Streaks Analysis
- Best Game Highlights
- Growth Areas & Improvements
- Fun Facts & Achievements
- Year Summary & Future Goals

### 🎮 Controls
- **Arrow Keys**: Navigate between slides
- **Spacebar**: Next slide
- **P Key**: Toggle auto-play
- **Escape**: Return to menu
- **Click Progress Dots**: Jump to specific slides

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

## 🚀 Technical Features

- **Complete 2025 Coverage**: Fetches ALL matches from January 1, 2025 to present
- **Smart Time Filtering**: Uses Riot API `startTime`/`endTime` parameters for precise year coverage
- **Intelligent Fallback**: Supplements with recent matches if 2025 data is limited
- **Multi-Region Support**: Automatically detects and searches across all Riot regions
- **Comprehensive Analysis**: Includes Ranked, Normal, and ARAM games (10+ minute duration)
- **Interactive Slideshow**: Smooth animations and transitions between insights
- **Responsive Design**: Optimized for desktop and mobile experiences
- **Keyboard Navigation**: Full keyboard support with auto-play functionality
- **Share & Export**: Download or share your complete year-end summary
- **Robust Error Handling**: User-friendly messages and graceful degradation

## Development Status

- [x] Project setup and configuration
- [x] Multi-region Riot API integration
- [x] Comprehensive match data analysis
- [x] Interactive slideshow interface
- [x] Entry screen with Riot ID input
- [x] Loading states and progress indicators
- [x] Menu screen with options
- [x] 12+ personalized slide categories
- [x] Keyboard navigation and controls
- [x] Auto-play functionality
- [x] Share and download features
- [x] Responsive design and animations
- [x] Error handling and user feedback
- [x] AWS Bedrock integration (optional AI insights)
