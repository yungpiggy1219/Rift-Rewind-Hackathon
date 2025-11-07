# Vel'Koz Dialogue System - Usage Guide

## Overview
The dialogue bubble system allows Vel'Koz (or any AI agent) to "speak" to the user with a typewriter effect. The system is reusable and can be easily integrated anywhere in the application.

## Components

### DialogueBubble Component
Location: `/app/components/DialogueBubble.tsx`

A reusable component that displays text with a typewriter animation effect.

#### Props:
- `text` (string, required): The narration text to display
- `isActive` (boolean, optional, default: true): Whether the typewriter effect is active
- `typingSpeed` (number, optional, default: 30): Milliseconds per character
- `className` (string, optional): Additional CSS classes
- `onComplete` (function, optional): Callback when typing animation completes

#### Features:
- **Typewriter Effect**: Characters appear one by one
- **Skip Function**: Click "Click to skip" to instantly show full text
- **Floating Animation**: Subtle floating effect when not typing
- **Speech Bubble Tail**: Visual indicator pointing to the speaker

## Implementation in Menu Page

### State Management

```typescript
// Add to your component state
const [velkozNarration, setVelkozNarration] = useState('Initial greeting message');

// Function to update narration
const updateVelkozNarration = (newText: string) => {
  setVelkozNarration(newText);
};
```

### Usage Example

```tsx
<DialogueBubble 
  text={velkozNarration}
  typingSpeed={40}
  onComplete={() => {
    console.log('Finished speaking');
    // Optional: Chain to next action
  }}
/>
```

## Narration Examples

### Initial Greeting
```typescript
updateVelkozNarration('Greetings, summoner. I am Vel\'Koz, the Eye of the Void. I shall analyze your performance this year.');
```

### Profile Loaded
```typescript
updateVelkozNarration(`Fascinating. Summoner ${playerName}, Level ${summonerLevel}. The data compilation is complete. Shall we proceed with the analysis?`);
```

### Starting Recap
```typescript
updateVelkozNarration('Initiating comprehensive analysis. Knowledge through disintegration awaits...');
```

### Loading Matches
```typescript
updateVelkozNarration(`Processing ${matchCount} matches. Each game reveals valuable data points for analysis.`);
```

### Cache Cleared
```typescript
updateVelkozNarration('Data cache purged. Fresh analysis parameters established. Fascinating...');
```

### Error State
```typescript
updateVelkozNarration('Curious. The data stream has been disrupted. Recalibrating analysis protocols...');
```

### Ranked Stats
```typescript
updateVelkozNarration(`Your ranked performance: ${wins} victories, ${losses} defeats. The patterns reveal much about your strategic evolution.`);
```

## Integration Patterns

### 1. Event-Driven Narration

```typescript
const handleClearCache = async () => {
  updateVelkozNarration('Initiating data purge sequence...');
  await clearCache();
  updateVelkozNarration('Data cache successfully purged. All metrics reset.');
};
```

### 2. Timed Narration Sequence

```typescript
const playNarrationSequence = () => {
  updateVelkozNarration('Welcome, summoner.');
  
  setTimeout(() => {
    updateVelkozNarration('Your year-end data has been compiled.');
  }, 3000);
  
  setTimeout(() => {
    updateVelkozNarration('Shall we begin the analysis?');
  }, 6000);
};
```

### 3. Conditional Narration

```typescript
useEffect(() => {
  if (profile) {
    if (profile.summonerLevel >= 100) {
      updateVelkozNarration('Impressive. A veteran summoner. Your data shall prove most illuminating.');
    } else {
      updateVelkozNarration(`Level ${profile.summonerLevel}. A developing specimen. Interesting...`);
    }
  }
}, [profile]);
```

### 4. Progress Narration

```typescript
const handleStartRecap = async () => {
  updateVelkozNarration('Initializing analysis protocols...');
  
  // After some work
  updateVelkozNarration(`Processing match ${currentMatch} of ${totalMatches}...`);
  
  // On completion
  updateVelkozNarration('Data compilation complete. Commencing narrative analysis.');
};
```

## Styling Customization

The DialogueBubble uses Tailwind classes and can be customized:

```tsx
<DialogueBubble 
  text={velkozNarration}
  className="max-w-md" // Make wider
  typingSpeed={20} // Type faster
/>
```

## Character-Specific Narrations

### Vel'Koz (Scientific/Analytical)
- "Fascinating specimen..."
- "The data reveals..."
- "Knowledge through disintegration..."
- "Intriguing patterns emerge..."

### Teemo (Cheerful/Encouraging)
- "Hehe! Looking good, captain!"
- "Size doesn't mean everything!"
- "That's the spirit!"

### Heimerdinger (Professorial)
- "Eureka! Most intriguing!"
- "Indeed, a fascinating observation!"
- "Science is so amazing!"

## Best Practices

1. **Keep narrations concise** - Aim for 1-2 sentences
2. **Match character personality** - Use appropriate vocabulary and tone
3. **Provide context** - Reference specific data when possible
4. **Time sequences properly** - Allow previous narration to complete
5. **Test typing speed** - Balance readability with pacing
6. **Use skip function** - Allow impatient users to skip

## Advanced Features

### Chaining Narrations

```typescript
const chainedNarration = (messages: string[]) => {
  messages.forEach((msg, index) => {
    setTimeout(() => {
      updateVelkozNarration(msg);
    }, index * 5000); // 5 seconds between messages
  });
};
```

### Dynamic Content

```typescript
const generateDynamicNarration = (stats: GameStats) => {
  const { wins, losses, favoriteChampion } = stats;
  const winRate = (wins / (wins + losses) * 100).toFixed(1);
  
  return `Your performance metrics: ${wins} victories across ${wins + losses} matches. 
          Win rate: ${winRate}%. 
          Primary specimen: ${favoriteChampion}. 
          Analysis suggests room for optimization.`;
};
```

## Troubleshooting

**Problem**: Narration not changing
- **Solution**: Ensure state is being updated correctly with `setVelkozNarration(newText)`

**Problem**: Typing too slow/fast
- **Solution**: Adjust `typingSpeed` prop (lower = faster, higher = slower)

**Problem**: Skip button not working
- **Solution**: Ensure DialogueBubble has proper event handlers

**Problem**: Bubble positioned incorrectly
- **Solution**: Adjust parent container positioning with absolute/relative

## Future Enhancements

- [ ] Multiple bubble styles for different agents
- [ ] Sound effects on typing
- [ ] Voice synthesis integration
- [ ] Pause/resume typing
- [ ] Rich text formatting (bold, colors)
- [ ] Emoji support in narration
- [ ] Multiple simultaneous bubbles
