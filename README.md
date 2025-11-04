# Rift Rewind

A comprehensive League of Legends match history analytics platform that provides AI-powered insights into player performance. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎮 **Match History Analysis**: Pull and analyze recent League of Legends match data
- 📊 **Performance Metrics**: Track KDA, DPM (Damage per Minute), vision score, win rate, and more
- 🤖 **AI-Powered Recaps**: Get personalized performance insights using AWS Bedrock
- 📈 **Interactive Charts**: Visualize your performance with beautiful Recharts visualizations
- 🏆 **Champion Statistics**: See your best champions and their win rates
- 🎯 **Recent Form Tracking**: Monitor your performance trends over recent games

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Modern utility-first CSS
- **Recharts** - Data visualization library

### Backend
- **Node.js** with TypeScript
- **Riot Games API** - League of Legends match history data
- **AWS Bedrock** - AI-powered performance analysis
- **Axios** - HTTP client

## Prerequisites

- Node.js 18+ and npm
- Riot Games API Key ([Get one here](https://developer.riotgames.com/))
- AWS Account with Bedrock access
- AWS IAM credentials with Bedrock permissions

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yungpiggy1219/Rift-Rewind-Hackathon.git
   cd Rift-Rewind-Hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   RIOT_API_KEY=your_riot_api_key_here
   RIOT_REGION=americas
   RIOT_PLATFORM=na1
   
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   ```

## Configuration

### Riot API Settings

- **RIOT_API_KEY**: Your personal Riot Games API key
- **RIOT_REGION**: Regional endpoint (americas, europe, asia, sea)
- **RIOT_PLATFORM**: Platform endpoint (na1, euw1, kr, br1, etc.)

### AWS Bedrock Settings

- **AWS_REGION**: AWS region where Bedrock is available (e.g., us-east-1)
- **AWS_ACCESS_KEY_ID**: Your AWS access key
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret key

Note: Ensure your AWS account has access to Claude 3 Haiku model in Bedrock.

## Usage

### Development Mode

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## API Endpoints

### GET/POST `/api/insights`

Fetch player insights and statistics.

**Query Parameters (GET):**
- `summonerName` (required): League of Legends summoner name
- `matchCount` (optional): Number of matches to analyze (default: 20)

**Request Body (POST):**
```json
{
  "summonerName": "Faker",
  "matchCount": 20
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalGames": 20,
    "wins": 12,
    "losses": 8,
    "winRate": 60.0,
    "avgKDA": 3.5,
    "avgKills": 7.2,
    "avgDeaths": 4.1,
    "avgAssists": 8.2,
    "avgDPM": 580,
    "avgVisionScore": 32.5,
    "avgWardsPlaced": 12.3,
    "avgGoldPerMinute": 420,
    "recentForm": [true, false, true, ...],
    "championStats": [...]
  },
  "aiRecap": "AI-generated performance analysis..."
}
```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── insights/
│   │       └── route.ts        # API endpoint for insights
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard page
├── components/
│   ├── PerformanceCharts.tsx   # Chart visualizations
│   └── StatsCard.tsx           # Statistics card component
├── lib/
│   ├── services/
│   │   ├── bedrockService.ts   # AWS Bedrock integration
│   │   ├── riotApi.ts          # Riot Games API client
│   │   └── statsAggregator.ts  # Data aggregation logic
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── .env.example                # Environment variables template
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Key Metrics Explained

- **KDA (Kill/Death/Assist Ratio)**: Calculated as (Kills + Assists) / Deaths
- **DPM (Damage per Minute)**: Average champion damage dealt per minute
- **Vision Score**: Metric representing ward placement and vision control
- **Win Rate**: Percentage of games won
- **GPM (Gold per Minute)**: Average gold earned per minute

## Troubleshooting

### API Key Issues
- Ensure your Riot API key is valid and not expired
- Development keys expire after 24 hours; apply for a production key
- Check that your summoner name and region match

### AWS Bedrock Issues
- Verify your AWS credentials are correct
- Ensure Bedrock is available in your configured region
- Check IAM permissions for the Claude model
- The app falls back to a basic recap if Bedrock fails

### Build Issues
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Riot Games for the League of Legends API
- AWS for Bedrock AI services
- The Next.js and React communities

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for the League of Legends community
