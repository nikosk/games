# {{GAME_TITLE}} — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Draft
**Game ID:** `{{GAME_ID}}`
**Roadmap phase/workstreams:** `{{PHASE}}` / `{{WORKSTREAM_IDS}}`
**Research namespace:** `{{PREFIX}}-R##`

> Do not approve the brief while any section is empty. Product and content choices belong to the owner. All research follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract).

## 1. Current-state diagnosis

Record legacy path, stack, size, controls, audio, persistence, tests, defects, public URL, and preservation path. Do not discuss content suitability.

## 2. Intended game

Define title, genre, player fantasy, tone, differentiators, and the concrete improvement over the prototype.

## 3. Core interaction loop

Provide an exact step-by-step loop from entry through meaningful action, feedback, completion/failure, reward, and replay/progression.

## 4. Controls

| Action | Touch | Keyboard/mouse | Feedback and edge cases |
|---|---|---|---|
| {{ACTION}} | {{GESTURE}} | {{BINDING}} | {{FEEDBACK}} |

## 5. Scenes

List every Phaser scene, transition, overlay, and lifecycle responsibility. Include a scene graph.

## 6. Systems and ownership

| System | Responsibility | Shared package or game-specific | Public contract |
|---|---|---|---|
| {{SYSTEM}} | {{RESPONSIBILITY}} | {{OWNER}} | {{API}} |

## 7. Content and progression target

Define exact level/region/encounter counts, mechanic introduction order, scoring, unlocks, replay value, and content authoring rules.

## 8. Art, animation, effects, and audio

List each required asset family, dimensions/format, animation states and frame targets, SFX cues, music states, provenance requirements, priority, and temporary replacement milestone. Cross-link the production sheet in [04-media-production.md](04-media-production.md).

## 9. Data and save models

Provide strict TypeScript interfaces, boundary validation, deterministic-randomness requirements, save version, migration path, and invalid-data behavior.

## 10. Shared packages consumed

State exactly which APIs from core, input, audio, UI, effects, testing, and tools are used. Do not invent sharing for game rules.

## 11. Game-specific modules

| File/module | Responsibility | Dependencies | Test seam |
|---|---|---|---|
| `src/...` | {{RESPONSIBILITY}} | {{DEPENDENCIES}} | {{TEST}} |

## 12. Milestone slices

| ID | Playable outcome | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| M1 | {{OUTCOME}} | {{IDS}} | {{ARTIFACT}} | {{COMMAND_AND_MANUAL_CHECK}} |

Milestones follow: temporary core interaction → one complete scenario → target-device input → approved media target → remaining content → release.

## 13. Test plan

Map pure rules, data validation, saves, scene/browser flows, touch, resize, visuals, performance, built paths, and post-deploy smoke to named tests and gates.

## 14. Completion checklist

- [ ] Brief-specific content target complete
- [ ] All [G1–G16](03-quality-and-testing.md) pass with evidence
- [ ] All [C1–C8](03-quality-and-testing.md) pass with evidence
- [ ] Legacy implementation preserved and rollback tested
- [ ] Temporary asset inventory is empty

## 15. Risks

| ID | Risk | Likelihood | Impact | Trigger | Mitigation/rollback | Owner |
|---|---|---|---|---|---|---|
| {{PREFIX}}-K01 | {{RISK}} | {{LEVEL}} | {{LEVEL}} | {{TRIGGER}} | {{MITIGATION}} | {{OWNER}} |

## 16. Research tasks

| ID | Question | Deliverable | Decision criteria | Timebox | Deadline/blocks | Owner | Status |
|---|---|---|---|---|---|---|---|
| {{PREFIX}}-R01 | {{QUESTION}} | `.plans/research/{{PREFIX}}-R01.md` + {{PROTOTYPE}} | {{MEASURABLE_CRITERIA}} | {{DAYS}} | {{MILESTONE}} | {{OWNER}} | Open |
