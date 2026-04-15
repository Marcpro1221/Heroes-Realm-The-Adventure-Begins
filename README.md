# Heroes Realm: The Adventure Begins

This project is a Phaser-based side-scrolling action game served by a small Node `live-server` wrapper. The browser entry page lives at `index.html`, while the actual game code lives under `docs/src`.

## Run Locally

```bash
npm install
npm run dev
```

The server opens `index.html`, which points the browser to `docs/src/main.js`.

## Codebase Map

- `app.js`: starts the local static server.
- `index.html`: loads Phaser from CDN and boots `docs/src/main.js`.
- `docs/src/main.js`: creates the Phaser game with `gameConfig`.
- `docs/src/config/gameConfig.js`: registers scenes and physics config.
- `docs/src/scenes`: high-level scene flow.
- `docs/src/constants`: data tables for assets, characters, scene keys, and balancing.
- `docs/src/assets`: asset loading and animation registration helpers.
- `docs/src/entities`: reusable game objects such as `Player`, `Enemy`, and `Hitbox`.
- `docs/src/systems/EnemyManager.js`: owns enemy spawn lifecycle and player-enemy combat wiring.
- `docs/src/ui`: screen-space HUD and profile panel.
- `docs/src/state/gameState.js`: shared runtime references used across scene, system, and entity modules.

## Runtime Flow

1. `index.html` loads Phaser and `docs/src/main.js`.
2. `main.js` creates `new Phaser.Game(gameConfig)`.
3. `gameConfig` registers three scenes in order:
   - `BootScene`
   - `CharacterSelectionScene`
   - `MainScene`
4. `BootScene` immediately forwards to character selection.
5. `CharacterSelectionScene` loads preview assets, lets the player choose a character, then stores the chosen id in both:
   - `scene.registry`, which Phaser uses to pass data to the next scene
   - `gameState`, which keeps a convenient shared runtime reference
6. `MainScene` reads the selected character id, loads only that character's spritesheets, creates the world, instantiates `Player`, creates UI, then starts `EnemyManager`.
7. During gameplay:
   - `Player.update()` handles input, animation changes, hitbox timing, mana, and special actions.
   - `EnemyManager.update()` handles enemy movement, health bars, and damage interactions.
   - `MainScene.update()` coordinates both and refreshes the UI.

## Where To Read First

If you want to understand the whole project in the shortest path, read files in this order:

1. `docs/src/main.js`
2. `docs/src/config/gameConfig.js`
3. `docs/src/scenes/BootScene.js`
4. `docs/src/scenes/CharacterSelectionScene.js`
5. `docs/src/scenes/MainScene.js`
6. `docs/src/state/gameState.js`
7. `docs/src/constants/characters.js`
8. `docs/src/entities/characters/Player.js`
9. `docs/src/systems/EnemyManager.js`
10. `docs/src/entities/characters/Enemy.js`
11. `docs/src/ui/PlayerHud.js`
12. `docs/src/ui/PlayerProfilePanel.js`

## Architecture Notes

- The project is data-driven in a few important places:
  - `characters.js` decides which animations, attack labels, and combat behavior a playable character supports.
  - `gameConstants.js` controls world dimensions, platform layout, enemy spawn tuning, and balance numbers.
  - `assetPaths.js` centralizes file paths.
- `gameState` is intentionally used as a shared runtime object for live references such as `player`, `enemyGroup`, `platforms`, and background music.
- `scene.registry` is used for short cross-scene handoff, especially the selected character id.
- `PlayerProfilePanel` does not upgrade the player directly. It exposes buttons, and `MainScene` injects the upgrade callbacks. This keeps UI rendering separate from gameplay state changes.
- `EnemyManager` does not calculate all player stats by itself. `MainScene` injects helper functions so enemy combat uses the same damage and defense rules shown in the UI.

## Extra Documentation

For a more detailed architecture walkthrough, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
