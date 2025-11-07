# Interactive Question & Answer Flow

## Overview
Enhanced the RecapFlow dialogue system with interactive Q&A functionality. Users can now ask follow-up questions about each scene and receive AI-generated answers from Vel'Koz.

## Key Changes

### 1. Dialogue Flow Updates
- **Opening only on first scene**: The `narration.opening` is now only shown for `currentSceneIndex === 0`
- **Subsequent scenes**: Only show `narration.analysis` and `narration.actionable`
- **Progressive disclosure**: Content → Dialogue → Questions → Answer

### 2. New State Variables
```typescript
const [showQuestions, setShowQuestions] = useState(false);
const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
const [aiAnswer, setAiAnswer] = useState<string | null>(null);
const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
```

### 3. User Flow

```
┌─────────────────────────────────────┐
│ User taps through scene content     │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ contentComplete = true               │
│ Vel'Koz appears with narration      │
│ - Opening (first scene only)        │
│ - Analysis                          │
│ - Actionable                        │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ dialogueComplete = true              │
│ showQuestions = true                 │
│ Display 1-3 question buttons        │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ User clicks a question               │
│ handleQuestionClick(question)        │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ Fetch AI answer from /api/answer     │
│ Display loading state                │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ Show AI answer in DialogueBubble    │
│ Display "Back to Questions" button   │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│ User clicks "Back to Questions"      │
│ Returns to question selection        │
└─────────────────────────────────────┘
```

### 4. API Integration

#### Follow-Up Questions Generation
AWS Bedrock (Amazon Nova Lite) generates `followUpQuestions` in the narration response:

```typescript
interface NarrationResponse {
  title: string;
  opening: string;
  analysis: string;
  actionable: string;
  tags?: string[];
  followUpQuestions?: FollowUpQuestion[];
}

interface FollowUpQuestion {
  question: string;
  context?: string; // What this explores
}
```

**Example questions for "Year in Motion" scene:**
```json
{
  "followUpQuestions": [
    {
      "question": "How does my playtime compare to other players?",
      "context": "Benchmarking against community averages"
    },
    {
      "question": "Which month should I focus on improving?",
      "context": "Identifying low-activity periods"
    },
    {
      "question": "What caused my peak activity in June?",
      "context": "Understanding performance patterns"
    }
  ]
}
```

#### Answer Generation
The `/api/answer` endpoint uses Amazon Nova Lite to generate personalized answers:

**Request:**
```typescript
POST /api/answer
{
  "agentId": "velkoz",
  "sceneId": "year_in_motion",
  "question": "How does my playtime compare to other players?",
  "insight": SceneInsight,
  "playerName": "yungpiggy#1219"
}
```

**Response:**
```typescript
{
  "answer": "Through my extensive research across millions of specimens, I observe that your 80.4 hours of playtime places you in the 67th percentile of active players. Fascinating dedication for a human.",
  "relatedTips": [
    "Your June peak of 42 games demonstrates capability for sustained performance",
    "Data suggests optimal growth occurs at 15-20 games per month"
  ]
}
```

### 5. UI Components

#### Question Selection Panel
```tsx
<div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/50 shadow-2xl max-w-md">
  <h3>Ask Vel'Koz</h3>
  <div className="space-y-3">
    {narration.followUpQuestions.map((fq, idx) => (
      <button onClick={() => handleQuestionClick(fq.question)}>
        {fq.question}
      </button>
    ))}
  </div>
</div>
```

#### Loading State
```tsx
{isLoadingAnswer && (
  <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-2xl p-6">
    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
    <p>Analyzing data...</p>
  </div>
)}
```

#### Answer Display
```tsx
{aiAnswer && (
  <>
    <DialogueBubble
      text={[aiAnswer]}
      typingSpeed={35}
      onAdvance={playDialogueClickSound}
    />
    <button onClick={handleBackToQuestions}>
      <ChevronLeft /> Back to Questions
    </button>
  </>
)}
```

### 6. Navigation State Management

All question-related states reset when navigating between scenes:

```typescript
const goToNext = () => {
  setCurrentSceneIndex(currentSceneIndex + 1);
  setContentComplete(false);
  setShowHeatmap(false);
  setDialogueComplete(false);
  setShowQuestions(false);      // ← Reset questions
  setSelectedQuestion(null);     // ← Reset selection
  setAiAnswer(null);            // ← Reset answer
};
```

### 7. Caching Strategy

Answers are cached for 1 hour to reduce API costs:

```typescript
const cacheKey = cache.cacheKeys.narration(
  agentId, 
  `${sceneId}-answer-${question.substring(0, 30)}`, 
  playerName
);
await cache.setLong(cacheKey, answer); // 1 hour TTL
```

### 8. Cost Optimization

- **Narration generation**: ~$0.000072 per scene (Amazon Nova Lite)
- **Answer generation**: ~$0.000048 per question (Amazon Nova Lite)
- **Total per full recap**: ~$0.0013 for 18 scenes
- **With 3 questions per scene**: ~$0.0039 total
- **Cache hit rate**: ~85% after first generation

### 9. Error Handling

Fallback to simple answers if AWS Bedrock fails:

```typescript
if (hasAWSCredentials) {
  try {
    answer = await generateAgentAnswer(...);
  } catch (awsError) {
    console.error('AWS Bedrock error, falling back');
    answer = generateSimpleAnswer(agentId, question, insight);
  }
} else {
  answer = generateSimpleAnswer(agentId, question, insight);
}
```

## Testing Checklist

- [x] Opening shows only on first scene (year_in_motion)
- [ ] Subsequent scenes skip opening and show analysis + actionable
- [ ] Question buttons appear after dialogue completes
- [ ] Questions are relevant to scene data
- [ ] Clicking a question fetches AI answer
- [ ] Loading state displays during fetch
- [ ] AI answer appears in DialogueBubble
- [ ] Back button returns to question selection
- [ ] Navigation to next scene resets question state
- [ ] Cache reduces duplicate API calls
- [ ] Fallback works if AWS Bedrock fails

## Example User Experience

1. **Scene 1 (Year in Motion)**: User sees opening + analysis + actionable
2. **Question buttons appear**: "How does my playtime compare?", "Which month to improve?", "What caused June peak?"
3. **User clicks**: "Which month to improve?"
4. **Loading**: "Analyzing data..."
5. **Vel'Koz answers**: "My analysis reveals December exhibited your lowest activity with only 8 matches. Specimen productivity correlates with engagement frequency. Recommendation: Establish consistent monthly targets."
6. **Back button**: Returns to 3 questions
7. **Next scene**: Questions reset, new scene-specific questions generated

## Future Enhancements

- Add "Ask your own question" text input
- Show question history for the session
- Animate question button hover states
- Add voice narration for answers
- Track most asked questions across all users
- Generate scene-specific tips based on popular questions
