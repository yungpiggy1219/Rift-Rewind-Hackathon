# ✅ AI Narration Flow - Amazon Nova Lite Integration

## How It Works Now

### Flow Sequence

1. **User taps through main content** (ProgressiveText with stats)
   - Shows scene statistics
   - Player metrics and visualizations
   - Completes when all content is shown

2. **Content completes** → `setContentComplete(true)`

3. **AI Narration appears** (Vel'Koz dialogue bubble)
   - **NOW**: Uses AI-generated content from Amazon Nova Lite
   - **BEFORE**: Was using hardcoded text for each scene
   - Shows: `narration.opening`, `narration.analysis`, `narration.actionable`

4. **Dialogue completes** → `setDialogueComplete(true)`

5. **Next button enabled** → User can proceed

---

## What Changed

### Before (Hardcoded):
```tsx
text={
  currentSceneId === "year_in_motion"
    ? ["Hardcoded text 1", "Hardcoded text 2", ...]
    : currentSceneId === "signature_champion"
    ? ["More hardcoded text", ...]
    : ...
}
```

### After (AI-Generated):
```tsx
text={[
  narration.opening,    // AI-generated opening
  narration.analysis,   // AI-generated analysis
  narration.actionable, // AI-generated advice
]}
```

---

## AI Narration Generation

### 1. Fetch Scene Data
```typescript
// API: /api/insights/[sceneId]
const sceneData = await fetch('/api/insights/signature_champion', {
  method: 'POST',
  body: JSON.stringify({ puuid })
});
```

**Returns:**
```json
{
  "insight": {
    "summary": "Ahri - 47 games, 54.3% win rate",
    "details": ["Most played champion", "High win rate"],
    "metrics": [
      { "label": "Games", "value": 47 },
      { "label": "Win Rate", "value": "54.3%" }
    ],
    "action": "Focus on CS consistency",
    "vizData": { ... }
  }
}
```

### 2. Generate AI Narration
```typescript
// API: /api/narrate
const narration = await fetch('/api/narrate', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'velkoz',
    sceneId: 'signature_champion',
    insight: sceneData.insight,
    playerName: 'Summoner'
  })
});
```

**Amazon Nova Lite generates:**
```json
{
  "title": "Data Analysis: Specimen's Champion Selection",
  "opening": "Fascinating. My ocular sensors have detected repeated selection of the nine-tailed fox entity.",
  "analysis": "Through rigorous examination of your 47 matches piloting Ahri, I observe a 54.3% victory rate. Your average damage output of 18,432 per engagement reveals competent mechanical execution.",
  "actionable": "I recommend focusing on CS consistency - specimens achieving 7.5+ CS/min demonstrate significantly higher success probabilities.",
  "tags": ["champion", "performance"],
  "followUpQuestions": [...]
}
```

### 3. Display in Dialogue Bubble
```tsx
<DialogueBubble
  text={[
    narration.opening,    // "Fascinating. My ocular sensors..."
    narration.analysis,   // "Through rigorous examination..."
    narration.actionable, // "I recommend focusing on CS..."
  ]}
  typingSpeed={35}
  onComplete={() => setDialogueComplete(true)}
/>
```

---

## Data Flow Diagram

```
User Interaction
      ↓
1. ProgressiveText shows scene stats
      ↓
2. User taps through content
      ↓
3. Content completes → contentComplete = true
      ↓
4. Trigger narration fetch (if not cached)
      ↓
5. POST /api/narrate
      ↓
6. lib/aws-bedrock.ts → generateAgentNarration()
      ↓
7. Amazon Nova Lite processes:
   - Agent personality (Vel'Koz)
   - Scene context (signature_champion)
   - Player statistics
   - Metrics and insights
      ↓
8. Returns NarrationResponse JSON
      ↓
9. Cache for 1 hour
      ↓
10. Display in DialogueBubble
      ↓
11. User reads AI narration
      ↓
12. Dialogue complete → dialogueComplete = true
      ↓
13. Next button enabled
```

---

## Example for "Signature Champion" Scene

### Input to Amazon Nova Lite:

**Prompt includes:**
- Agent: Vel'Koz personality traits
- Scene: signature_champion
- Player Stats:
  - Summary: "Ahri is your most played champion with 47 games"
  - Metrics: 47 games, 54.3% win rate, 6.8 CS/min
  - Action: "Focus on CS consistency"

### Amazon Nova Lite Output:

```json
{
  "title": "Data Analysis: Specimen's Champion Preference Matrix",
  "opening": "Fascinating. My ocular sensors have detected a peculiar pattern in specimen 'Summoner'. Through extensive observation of your summoner activities, one entity dominates your selection algorithm.",
  "analysis": "Through rigorous examination of your 47 matches piloting the nine-tailed fox entity known as Ahri, I observe a 54.3% victory rate. Most intriguing. Your average CS efficiency of 6.8 per minute falls below optimal parameters - specimens achieving 7.5+ demonstrate significantly higher success probabilities.",
  "actionable": "I recommend focusing ocular enhancement on CS consistency and vision score optimization. Knowledge through repetition, specimen. Your mechanical execution is competent, but economic efficiency requires improvement.",
  "tags": ["champion", "ahri", "performance"],
  "followUpQuestions": [
    {
      "question": "How can I improve my Ahri win rate?",
      "context": "Performance optimization strategies"
    },
    {
      "question": "Should I expand my champion pool?",
      "context": "Champion diversity analysis"
    }
  ]
}
```

### What User Sees:

**Dialogue Bubble 1:**
> "Fascinating. My ocular sensors have detected a peculiar pattern in specimen 'Summoner'. Through extensive observation of your summoner activities, one entity dominates your selection algorithm."

**Dialogue Bubble 2:**
> "Through rigorous examination of your 47 matches piloting the nine-tailed fox entity known as Ahri, I observe a 54.3% victory rate. Most intriguing. Your average CS efficiency of 6.8 per minute falls below optimal parameters - specimens achieving 7.5+ demonstrate significantly higher success probabilities."

**Dialogue Bubble 3:**
> "I recommend focusing ocular enhancement on CS consistency and vision score optimization. Knowledge through repetition, specimen. Your mechanical execution is competent, but economic efficiency requires improvement."

---

## Key Features

### ✅ Context-Aware
- AI sees the actual player statistics
- References specific numbers (47 games, 54.3% win rate)
- Tailored to the scene type

### ✅ Character Voice
- Stays in Vel'Koz personality
- Uses scientific, clinical language
- Condescending but intellectually curious

### ✅ Data-Driven
- Not generic advice
- Based on actual performance metrics
- Compares to optimal benchmarks

### ✅ Dynamic
- Different for every player
- Changes based on actual stats
- No two recaps are exactly the same

---

## Caching Strategy

### Scene Data Cache
- **Key**: `scene-signature_champion-{puuid}`
- **Duration**: 1 hour
- **Purpose**: Avoid recomputing statistics

### Narration Cache
- **Key**: `narration-velkoz-signature_champion-{puuid}-{playerName}`
- **Duration**: 1 hour
- **Purpose**: Avoid re-calling Amazon Nova Lite

### Benefits:
- ✅ Faster load times
- ✅ Reduced API costs
- ✅ Consistent narration per session

---

## Cost Per Scene

**Amazon Nova Lite Pricing:**
- Input: $0.06 per 1M tokens (~400 tokens = $0.000024)
- Output: $0.24 per 1M tokens (~200 tokens = $0.000048)
- **Total per scene**: ~$0.000072

**For full recap (18 scenes):**
- Cost per user: ~$0.0013
- 1000 users: ~$1.30

**Very affordable!** 💰

---

## Testing the AI Narration

### 1. Check Server Logs

When a scene loads, you should see:
```
[RecapFlow] Fetching narration: velkoz signature_champion
[Narrate API] ✅ Using AWS Bedrock for AI-generated narration
[AWS Bedrock] Generating narration for velkoz on signature_champion using Amazon Nova Lite
[AWS Bedrock] Raw response from Nova Lite: {...}
[Narrate API] ✅ SUCCESS: Generated AI narration with AWS Bedrock
```

### 2. Watch the Dialogue

After tapping through scene content, Vel'Koz should:
- Reference specific stats from YOUR data
- Use clinical, scientific language
- Provide personalized advice

### 3. Look for Differences

Each player should get:
- Different numbers mentioned
- Advice tailored to their performance
- Unique insights based on their playstyle

---

## Fallback Behavior

If Amazon Nova Lite fails:

```typescript
// app/api/narrate/route.ts
if (hasAWSCredentials) {
  try {
    narration = await generateAgentNarration(...); // Use Nova Lite
  } catch (awsError) {
    narration = generateSimpleNarration(...); // Fallback
  }
}
```

**Fallback narration:**
```json
{
  "title": "Signature Champion",
  "opening": "Greetings, mortal Summoner. I am Vel'Koz, the Eye of the Void...",
  "analysis": "Ahri is your most played champion",
  "actionable": "Focus on CS consistency",
  "tags": ["velkoz", "signature_champion"]
}
```

**Less detailed, but app doesn't crash** ✅

---

## Summary

**Status**: ✅ **AI Narration Working**  
**Model**: Amazon Nova Lite  
**Cost**: ~$0.000072 per scene  
**Quality**: Personalized, data-driven, in-character  
**Caching**: 1 hour TTL  
**Fallback**: Simple narration if AWS fails  

**Your Vel'Koz AI agent now provides intelligent, personalized insights for every scene!** 🤖⚡
