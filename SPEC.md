# Zoo Helper - Programming Game for Toddlers

## Concept & Vision

A cheerful single-page HTML game where toddlers guide an orange cat through increasingly complex puzzles by tapping directional commands. The cat responds with delightful animations as each command executes, building an intuitive understanding of sequencing and loops. The tone is warm, celebratory, and playful — every interaction rewards with sound, motion, and sparkle.

## Design Language

**Aesthetic Direction**: Soft, rounded, toy-like — like a Fisher-Price digital toy. High saturation, chunky shapes, no sharp edges.

**Color Palette**:
- Background: `#f0f7e6` (soft grass green)
- Play area: `#e8f5e0` (lighter green, the "floor")
- Command cards: `#ffffff` with `#4a90d9` border (white with blue)
- Directional arrows: `#4a90d9` (friendly blue)
- Cat character: `#ff8c42` (warm orange)
- Accent/celebration: `#ffd93d` (sunny yellow)
- Success: `#6bcb77` (fresh green)
- UI panel: `#fff9e6` (warm cream)
- Text: `#5a4a3a` (soft brown)

**Typography**: System fonts only for performance. Rounded sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Large sizes throughout.

**Spatial System**:
- Command cards: 80x80px with 16px border-radius
- Grid cells: 60x60px
- Generous padding (20-40px) throughout
- Landscape-first layout

**Motion Philosophy**:
- Cat idle: gentle bounce (subtle translateY oscillation, 1s loop)
- Cat walk: bouncy translate between cells (300ms ease-out)
- Command card tap: scale down to 0.9 then back (100ms)
- Command execution: card glows with yellow ring
- Level complete: confetti burst, cat dance animation, stars radiate

**Visual Assets**:
- Cat: CSS-drawn (rounded shapes, triangle ears, dot eyes)
- Direction arrows: Unicode arrows (↑↓←→) rendered large and bold
- Grid: subtle rounded squares with soft borders
- Hats/accessories: CSS-drawn simple shapes (party hat, crown, bow)

## Layout & Structure

**Landscape layout** (min-width 800px, min-height 500px):

```
┌─────────────────────────────────────────────────────────┐
│  [🐱 Zoo Helper]              Level 1    🔊 ON  │  <- Header (60px)
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│         PLAY AREA                 │   COMMAND PANEL     │
│        (Grid + Cat)               │                     │
│                                   │   [↑]  [↓]          │
│                                   │   [←]  [→]          │
│                                   │   [🔄 RUN]          │
│                                   │                     │
│                                   │   [🗑️ CLEAR]        │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│              PROGRAM SEQUENCE BAR                        │  <- Shows built sequence
│         [ → ] [ → ] [ ↓ ] [ ← ] [ ← ]                   │
└─────────────────────────────────────────────────────────┘
```

**Responsive**: On narrow screens, command panel moves below play area in portrait stack.

## Features & Interactions

### Core Gameplay Loop
1. Toddler views the puzzle (cat's starting position, goal position, obstacles)
2. Toddler taps command cards to build a sequence in the program bar
3. If same command tapped consecutively, cards merge with badge (→ → → becomes → x3)
4. Toddler taps "RUN" to execute the sequence
5. Each command highlights as it executes, cat moves accordingly
6. If cat reaches goal: celebration! Hat unlocked or level advance
7. If cat doesn't reach goal: gentle "try again" prompt, sequence clears

### Command Cards
- **Tap**: Add command to sequence (with tap animation)
- **Visual merge**: Consecutive identical commands show badge count
- **Available commands by level**:
  - Levels 1-3: ↑ ↓ ← →
  - Level 4+: + Jump (obstacles)
  - Level 5+: + Beep (activates doors)

### Run Button
- Disabled (greyed) until at least one command in sequence
- On tap: sequence locks, commands execute one by one (500ms per step)
- During execution: RUN button shows "..." and is disabled

### Clear Button
- Removes all commands from sequence
- Subtle shake animation on the program bar when tapped with empty sequence

### Level Progression
| Level | Grid | Goal | Commands | Special |
|-------|------|------|----------|---------|
| 1 | 3x3 | 1 step | ↑↓←→ | Straight path |
| 2 | 3x3 | 2 steps | ↑↓←→ | One turn |
| 3 | 4x4 | 3-4 steps | ↑↓←→ | Multiple turns |
| 4 | 4x4 | 3-4 steps | +Jump | Puddle obstacle (must jump) |
| 5 | 4x4 | 4-5 steps | +Beep | Bell obstacle (must beep to open) |
| 6 | 5x5 | 6 steps | Loops | Repeat section needed |
| 7 | 5x5 | 8 steps | All | Mixed challenge |

### Loop Mechanic
- Loop detection: same command sequence detected when building
- Visual: merged badges only, no special loop card yet
- When sequence runs: cat executes the merged count

### Celebration (Heavy)
- Confetti particles (CSS animation, 20-30 particles)
- Cat does 3-second dance animation (bounce + spin)
- Stars radiate outward from cat
- Hat/accessory unlocked with sparkle effect
- "Level Complete!" banner drops in
- "Play More" button appears
- Auto-advance after 3 seconds OR tap "Play More"

### Hat Unlocks
- Level 1: Party Hat (colorful cone)
- Level 2: Bow (pink ribbon)
- Level 3: Crown (gold)
- Level 4: Astronaut helmet
- Level 5: Flower crown
- Level 6: Superhero cape
- Level 7: Magic wand + star

### Persistence (localStorage)
- Current level saved
- Hats unlocked saved
- Sound/music preference saved
- On load: resume from saved level, apply owned hats

### Audio
- **Music**: Cheerful loop (base64 encoded or generated with Web Audio API)
- **SFX**: Tap click, command execute beep, celebration fanfare, cat meow
- **Toggle**: Music on/off button in header, persists to localStorage

## Component Inventory

### Header Bar
- Game title with cat emoji icon
- Current level indicator
- Sound toggle button (speaker icon)
- Music toggle button (music note icon)

### Play Area
- CSS grid of cells
- Cat character (animated, positioned absolutely within grid)
- Goal marker (fish bone icon or food bowl)
- Obstacles (puddles, bells) with distinct visual

### Command Panel
- 2x2 grid of direction cards (↑↓←→)
- Additional cards appear as levels unlock (Jump, Beep)
- Large RUN button below
- CLEAR button at bottom

### Program Sequence Bar
- Horizontal scrollable container
- Command chips showing merged sequence
- Empty state: subtle "Tap commands to build your program" text
- Active execution: current command glows

### Celebration Overlay
- Full-screen semi-transparent overlay
- Confetti canvas or CSS particle system
- Central celebration card with level info
- "Play More" button
- Auto-dismisses after 3s

### Hats/Accessories
- Shown on cat during gameplay
- Selected hat has sparkle indicator in any hat-selection UI

## Technical Approach

**Stack**: Single HTML file with embedded CSS and JavaScript. No frameworks, no build step.

**Audio**: Web Audio API for generated tones and simple sounds (no external files). Music is a simple looping melody generated programmatically.

**Animation**: CSS animations and transitions. JavaScript for sequencing and state management.

**State Management**: Single game state object. Pure functions for state transitions.

**Grid System**: CSS Grid for play area. Cat position tracked as {row, col} coordinates.

**Persistence**: `localStorage.setItem('zoohelper', JSON.stringify(state))` on every state change.

**Level Data**: Array of level objects with grid size, start/goal positions, obstacles, available commands.

**Execution Loop**: `async` function with `await` delays between steps. Each step: highlight command, move cat, check win/lose.
