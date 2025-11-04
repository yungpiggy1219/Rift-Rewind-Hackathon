# Rift Rewind Hackathon Development Guide

## 🚀 Quick Start

You're all set up! Here's what we've built so far:

### Current Features
- ✅ Next.js 16 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Mock League of Legends data
- ✅ AWS Bedrock integration (ready to use)
- ✅ Beautiful dashboard UI
- ✅ API routes for insights

### Next Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```
Then add your AWS credentials and Riot API key.

3. **Run the development server:**
```bash
npm run dev
```

4. **Open http://localhost:3000** and test with any summoner name!

## 🎯 Development Roadmap

### Phase 1: Basic Setup (✅ DONE)
- [x] Project structure
- [x] Mock data
- [x] Basic UI
- [x] AWS Bedrock integration

### Phase 2: Real Data Integration
- [ ] Get Riot API key from https://developer.riotgames.com/
- [ ] Implement real League API calls
- [ ] Add error handling for API failures
- [ ] Cache data to reduce API calls

### Phase 3: Enhanced AI Features
- [ ] More sophisticated prompts for Bedrock
- [ ] Year-end summary generation
- [ ] Social comparison features
- [ ] Trend analysis over time

### Phase 4: Polish & Deploy
- [ ] Add loading states
- [ ] Improve error handling
- [ ] Social sharing features
- [ ] Deploy to Vercel/AWS

## 🔧 Key Files to Understand

- `app/page.tsx` - Main dashboard UI
- `lib/types.ts` - TypeScript definitions
- `lib/mockData.ts` - Sample League data
- `lib/aws-bedrock.ts` - AI insights generation
- `app/api/insights/route.ts` - API endpoint for insights

## 💡 AWS Setup Tips

### Getting AWS Credentials
1. Go to AWS Console → IAM
2. Create a new user with programmatic access
3. Attach policy: `AmazonBedrockFullAccess`
4. Save the Access Key ID and Secret Access Key

### Bedrock Model Access
1. Go to AWS Console → Bedrock
2. Request access to Claude models
3. Wait for approval (usually instant)

## 🎮 League API Integration

### Getting Started
1. Sign up at https://developer.riotgames.com/
2. Get your API key
3. Replace mock data calls with real API calls

### Key Endpoints
- `/lol/summoner/v4/summoners/by-name/{summonerName}`
- `/lol/match/v5/matches/by-puuid/{puuid}/ids`
- `/lol/match/v5/matches/{matchId}`

## 🏆 Hackathon Success Tips

1. **Start Simple**: The current setup works with mock data - perfect for demos!
2. **Focus on AI**: The real value is in the insights, not just data display
3. **Make it Personal**: Use AI to create engaging, personalized stories
4. **Keep Costs Low**: Use Claude Haiku (cheapest model) for development
5. **Document Everything**: Keep track of your approach for the writeup

## 🚨 Common Issues

### AWS Bedrock Not Working?
- Check your credentials in `.env.local`
- Ensure you have Bedrock access in your AWS region
- Try `us-east-1` region first

### TypeScript Errors?
- Run `npm run build` to check for issues
- Most errors are from missing types - add them to `lib/types.ts`

### API Rate Limits?
- Riot API has rate limits - implement caching
- Use mock data for development to avoid limits

## 📝 Submission Checklist

- [ ] Working demo URL
- [ ] Public GitHub repository
- [ ] 3-minute demo video
- [ ] Methodology writeup
- [ ] AWS services documentation

Good luck! You've got a solid foundation to build something amazing! 🎉