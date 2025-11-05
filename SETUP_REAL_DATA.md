# Setting Up Real League Data

## Step 1: Get Your Riot API Key

1. Go to https://developer.riotgames.com/
2. Sign in with your Riot account
3. Click "REGENERATE API KEY" 
4. Copy your API key (it looks like: `RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Step 2: Add API Key to Your Project

1. Create a `.env.local` file in your project root (if it doesn't exist):
```bash
cp .env.example .env.local
```

2. Open `.env.local` and add your API key:
```env
# League of Legends API
RIOT_API_KEY=RGAPI-your-actual-api-key-here

# AWS Configuration (optional for AI features)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

## Step 3: Test Real Data

1. Start your development server:
```bash
npm run dev
```

2. Go to http://localhost:3000
3. Check the "Use real League data" checkbox
4. Enter a real summoner name (like "Faker" or your own)
5. Click "Analyze"

## Important Notes

- **Rate Limits**: The Riot API has rate limits. The app includes automatic retry logic.
- **Region**: Currently set to NA1. You can change this in `lib/riot-api.ts` if needed.
- **Development Key**: Development keys expire every 24 hours and have lower rate limits.
- **Production Key**: For the hackathon submission, you may want to apply for a production key.

## Troubleshooting

### "Summoner not found"
- Check the spelling of the summoner name
- Make sure you're using the correct region
- Try a well-known summoner like "Faker"

### "Rate limit exceeded"
- Wait a few seconds and try again
- The app will automatically retry with backoff

### "API key expired"
- Development keys expire daily
- Go back to the developer portal and regenerate

### "No recent matches found"
- The summoner might not have played recently
- Try a different summoner name

## Testing Without Real Data

You can always uncheck "Use real League data" to test with mock data while developing other features.

## Next Steps

Once you have real data working:
1. Add AWS credentials for AI insights
2. Customize the analysis in `lib/match-analyzer.ts`
3. Enhance the AI prompts in `lib/aws-bedrock.ts`
4. Add more visualization features