# AWS Bedrock Setup Guide

This project uses AWS Bedrock with Claude 3 Haiku to generate character-based narrations for the year-end recap.

## Prerequisites

1. AWS Account with Bedrock access
2. AWS IAM user with appropriate permissions
3. Model access enabled for Claude 3 Haiku

## Step 1: Enable Bedrock Model Access

1. Go to AWS Console → Amazon Bedrock
2. Navigate to **Model access** in the left sidebar
3. Click **Manage model access**
4. Find and enable: **Claude 3 Haiku** by Anthropic
   - Model ID: `anthropic.claude-3-haiku-20240307-v1:0`
5. Submit the request (usually instant approval)

## Step 2: Create IAM User

1. Go to AWS Console → IAM
2. Create a new user with **Programmatic access**
3. Attach the following policy (or create a custom one):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
    }
  ]
}
```

4. Save the **Access Key ID** and **Secret Access Key**

## Step 3: Configure Environment Variables

Your `.env.local` file should already have these variables. Update them with your credentials:

```env
# AWS Bedrock Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

## Step 4: Test the Integration

1. Start your development server:
```bash
pnpm dev
```

2. Navigate to the recap flow and select an agent
3. The narration should now be AI-generated with character personality

## How It Works

### Narration Flow

1. **User triggers narration** → `/api/narrate` endpoint is called
2. **Cache check** → Looks for cached narration first
3. **AWS Bedrock call** → If not cached, generates using Claude 3 Haiku
4. **Character prompt** → Includes agent personality, statistics, and instructions
5. **Parse response** → Extracts JSON narration
6. **Fallback** → If AWS fails, uses simple pre-written narration
7. **Cache result** → Stores for 1 hour to reduce costs

### Cost Management

- **Model**: Claude 3 Haiku (most cost-effective)
- **Caching**: 1 hour cache per narration
- **Tokens**: ~800 max tokens per request (very low cost)
- **Estimated cost**: $0.00025 per narration (1/4 of a penny)

### Files Modified

- `/lib/aws-bedrock.ts` - Added `generateAgentNarration()` function
- `/app/api/narrate/route.ts` - Integrated AWS Bedrock with fallback
- Agent personalities in `/src/lib/agents.ts` - Used in prompts

## Troubleshooting

### "Model not found" error
- Make sure you've enabled Claude 3 Haiku in Bedrock Model Access
- Check that the region supports Bedrock (us-east-1 recommended)

### "Access Denied" error
- Verify your IAM policy includes `bedrock:InvokeModel`
- Check that your credentials are correct in `.env.local`

### Narration seems generic
- This means it's using the fallback (AWS not configured or failed)
- Check the console logs for AWS errors
- Verify environment variables are loaded

### High costs
- Each narration is cached for 1 hour
- Clear cache only when testing: `GET /api/clear-cache?puuid=<puuid>`
- Consider increasing cache duration in production

## Testing Without AWS

The system automatically falls back to simple pre-written narrations if:
- AWS credentials are not configured
- AWS Bedrock API fails
- Model is not available

This ensures the app always works, even without AI narration.

## Agents Available

1. **Vel'Koz** - Scientific, analytical, clinical tone
2. **Teemo** - Cheerful, encouraging, scout-like
3. **Heimerdinger** - Professorial, wise, educational
4. **Kayle** - Righteous, divine, judgmental (currently in code but may need UI)
5. **Draven** - Dramatic, glorious, showman (currently in code but may need UI)

## Next Steps

- [ ] Test narrations for all agents
- [ ] Monitor AWS costs in production
- [ ] Consider adding more agents
- [ ] Implement streaming for longer narrations
- [ ] Add user feedback on narration quality
