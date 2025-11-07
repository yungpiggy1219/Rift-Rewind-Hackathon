# Recap Flow Vel'Koz Integration

## Overview
Replaced the right-side Narration Panel (AgentNarrator component) with Vel'Koz character + DialogueBubble system for a more immersive narrative experience.

## Changes Made

### 1. **Removed Components**
- ❌ `AgentNarrator` component (right panel with scrollable narration)
- ❌ Two-column XL grid layout (`grid-cols-1 xl:grid-cols-2`)

### 2. **Added Components**
- ✅ `DialogueBubble` import from `app/components/DialogueBubble`
- ✅ Vel'Koz character image at bottom-right
- ✅ Dialogue bubble positioned near Vel'Koz

### 3. **Layout Changes**

#### Before:
```tsx
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  <div><!-- Visualization Panel --></div>
  <div><!-- AgentNarrator Panel --></div>
</div>
```

#### After:
```tsx
<div className="max-w-5xl mx-auto">
  <!-- Centered Visualization Panel (single column) -->
</div>

<!-- Vel'Koz + Dialogue at bottom-right -->
<div className="absolute bottom-0 right-0 z-25">
  <img src="/images/ai-agents/velkoz.png" />
  <DialogueBubble text={[opening, analysis, actionable]} />
</div>
```

### 4. **Dialogue Content**
The dialogue now shows narration content in sequence:
```tsx
<DialogueBubble 
  text={[
    narration.opening,    // "Fascinating data, summoner..."
    narration.analysis,   // Detailed analysis text
    narration.actionable  // Recommendation
  ]}
  typingSpeed={35}
  className="max-w-md"
/>
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Back Button]                    [Share Button]         │
│                                                          │
│                                                          │
│           ┌─────────────────────────┐                   │
│           │                         │                   │
│           │   Visualization Panel   │                   │
│           │   (Centered, Single)    │                   │
│           │                         │                   │
│           │   - Title               │                   │
│           │   - Chart/Viz           │                   │
│           │   - Metrics Grid        │                   │
│           │                         │                   │
│           └─────────────────────────┘                   │
│                                                          │
│                                    ┌──────────────┐     │
│                                    │ "Dialogue    │     │
│                                    │  bubble..."  │     │
│                                    └──────────────┘     │
│                                          🦑             │
│ [Prev]            [1/18]              [Next]      Vel'Koz
└─────────────────────────────────────────────────────────┘
```

## Positioning Details

### Vel'Koz Character
```tsx
<div className="absolute bottom-0 right-0 z-25">
  <div style={{ marginBottom: '-10vh', marginRight: '-5vw' }}>
    <img className="h-[50vh]" />
  </div>
</div>
```

**Properties:**
- Height: 50vh (50% of viewport height)
- Position: Bottom-right corner
- Margins: Cropped by -10vh bottom, -5vw right (partial visibility)
- Z-index: 25 (above content, below navigation at z-30)

### Dialogue Bubble
```tsx
<div className="absolute top-8 right-[45vh]">
  <DialogueBubble className="max-w-md" />
</div>
```

**Properties:**
- Position: Relative to Vel'Koz
- Top: 8 units from Vel'Koz top
- Right: 45vh from Vel'Koz right edge (positioned to left of character)
- Max width: 28rem (448px)
- Typing speed: 35ms per character

## Narration Flow

### Message Sequence
1. **Opening** - Vel'Koz's initial greeting/observation
2. **Analysis** - Detailed breakdown of the scene data
3. **Actionable** - Recommendation or advice

### User Interaction
- Click during typing → Skip to end of current message
- Click after typing → Advance to next message
- Triangle indicator (▼) shows when more messages available
- Auto-advances through all 3 messages with user pacing

## Benefits

### UX Improvements
✅ **More Screen Space** - Visualization panel can be larger and better centered
✅ **Character Presence** - Vel'Koz appears in ALL recap scenes, not just menu
✅ **Interactive Narrative** - Users control pacing through dialogue advancement
✅ **Visual Cohesion** - Consistent character presence throughout experience
✅ **Less Scrolling** - No need to scroll through narration panel

### Technical Benefits
✅ **Simpler Layout** - Single column instead of responsive grid
✅ **Reusable Component** - Same DialogueBubble used in menu and recap
✅ **Better Performance** - Less DOM complexity than scrollable panel
✅ **Easier Maintenance** - One dialogue system instead of two narration UIs

## Responsive Behavior

### Desktop (>1024px)
- Visualization panel: Max-width 48rem (768px)
- Vel'Koz: 50vh height (~400-500px typical)
- Dialogue: Max-width 28rem (448px)

### Tablet/Mobile (<1024px)
- Visualization panel: Full width with padding
- Vel'Koz: Scales with viewport (50vh)
- Dialogue: Wraps text, may overlap on small screens

**Note:** Mobile optimization may require additional responsive adjustments for Vel'Koz positioning.

## Potential Enhancements

### Short-term
- [ ] Add floating animation to Vel'Koz (subtle hover effect)
- [ ] Voice lines audio for narration (optional)
- [ ] Different dialogue bubble colors per agent
- [ ] Scene-specific Vel'Koz expressions/poses

### Long-term
- [ ] Multiple character positions (left/right based on scene)
- [ ] Character animations (tentacle movements)
- [ ] Lottie animations for Vel'Koz
- [ ] Dynamic dialogue based on player performance
- [ ] Interactive Q&A mode with Vel'Koz

## Testing Checklist

- [x] Vel'Koz appears on all recap scenes
- [x] Dialogue shows narration content in sequence
- [x] Triangle indicator works for message advancement
- [x] Click-to-advance functionality works
- [x] Layout is centered properly
- [x] Navigation buttons still accessible
- [ ] Test on mobile/tablet devices
- [ ] Test with very long narration text
- [ ] Test rapid scene navigation
- [ ] Verify no layout shifts during typing

## Code Cleanup Needed

Optional improvements:
1. Remove unused `AgentNarrator.tsx` component (if not used elsewhere)
2. Replace `<img>` with Next.js `<Image>` for optimization
3. Update CSS classes (`flex-shrink-0` → `shrink-0`, `bg-gradient-to-r` → `bg-linear-to-r`)
4. Add error boundary around DialogueBubble
5. Add loading state while narration fetches

## Migration Notes

If you need to revert or A/B test:
- Old code used `AgentNarrator` component with `grid grid-cols-1 xl:grid-cols-2`
- Narration data structure remains unchanged (title, opening, analysis, actionable, tags)
- Can easily switch back by importing AgentNarrator and restoring grid layout
- DialogueBubble is backwards compatible with string input (single message)
