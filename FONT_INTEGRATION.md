# Friz Quadrata Font Integration

## Overview
Integrated the classic **Friz Quadrata** font (the official League of Legends font) into the project for all headings, summoner cards, and champion cards.

## Font Files
Located in `/public/`:
- `friz-quadrata-regular-os-5870333951e7c.ttf` - Regular weight
- `friz-quadrata-bold-italic-os-5870341205e7c.ttf` - Bold italic weight

## Global CSS Changes (`app/globals.css`)

### 1. Font-Face Declarations
```css
@font-face {
  font-family: 'Friz Quadrata';
  src: url('/friz-quadrata-regular-os-5870333951e7c.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Friz Quadrata';
  src: url('/friz-quadrata-bold-italic-os-5870341205e0f.ttf') format('truetype');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
```

### 2. CSS Variables
```css
:root {
  --font-friz: 'Friz Quadrata', serif;
}

@theme inline {
  --font-heading: var(--font-friz);
}
```

### 3. Global Application
```css
/* Apply to all headings globally */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Friz Quadrata', serif;
}

/* Utility class for manual application */
.font-friz {
  font-family: 'Friz Quadrata', serif;
}
```

## Component Updates

### SummonerCard (`app/components/SummonerCard.tsx`)
✅ **Updated**

```tsx
// Name
<h1 className="... font-friz">
  {displayName}
  <span className="... font-friz">#{displayTag}</span>
</h1>

// Stats
<div className="... font-friz">
  <div>Lv {displayLevel}</div>
  ...
</div>

// Menu button
<button className="... font-friz">
  <span>Back to Menu</span>
</button>
```

### Champion Cards (`src/components/RecapFlow.tsx`)
✅ **Partially Updated** - Damage scene updated

Apply `font-friz` class to:
- Champion names: `<h3 className="... font-friz">`
- Scene titles: `<p className="... font-friz">`  
- Stat labels: `<span className="... font-friz">`
- Stat values: `<span className="... font-friz">`

## Remaining Champion Card Scenes to Update

Apply the same pattern to these scenes:

### 1. Signature Champion
- Line ~599: Champion name heading
- Stats display labels and values

### 2. Damage Share
- Line ~722: Champion name (Already updated ✅)
- Stats: KDA, Total Damage labels

### 3. Damage Taken
- Line ~1002: Champion name
- Stats labels and values

### 4. Total Healed
- Line ~1282: Champion name
- Stats labels and values

### 5. Signature Position
- Line ~1520: Position name
- Top 3 champions display

### 6. Path Forward (MVP Match)
- Line ~2361: Champion name
- All stat labels (KDA, Damage, Vision Score, CS, Gold, Items, Summoner Spells)

## Quick Update Pattern

For each champion card section, add `font-friz` to:

```tsx
// Champion name
<h3 className="text-3xl font-bold text-white font-friz">

// Subtitle
<p className="text-sm text-gray-400 mt-1 font-friz">

// Stat labels
<span className="text-sm text-gray-300 font-friz">

// Stat values
<span className="text-2xl font-bold ... font-friz">

// Section headers (Items, Summoner Spells, etc.)
<p className="text-sm text-gray-300 mb-3 font-friz">
```

## Tailwind Config (Optional Enhancement)

To use Friz Quadrata in Tailwind utilities, add to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        friz: ['Friz Quadrata', 'serif'],
      },
    },
  },
}
```

Then use: `className="font-friz"`

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support with `font-display: swap`

## Performance

- `font-display: swap` ensures text is visible immediately
- Font files are cached by browser after first load
- Total font size: ~200KB (acceptable for web fonts)

## Visual Impact

The Friz Quadrata font gives the app:
- Authentic League of Legends feel
- Medieval/fantasy aesthetic
- Professional, game-like appearance
- Better brand alignment with LoL

## Testing

1. Check all headings use Friz Quadrata
2. Verify SummonerCard text renders correctly
3. Test champion cards across all scenes
4. Ensure font loads properly on first visit
5. Check mobile responsiveness with custom font

## Fallback

If font fails to load, fallback is `serif` system font:
```css
font-family: 'Friz Quadrata', serif;
```
