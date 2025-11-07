# Multi-Message Dialogue System

## Overview
The DialogueBubble component now supports displaying multiple messages sequentially with visual indicators and click-to-advance functionality.

## Features

### 1. **Multi-Message Support**
- Pass a single string for simple messages
- Pass an array of strings for multi-message sequences
- Automatically handles both formats

### 2. **Visual Indicators**
- **Typewriter Effect**: Characters appear one by one
- **Blinking Cursor**: Shows during typing animation
- **Triangle Indicator**: Animated downward-pointing triangle appears in bottom-right corner when more messages are available
- **Hover Effect**: Bubble changes color on hover to indicate it's clickable

### 3. **Click-to-Advance**
- Click during typing to skip to end of current message
- Click after typing completes to advance to next message
- Entire bubble is clickable for better UX
- Triangle bounces to draw attention to "next" action

## Usage Examples

### Single Message
```tsx
<DialogueBubble 
  text="This is a simple message."
  typingSpeed={30}
/>
```

### Multiple Messages
```tsx
<DialogueBubble 
  text={[
    'First sentence.',
    'Second sentence.',
    'Third sentence.'
  ]}
  typingSpeed={40}
  onComplete={() => {
    console.log('All messages shown');
  }}
  onAdvance={() => {
    console.log('Advanced to next message');
  }}
/>
```

### Dynamic Updates
```tsx
const [narration, setNarration] = useState<string | string[]>([
  'Greetings, summoner.',
  'I am Vel\'Koz.',
  'Welcome to your year-end recap.'
]);

// Update narration based on events
const handleProfileLoad = (profile) => {
  setNarration([
    'Fascinating.',
    `Summoner ${profile.name}, Level ${profile.summonerLevel}.`,
    'The data compilation is complete.'
  ]);
};

<DialogueBubble text={narration} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string \| string[]` | required | Message(s) to display |
| `isActive` | `boolean` | `true` | Whether the bubble is active |
| `typingSpeed` | `number` | `30` | Milliseconds per character |
| `className` | `string` | `''` | Additional CSS classes |
| `onComplete` | `() => void` | - | Called when all messages are shown |
| `onAdvance` | `() => void` | - | Called when advancing to next message |

## Implementation Details

### State Management
```tsx
const [displayedText, setDisplayedText] = useState('');
const [isTyping, setIsTyping] = useState(true);
const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
```

### Message Handling
```tsx
// Convert to array for consistent handling
const messages = Array.isArray(text) ? text : [text];
const currentMessage = messages[currentMessageIndex];
const hasMoreMessages = currentMessageIndex < messages.length - 1;
```

### Advancement Logic
```tsx
const handleAdvance = () => {
  if (isTyping) {
    // Skip current typing animation
    indexRef.current = currentMessage.length;
    setDisplayedText(currentMessage);
    setIsTyping(false);
  } else if (hasMoreMessages) {
    // Move to next message
    setCurrentMessageIndex(prev => prev + 1);
    onAdvance?.();
  }
};
```

## Visual Design

### Bubble Styling
- Purple gradient background (`bg-purple-600/95`)
- Backdrop blur for depth
- Border with purple accent
- Rounded corners (`rounded-2xl`)
- Drop shadow for elevation
- Speech tail at bottom-left

### Triangle Indicator
- White downward-pointing triangle
- 3x3 size (12px)
- Bounce animation
- Only visible when `!isTyping && hasMoreMessages`
- Positioned in bottom-right corner with 8px padding

### Animations
- **Typing**: Character-by-character reveal
- **Cursor**: Pulse animation during typing
- **Float**: Subtle up-down motion when idle
- **Bounce**: Triangle indicator bounces to draw attention
- **Hover**: Color transition on mouse over

## Integration with Menu Page

The menu page (`app/menu/[puuid]/page.tsx`) uses multi-message dialogue for different events:

### Initial Greeting
```tsx
const [velkozNarration, setVelkozNarration] = useState<string | string[]>([
  'Greetings, summoner.',
  'I am Vel\'Koz, the Eye of the Void.',
  'I shall analyze your performance this year.',
  'Click to continue...'
]);
```

### Profile Loaded
```tsx
useEffect(() => {
  if (profile && !isPreloading) {
    updateVelkozNarration([
      `Fascinating.`,
      `Summoner ${profile.name}, Level ${profile.summonerLevel}.`,
      `The data compilation is complete.`,
      `Shall we proceed with the analysis?`
    ]);
  }
}, [profile, isPreloading]);
```

### Starting Recap
```tsx
const handleStartRecap = () => {
  updateVelkozNarration([
    'Initiating comprehensive analysis.',
    'Knowledge through disintegration...',
    'Prepare yourself, summoner.'
  ]);
  setTimeout(() => startRecap(), 2000);
};
```

### Cache Cleared
```tsx
updateVelkozNarration([
  'Cache purge complete.',
  `${data.totalCleared} entries have been disintegrated.`,
  'Your data will be fresh on the next analysis.'
]);
```

## Best Practices

### 1. **Message Length**
- Keep individual messages short (1-2 sentences)
- Break long narrations into digestible chunks
- Aim for 50-100 characters per message

### 2. **Pacing**
- Use arrays for dramatic effect (pauses between messages)
- Single strings for quick confirmations
- Adjust `typingSpeed` based on message importance (slower = more dramatic)

### 3. **User Control**
- Always make bubbles clickable to skip/advance
- Show clear indicators for "more content"
- Don't force users to wait through long animations

### 4. **Contextual Narration**
- Update narration based on user actions
- Use multi-message for storytelling moments
- Single messages for status updates

### 5. **Accessibility**
- Ensure text contrast meets WCAG standards
- Provide click targets large enough for touch
- Use semantic HTML where possible

## Troubleshooting

### Messages Not Advancing
- Check that `text` prop is an array with multiple elements
- Verify `onAdvance` callback is not blocking
- Ensure `hasMoreMessages` logic is correct

### Triangle Not Showing
- Confirm `isTyping` is false (wait for typing to complete)
- Check that `hasMoreMessages` is true
- Verify z-index isn't causing overlap issues

### Typing Animation Glitches
- Ensure `typingSpeed` is reasonable (20-50ms recommended)
- Check that `currentMessage` updates properly
- Verify `indexRef` is being reset on message change

## Future Enhancements

Potential improvements:
- [ ] Audio cues for message advancement
- [ ] Different triangle styles (arrows, dots, etc.)
- [ ] Configurable animation speeds per message
- [ ] Message history/replay functionality
- [ ] Voice synthesis integration
- [ ] Keyboard shortcuts (Space/Enter to advance)
- [ ] Auto-advance mode with configurable delays
- [ ] Transition effects between messages (fade, slide, etc.)
