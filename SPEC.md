# Train Track Puzzle - Game Specification

## Project Overview
- **Project Name**: Train Track Puzzle
- **Type**: Browser-based puzzle game for toddlers
- **Core Functionality**: Drag-and-drop track tiles to create a path from train to station
- **Target Users**: Toddlers (ages 2-5) and parents

## UI/UX Specification

### Layout Structure
- **Full viewport game** - takes 100vw x 100vh
- **Header area** - 60px height with title and controls
- **Game grid** - Central area, fills remaining space
- **Toolbar** - Bottom dock, 120px height with track tiles

### Visual Design

#### Color Palette
- **Background**: `#87CEEB` (sky blue) with gradient to `#E0F4FF`
- **Grass/Ground**: `#7CB342` (friendly green)
- **Grid lines**: `#5D8A2F` (darker green)
- **Track color**: `#8B4513` (wooden brown) with `#654321` (dark brown) rails
- **Train**: `#E53935` (bright red) body, `#FFD600` (yellow) accents
- **Station**: `#FF7043` (coral orange) roof, `#FFECB3` (cream) walls
- **UI buttons**: `#FF9800` (orange) with `#FFF` text
- **Toolbar background**: `#3E2723` (dark wood)

#### Typography
- **Font**: "Fredoka One" (Google Fonts) - playful, rounded
- **Title**: 32px, white with text shadow
- **Buttons**: 20px, bold
- **Labels**: 16px

#### Visual Effects
- **Soft shadows** on all interactive elements
- **Bounce animation** on button press
- **Glow effect** on valid drop zones
- **Smoke puffs** from train chimney when moving
- **Stars/sparkles** when train reaches station

### Components

#### Track Tiles (in toolbar)
1. **Straight track** - Horizontal orientation
2. **Straight track** - Vertical orientation  
3. **Corner track** - 4 rotations (NE, SE, SW, NW)

#### Grid Cell States
- Empty: Grass texture
- Track placed: Track graphic with wooden sleepers
- Hover (when dragging): Highlight glow
- Valid placement: Green tint
- Invalid placement: Red tint

#### Train Sprite
- Cartoonish steam engine
- Red body with yellow accents
- Animated wheels
- Smoke particles when moving
- Size: 60x40px

#### Station Sprite
- Cute cottage-style station
- Orange/red roof with white cross (Swiss style)
- Clock on front
- "STATION" sign
- Size: 80x80px

### Responsive Behavior
- Grid scales to fit viewport
- Minimum cell size: 60px
- Touch-friendly tap targets (minimum 60px)

## Functionality Specification

### Core Features

1. **Grid System**
   - Variable sizes: 4x4 (easy), 5x5 (medium), 6x6 (hard)
   - Click size selector to change difficulty
   - Grid resets when size changes

2. **Track Placement**
   - Drag track from toolbar to grid
   - Click placed track to rotate (90° increments)
   - Right-click or double-tap to remove track
   - Tracks can be moved after placement

3. **Pathfinding**
   - Algorithm checks if continuous path exists from train to station
   - Train only moves if valid path exists
   - Highlights path when "Go" is pressed if valid

4. **Train Movement**
   - Smooth animation along tracks (200ms per cell)
   - Stops at junctions if no clear path
   - Celebrates with animation when reaching station

5. **Level Randomization**
   - Train start position: Random edge cell
   - Station position: Random edge cell (opposite side preferred)
   - Ensures at least one valid path exists for solvable puzzles

### User Interactions
- **Drag**: Pick up track from toolbar
- **Drop**: Place track on grid cell
- **Click (on placed track)**: Rotate 90°
- **Right-click/Double-tap**: Remove track
- **Go button**: Start train movement
- **Reset button**: Clear all tracks, randomize positions

### Edge Cases
- Cannot place track on train or station
- Cannot rotate train/station
- Train stops if path blocked mid-way
- Visual feedback for invalid actions

## Acceptance Criteria

### Visual Checkpoints
- [ ] Game fills entire viewport
- [ ] Sky background with grass area
- [ ] Toolbar visible at bottom with 5 track types
- [ ] Train appears at starting position with idle animation
- [ ] Station visible with welcoming appearance
- [ ] All graphics are cartoonish and colorful

### Functional Checkpoints
- [ ] Can drag tracks from toolbar to grid
- [ ] Tracks snap to grid cells
- [ ] Can rotate tracks by clicking
- [ ] Can remove tracks by right-click
- [ ] Can move placed tracks
- [ ] Go button triggers train movement
- [ ] Train follows track path smoothly
- [ ] Train stops if no path forward
- [ ] Celebration when train reaches station
- [ ] Grid size can be changed (4x4, 5x5, 6x6)
- [ ] Level randomizes on reset

### Technical Checkpoints
- [ ] No console errors
- [ ] Smooth animations (60fps)
- [ ] Touch-friendly for tablets
- [ ] Works in modern browsers
