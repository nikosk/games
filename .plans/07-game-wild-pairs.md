# Wild Pairs — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 2](README.md) · workstreams `W2.4–W2.8`
**Research namespace:** `WP-R##`
**Milestone namespace:** `WP-M##`; unprefixed `M1`, `M2`, … below mean `WP-M01`, `WP-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md) plus this brief's content gates
**Media sheet:** [Wild Pairs production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Value |
|-----------|-------|
| **File** | `animal-memory.html` (537 lines, single-file) |
| **Stack** | Vanilla HTML/CSS/JS, DOM-based card grid, emoji animals |
| **Audio** | None — completely silent |
| **Persistence** | None (moves counted but not saved) |
| **Touch** | ✅ Tap-based (cards clickable) |
| **Tests** | None |
| **Key defects** | 70px mobile cards and 10px gaps are not validated against AS-07/D21; card gap 10px (fat-finger risk); no audio at all; no localStorage for high scores/progress; `matchPulse` keyframe at 1.1x with infinite `bounce` on trophy; no `prefers-reduced-motion`; confetti 50 concurrent animated particles with no cleanup on navigation; win screen exit behavior is inconsistent |
| **Maturity** | ✅ Polished within scope, limited content |

**Current gameplay:** Three difficulty levels (4/6/8 pairs). Cards use emoji animals (16 available). Flip two cards; match = keep revealed, no match = flip back after 1s. Moves counter. Confetti on completion. No time pressure. Pure positive reinforcement.

## 2. Intended Game: Wild Pairs

A wildlife expedition built around matching. Explore illustrated habitats, match beautiful animal photographs/illustrations, hear each animal's call, and complete a field album.

**Player fantasy:** "I am a wildlife photographer exploring habitats and discovering animals."

## 3. Exact Core Loop

```
┌─────────────────────────────────────────────────────┐
│  1. Player selects a habitat on the world map         │
│     (savanna, jungle, ocean, arctic, forest,          │
│      desert, mountain, farm)                          │
├─────────────────────────────────────────────────────┤
│  2. Board appears with face-down photo cards           │
│     • 6–12 pairs depending on difficulty               │
│     • Cards show illustrated animal photographs        │
│     • Each animal has a unique call sound              │
├─────────────────────────────────────────────────────┤
│  3. Player taps a card to flip it                      │
│     • Card flips with paper-turn animation             │
│     • Animal call plays on reveal                      │
│     • Card frame shows habitat-appropriate color       │
├─────────────────────────────────────────────────────┤
│  4. Tap second card                                    │
│     • If match: both cards animate to album slot        │
│       with happy animal sound and sparkle particles     │
│       → Animal is added to field album                 │
│     • If no match: cards flip back after 1s             │
│       with gentle "try again" visual cue               │
├─────────────────────────────────────────────────────┤
│  5. When all pairs matched:                            │
│     • Habitat complete animation                       │
│     • Album page fills with all animals from habitat   │
│     • Star rating based on moves vs par                │
│     • New habitat unlocked on world map                 │
├─────────────────────────────────────────────────────┤
│  6. Album can be viewed any time                        │
│     • All discovered animals with illustrations         │
│     • Tap animal to see close-up and hear call          │
└─────────────────────────────────────────────────────┘
```

## 4. Controls

| Action | Touch | Keyboard/Mouse | Notes |
|--------|-------|----------------|-------|
| Select habitat | Tap map pin | Click map pin | Only unlocked habitats interactive |
| Flip card | Tap card | Click card | Size/spacing selected by WP-R02 and AS-07 |
| View album | Tap album icon | Click album icon | Shows all discovered animals |
| Return to map | Tap back button | Click back button | From game or album |
| Repeat animal call | Tap animal in album | Click animal in album | Heard through audio system |
| Sound toggle | Tap speaker icon | Click speaker icon | Persistent setting |

## 5. Scenes

| Scene | Purpose | Key Elements |
|-------|---------|--------------|
| `BootScene` | Load assets, progress bar | Animal sprites, habitat backgrounds, audio preload |
| `MenuScene` | World map with habitat pins | 8 habitat locations, lock/unlock states, album button, settings |
| `GameScene` | Card matching board | Grid of face-down cards, flip/match logic, move counter, HUD |
| `AlbumScene` | Field album of discovered animals | Grid of animal cards, tap to view large + hear call |
| `HabitatCompleteScene` | Post-round celebration | Animation, star rating, new animal album entries |
| `SettingsScene` | Audio, reset album | Music/SFX sliders, reset progress confirmation |

## 6. Systems

| System | Responsibility | Shared or Game-Specific |
|--------|---------------|------------------------|
| **Board** | Card grid state, pair generation, shuffle, match detection | Game-specific |
| **Card** | Flip animation, face/back rendering, state management | Game-specific |
| **Match logic** | Pair validation, move counting, par comparison, completion detection | Game-specific |
| **Habitat** | Habitat data loading, unlock flow, difficulty tiers | Game-specific |
| **Album** | Discovered animal tracking, close-up view, call replay | Game-specific |
| **Audio** | Animal calls, card flip, match success, ambient habitat sounds | Consumes `packages/audio` |
| **Input** | Tap detection, card interaction | Consumes `packages/input` |
| **Save** | Album progress, habitat unlocks, settings | Consumes `packages/core` |
| **UI** | World map, level select, album, pause | Consumes `packages/ui` |
| **Effects** | Sparkle particles on match, confetti on habitat complete | Consumes `packages/effects` |

## 7. Level / Content Target

**8 habitats, each with 3 difficulty tiers (6/8/10 pairs):**

| Habitat | Animals (12 per habitat) | Visual Theme | Ambient Sound |
|---------|-------------------------|--------------|---------------|
| **Savanna** | Lion, giraffe, zebra, elephant, rhino, cheetah, hippo, ostrich, warthog, meerkat, hyena, baboon | Golden grasslands, acacia trees | Distant roars, birds, wind |
| **Jungle** | Monkey, parrot, toucan, jaguar, sloth, frog, butterfly, snake, piranha, macaw, capybara, iguana | Dense green canopy, vines | Rain, bird calls, insects |
| **Ocean** | Dolphin, whale, sea turtle, clownfish, octopus, shark, jellyfish, starfish, seahorse, ray, orca, seal | Blue depths, coral reef | Water, whale song |
| **Arctic** | Polar bear, penguin, seal, walrus, arctic fox, snowy owl, reindeer, whale, beluga, puffin, hare, wolf | White/blue ice, snow | Wind, ice crackling |
| **Forest** | Fox, bear, deer, owl, rabbit, squirrel, wolf, hedgehog, badger, woodpecker, butterfly, mouse | Green woods, fallen leaves | Birds, leaves rustling |
| **Desert** | Camel, lizard, scorpion, snake, fennec fox, meerkat, vulture, tortoise, jerboa, cobra, dung beetle, roadrunner | Orange sand dunes, rock | Wind, sand shifting |
| **Mountain** | Eagle, mountain goat, snow leopard, yak, condor, marmot, pika, ibex, wolf, bear, hawk, sheep | Grey rock, snow peaks | Wind, echoes |
| **Farm** | Horse, cow, sheep, pig, chicken, duck, goat, dog, cat, donkey, rooster, rabbit | Green fields, barn | Barnyard sounds, bell |

**Album:** 96 total animals (12 per habitat × 8 habitats). Each animal has:
- Illustrated card face (sprite)
- Animal call sound effect (2–5s designed or recorded)
- Name label legible at the minimum approved card size
- Small fun fact text (for parent reading)

**Progression:** Habitats unlock sequentially. Each habitat has 3 difficulty tiers unlocked by achieving 1 star on previous tier.

## 8. Art / Animation / Audio Deliverables

**Art:**

| Asset | Type | Details |
|-------|------|---------|
| Animal illustrations (96 total) | Painted watercolour-style sprites | Card face art, consistent style, expressive poses |
| Card backs | Patterned design | One universal back, habitat-coloured variants |
| Card frame per habitat | Decorative border | 8 colour variants matching habitat palette |
| World map background | Illustrated map | Stylized continents with habitat region markers |
| Habitat pins | Interactive UI icons | Locked/unlocked/current states, 8 pins |
| Album book | Illustrated notebook/diary | Leather-bound aesthetic with tabbed pages |
| UI elements | Buttons, icons, panels | Playful rounded style matching catalog |

**Animation:**

| Element | Animation | Technique |
|---------|-----------|-----------|
| Card flip | 3D flip (rotateY 0→180°) | CSS 3D transform or Phaser mesh |
| Match success | Scale pulse + sparkle particles | Phaser tween + particle emitter |
| No match | Gentle shake + fade back | Phaser shake tween |
| Album entry | Card flies to album slot | Phaser motion tween |
| Habitat unlock | Pin glows + scale bounce | Phaser tween cycle |
| World map reveal | Zoom to habitat | Phaser camera zoom |

**Audio:**

| Sound | Type | Trigger | Priority |
|-------|------|---------|----------|
| Card flip | Paper-rustle effect | Each card flip | Must-have |
| Match success | Happy chime | Match found | Must-have |
| No match | Gentle "boop" | Mismatch | Must-have |
| Animal call (96 unique) | Designed/recorded | Card reveal, album tap | Must-have |
| Habitat ambience (8 tracks) | Ambient loop | During gameplay in habitat | Should-have |
| UI tap | Soft click | Button interactions | Must-have |
| Habitat complete fanfare | Triumphant chime | All pairs matched | Must-have |
| Album page turn | Paper effect | Navigate album | Nice-to-have |

## 9. Data Models

```typescript
interface AnimalData {
  id: string;                // e.g. "savanna-lion"
  name: string;              // "Lion"
  habitat: HabitatId;
  sprite: string;            // asset key
  callCue: string;           // audio cue key
  funFact: string;           // short fun fact
}

interface HabitatData {
  id: 'savanna' | 'jungle' | 'ocean' | 'arctic' | 'forest' | 'desert' | 'mountain' | 'farm';
  name: string;
  color: string;             // card frame color
  animalIds: string[];       // 12 animal IDs
  ambientCue: string;        // ambient audio cue
  unlockRequirement: number | null; // previous habitat 1-star minimum, or null for first
}

interface DifficultyTier {
  pairs: number;             // 6, 8, or 10
  par: number;               // target moves for 3 stars
  gridCols: number;
}

interface GameRound {
  habitatId: HabitatId;
  tier: number;               // 0, 1, 2
  animals: AnimalData[];      // shuffled pair-set
  moves: number;
  matched: number;
  completed: boolean;
}

interface WildPairsSave {
  habitatStars: Record<string, [number, number, number]>; // habitatId → [tier0 stars, tier1, tier2]
  albumEntries: string[];      // discovered animal IDs
  settings: { music: boolean; sfx: boolean };
}
```

## 10. Shared Packages Consumed

| Package | Modules Used | Integration Point |
|---------|-------------|-------------------|
| `packages/core` | Game bootstrap, Phaser config | Entry point |
| `packages/input` | Tap detection, button interaction | Card flip, menu navigation |
| `packages/audio` | Audio bus, cue management, ambient loops | Animal calls, card sounds, habitat ambience |
| `packages/ui` | Button, panel, level-select, modal | Menu, album view |
| `packages/effects` | Particles (sparkle, confetti), camera effects | Match success, habitat complete |

## 11. Game-Specific Systems

| System | File | Lines (est.) | Description |
|--------|------|-------------|-------------|
| BoardManager | `src/systems/BoardManager.ts` | ~250 | Card grid creation, shuffle, layout per difficulty |
| CardManager | `src/systems/CardManager.ts` | ~200 | Flip animation, state tracking, match detection |
| MatchLogic | `src/systems/MatchLogic.ts` | ~150 | Pair validation, move counting, par comparison |
| HabitatManager | `src/systems/HabitatManager.ts` | ~150 | Habitat data, unlock conditions, difficulty mapping |
| AlbumManager | `src/systems/AlbumManager.ts` | ~100 | Discovered animals, close-up view, call replay |

## 12. Milestone Slices

| Milestone | Scope | Deliverable | Verification |
|-----------|-------|-------------|--------------|
| **M1: Core matching** | Single habitat (savanna), 6 pairs, card flip, match/no-match logic | Cards flip, match detected, no-match flips back | Play one round |
| **M2: Audio + album** | Animal calls on flip, match chime, basic album view | Audio feedback works, album collects matched animals | Match pair, check album |
| **M3: Habitat system** | 4 habitats with map, unlock progression, difficulty tiers | Map shows habitats, tier 1→2→3 unlocks | Complete savanna, unlock jungle |
| **M4: Art target** | Watercolour animal sprites, map background, card designs | Visuals match Wild Pairs brief | Visual review |
| **M5: Full content** | All 8 habitats, 96 animals, all audio | Complete campaign playable | Complete playthrough |
| **M6: Production** | Build, tests, tablet test, deployment | Game live at /games/wild-pairs/ | Built game loads, no errors |

## 13. Tests

| Test Type | Scope | Tool |
|-----------|-------|------|
| Match detection | Correct/incorrect pair identification | Vitest |
| Shuffle determinism | Seeded shuffle produces correct pair distribution | Vitest |
| Par scoring | Moves vs par thresholds produce correct star rating | Vitest |
| Habitat unlock | Unlock conditions evaluated correctly | Vitest |
| Album deduplication | Same animal not added twice | Vitest |
| Save/load | Progress serialization round-trip | Vitest |
| Browser smoke | Game loads, cards flip, match detected | Playwright |

## 14. Completion Checklist

- [ ] 8 habitats with 12 animals each (96 total illustrated animals)
- [ ] 3 difficulty tiers per habitat (6/8/10 pairs)
- [ ] Card flip animation (3D rotate)
- [ ] Match detection with sparkle animation
- [ ] No-match flip-back with gentle visual cue
- [ ] 96 animal call sounds
- [ ] Card flip and match sounds
- [ ] Habitat ambience for all 8 habitats
- [ ] World map with lock/unlock/current states
- [ ] Field album with all discovered animals
- [ ] Tap animal in album to see close-up + hear call
- [ ] Star rating per tier (1–3 based on moves vs par)
- [ ] Habitat complete fanfare
- [ ] Persistent progress save
- [ ] Settings: music/SFX toggles
- [ ] `prefers-reduced-motion` respected
- [ ] Card and UI targets meet WP-R02/AS-07 measurements on D21
- [ ] No browser dialogs
- [ ] Production build passes, deployed to /games/wild-pairs/

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 96 unique animal calls is expensive/time-consuming | Medium | High | Use procedural animal calls + tier-limited unique recordings; fallback to procedural for all |
| Watercolour-style art for 96 animals is high volume | Medium | High | Batch animal production in groups of 12 per habitat; use consistent pose template per animal type |
| Card grid on small tablets (10 pairs = 20 cards) | Low | Medium | Use the WP-R02-selected card size/gap and scroll/layout strategy |
| Large asset count impacts load time | Medium | Medium | Lazy-load habitats; preload next habitat during gameplay; sprite atlas per habitat |

## 16. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| WP-R01 | Compare recorded/licensed calls with designed cues for the 96-animal set. | `.plans/research/WP-R01.md` with 12-animal sample batch, provenance, production-time/size projection, and blind owner review. Decision criterion: select a repeatable method that gives every animal a distinguishable approved cue within media/license budgets. | 3 days | WP-M02 | Media implementer + owner approval | Open |
| WP-R02 | Test card touch target ergonomics at 56px/64px/72px | `.plans/research/WP-R02.md` plus the named prototype/measurement. Decision criterion: determine minimum card size under direct touch | 2 days | WP-M03 | Tech lead | Open |
| WP-R03 | Evaluate sprite atlas vs individual image loading for 96 animals | `.plans/research/WP-R03.md` plus the named prototype/measurement. Decision criterion: inform asset loading strategy | 2 days | WP-M01 | Media implementer + owner approval | Open |
