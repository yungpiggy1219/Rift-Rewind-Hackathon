# SummonerCard Dropdown Menu Integration

## Overview
The SummonerCard component now includes an optional dropdown menu for navigation actions, replacing the standalone Back button in RecapFlow. This creates a cleaner, more consolidated navigation experience.

## Implementation Details

### Component Props
```typescript
interface SummonerCardProps {
  profile?: Profile;
  rankedInfo?: RankedInfo[];
  playerName?: string;
  containerClassName?: string;
  onBackToMenu?: () => void;      // NEW: Callback for menu navigation
  showMenuButton?: boolean;        // NEW: Show dropdown menu button
}
```

### State Management
```typescript
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
```

### Dropdown Structure
1. **Menu Button**: ChevronDown icon (top-right of SummonerCard)
   - Only visible when `showMenuButton={true}`
   - Toggles dropdown open/closed
   - Size: `w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8`

2. **Backdrop**: Full-screen overlay for click-outside behavior
   - `fixed inset-0 z-40`
   - Transparent with `backdrop-blur-sm`
   - Closes dropdown when clicked

3. **Menu Panel**: Positioned below SummonerCard
   - `absolute right-0 top-full mt-2 z-50`
   - White background with shadow and rounded corners
   - Contains menu items (currently "Back to Menu")

### Menu Items
```tsx
<button
  onClick={() => {
    onBackToMenu?.();
    setIsDropdownOpen(false);
  }}
  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-md"
>
  <Home className="w-4 h-4" />
  <span className="text-sm font-medium text-gray-700">Back to Menu</span>
</button>
```

## Usage in RecapFlow

### Before (Standalone Back Button)
```tsx
<button
  onClick={goBack}
  className="absolute top-8 left-8"
>
  <ArrowLeft />
  <span>Back</span>
</button>
```

### After (Integrated Dropdown)
```tsx
<SummonerCard
  playerName={playerName}
  containerClassName="relative"
  showMenuButton={true}
  onBackToMenu={goBack}
/>
```

## Benefits

### UI Consolidation
- Reduces separate UI elements in top navigation
- Creates single focal point for user information and actions
- Cleaner visual hierarchy

### Scalability
- Easy to add more menu items (Settings, Help, etc.)
- Maintains consistent interaction pattern
- Dropdown can grow without cluttering layout

### Responsive Design
- Works seamlessly across breakpoints
- Icon and text scale with component
- Dropdown positioned relative to card

## Visual Hierarchy

```
┌─────────────────────────────────────┐
│ SummonerCard                    ▼   │ ← ChevronDown button
└─────────────────────────────────────┘
                                  │
                                  ▼
                           ┌─────────────────┐
                           │ 🏠 Back to Menu │ ← Menu item
                           └─────────────────┘
```

## Interaction Flow

1. **Closed State** (Default)
   - SummonerCard shows profile info
   - ChevronDown icon visible (if `showMenuButton={true}`)
   - No dropdown menu displayed

2. **Open State** (User clicks ChevronDown)
   - Backdrop appears (full screen, click-to-close)
   - Menu panel slides/appears below card
   - ChevronDown remains visible

3. **Menu Item Click**
   - Executes callback (`onBackToMenu?.()`)
   - Closes dropdown automatically
   - Updates route/navigation

4. **Click Outside** (User clicks backdrop)
   - Closes dropdown
   - Returns to closed state
   - No callback executed

## Styling Details

### Colors
- **Menu Panel**: White background (`bg-white`)
- **Hover State**: Light gray (`hover:bg-gray-100`)
- **Text**: Dark gray (`text-gray-700`)
- **Icon**: Matches text color
- **Shadow**: Subtle drop shadow (`shadow-lg`)

### Spacing
- **Button Gap**: `gap-2` (8px between elements)
- **Menu Padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Menu Offset**: `mt-2` (8px below card)
- **Item Gap**: `gap-2` (8px between icon and text)

### Z-Index Layering
```
z-50: Menu Panel (top layer)
z-40: Backdrop (middle layer)
Default: Card content (bottom layer)
```

## Browser Compatibility
- Uses standard CSS positioning (`absolute`, `fixed`)
- No experimental features
- Works in all modern browsers
- Touch-friendly on mobile devices

## Future Enhancements

### Potential Menu Items
- **Settings**: User preferences, theme toggle
- **Help**: Tutorial, tips, documentation
- **Share**: Social media sharing options
- **Stats**: Detailed statistics view
- **History**: Match history, past recaps

### Animation Options
- Fade-in transition for backdrop
- Slide-down animation for menu panel
- Icon rotation for ChevronDown (180° when open)
- Scale effect on menu item hover

### Accessibility
- Add `aria-expanded` to menu button
- Add `aria-label` for screen readers
- Keyboard navigation (Tab, Enter, Escape)
- Focus management (trap focus in menu)

## Code Location
- **Component**: `/app/components/SummonerCard.tsx`
- **Usage**: `/src/components/RecapFlow.tsx` (lines 223-228)
- **Imports**: `ChevronDown`, `Home` from `lucide-react`

## Related Components
- **DialogueBubble**: Multi-message dialogue system
- **RecapFlow**: Main recap scene navigation
- **Menu Page**: Entry point with Vel'Koz character

## Testing Checklist
- ✅ Dropdown opens on ChevronDown click
- ✅ Dropdown closes on backdrop click
- ✅ Dropdown closes on menu item click
- ✅ Menu item executes callback
- ⏳ Test with profile data (currently only playerName)
- ⏳ Test responsive behavior on mobile
- ⏳ Test z-index conflicts with other UI
- ⏳ Test keyboard navigation

## Known Issues
1. **Unused Import**: `ArrowLeft` imported but not used (safe to remove)
2. **Profile Data**: RecapFlow only passes `playerName`, not full profile
3. **Lint Warnings**: CSS class suggestions (non-breaking):
   - `bg-gradient-to-br` → `bg-linear-to-br`
   - `flex-shrink-0` → `shrink-0`
4. **Image Optimization**: Next.js suggests using `<Image />` component

## Migration Guide

### To Add Dropdown to SummonerCard
1. Import required hooks and icons:
   ```tsx
   import { useState } from 'react';
   import { ChevronDown, Home } from 'lucide-react';
   ```

2. Add props to component interface:
   ```tsx
   onBackToMenu?: () => void;
   showMenuButton?: boolean;
   ```

3. Add state for dropdown:
   ```tsx
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
   ```

4. Add menu button in component JSX (after profile info)

5. Add conditional dropdown (backdrop + menu panel)

### To Use in Parent Component
```tsx
<SummonerCard
  profile={profile}           // Optional: Full profile data
  rankedInfo={rankedInfo}     // Optional: Ranked information
  playerName={playerName}     // Optional: Fallback name
  containerClassName="relative"
  showMenuButton={true}       // Enable dropdown
  onBackToMenu={handleBack}   // Navigation callback
/>
```

## Performance Notes
- State updates isolated to SummonerCard
- No prop drilling required
- Backdrop click uses event delegation
- Minimal re-renders (only on dropdown toggle)
- No external dependencies beyond Lucide icons
