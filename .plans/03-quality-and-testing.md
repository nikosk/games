# Quality and Testing

Quality means the games are fun, understandable, and not broken. Tests and checks support that goal; they are not the goal.

## During development

- Play the main interaction often.
- Run the narrow type check or test for the code being changed.
- Check touch controls on the intended device when input changes.
- Watch the browser console.
- Fix real performance problems after observing them.

## What deserves tests

Write tests for logic where a quiet bug would be annoying or hard to find by playing:

- win and failure rules
- saves and upgrades
- generated or authored level validity
- pathfinding and tactical movement
- puzzle solvers and command interpreters
- simulations and seeded randomness
- build output and public links

Simple scene wiring, animations, and visual polish usually benefit more from playing than from elaborate test harnesses.

Vitest is a sensible default for TypeScript rules. Use browser automation only for flows that are valuable and stable enough to justify it.

## Useful browser checks

For a rewritten game, a small browser check may confirm that:

- the built page opens
- the Phaser canvas appears
- there are no console errors
- the player can begin the main interaction
- progress survives a reload when saving matters

Do not require a large browser suite for every game. Add a regression test after a painful bug when it will prevent a repeat.

## Visual checks

Look at the title, gameplay, pause, success, and failure states together. Confirm that text is readable, controls fit, and feedback is clear.

Screenshot comparison is optional. Use it only where it catches real accidental changes without creating noisy maintenance.

## Performance

Play the busiest scene on the target tablet. If it feels slow, use browser and Phaser tools to find the cause, then fix that cause.

Do not create universal frame, memory, object-count, or file-size budgets before a game needs them. Avoid speculative optimization.

## Before publishing a game

- [ ] The main interaction is fun and understandable.
- [ ] Touch controls work comfortably.
- [ ] Relevant type checks and tests pass.
- [ ] The production build succeeds.
- [ ] The built game opens with no console errors or missing files.
- [ ] The main path has been played from start to finish.
- [ ] Important actions have clear visual and sound feedback.
- [ ] The original is preserved before replacement.
- [ ] The portfolio link works.

That is enough. A game does not need a coverage target, a quality score, a formal report, or a fixed amount of content.

## Portfolio publishing check

Before pushing a generated `docs/` site:

```bash
npm run typecheck
npm test
npm run build
npm run validate
```

Run only commands that exist. Open the generated catalog and changed games manually. If a check cannot run, say so plainly.

Current legacy checks:

```bash
cd crocodile-game && npm run check
cd thegame && npm run build
```
