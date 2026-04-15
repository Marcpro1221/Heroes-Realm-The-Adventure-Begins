# Architecture Walkthrough

This document explains how the codebase is connected at runtime so you can inspect the project file by file without guessing where state comes from.

## 1. Entry Layer

### `app.js`

- Runs `live-server`.
- Serves the repository root.
- Opens `index.html`.

### `index.html`

- Loads the stylesheet from the repo root.
- Loads Phaser from a CDN.
- Loads `docs/src/main.js` as the game entry module.
- Uses `<base href="./docs/">`, so relative asset and script paths resolve inside the `docs` folder.

### `docs/src/main.js`

- Imports `gameConfig`.
- Exposes a small `window.gameState` object for browser-console inspection of world size.
- Creates the Phaser game instance.

This file does not build the world itself. It delegates that to scenes registered in `gameConfig`.

## 2. Configuration Layer

### `docs/src/config/gameConfig.js`

- Defines Phaser renderer, viewport size, and physics settings.
- Registers scenes in startup order.

The scene array is the backbone of the application flow:

1. `BootScene`
2. `CharacterSelectionScene`
3. `MainScene`

### `docs/src/constants`

These files are the project's static data layer:

- `sceneKeys.js`: canonical scene ids used by `scene.start(...)`.
- `gameConstants.js`: world size, player balance, enemy balance, platform coordinates, and spawn points.
- `characters.js`: per-character capabilities, animation keys, spritesheet mappings, combat profiles, and preview metadata.
- `assetPaths.js`: all asset file paths and spritesheet frame sizes.

When you want to understand "what values drive this behavior?", check constants before checking scene logic.

## 3. Scene Layer

### `BootScene`

- Exists only to centralize the first transition.
- Immediately starts `CharacterSelectionScene`.

### `CharacterSelectionScene`

Responsibilities:

- Loads menu assets with `loadCharacterSelectionAssets`.
- Registers preview animations with `registerCharacterSelectionAnimations`.
- Displays character cards.
- Saves the selected character id.
- Starts background menu music.
- Waits for `Space` to enter gameplay.

Important connections:

- Writes the chosen character id to `gameState.selectedCharacterId`.
- Also writes it to `this.registry`, which is how `MainScene` reads the chosen character after the scene transition.

### `MainScene`

This is the central orchestrator of gameplay.

Responsibilities:

- Loads selected-character assets plus world and enemy assets.
- Reads the selected character from `scene.registry`.
- Registers animations for the chosen character and the enemy.
- Builds platforms, parallax backgrounds, UI, audio, and camera.
- Instantiates `Player`.
- Instantiates `EnemyManager`.
- Provides helper functions for attack damage and defense values.
- Handles leveling, upgrades, EXP popups, death, and scene restart cleanup.

Important design choice:

`MainScene` is the place where multiple modules are wired together. That is why it passes callbacks into both `EnemyManager` and `PlayerProfilePanel`.

## 4. Shared Runtime State

### `docs/src/state/gameState.js`

`gameState` stores live object references that multiple modules need at the same time.

Examples:

- `player`
- `enemyGroup`
- `platforms`
- `oneWayPlatforms`
- `movingPlatform`
- `backgroundMusic`

Use this as the shared runtime graph, not as the source of static balance values. Static values belong in `constants`.

## 5. Asset Loading And Animation Registration

### `docs/src/assets/loaders.js`

- Loads scene-specific images, audio, and spritesheets.
- Delegates character spritesheet loading to `characterLoaders.js`.

Main connection:

- `CharacterSelectionScene.preload()` calls `loadCharacterSelectionAssets(...)`.
- `MainScene.preload()` calls `loadMainSceneAssets(...)`.

### `docs/src/assets/characterLoaders.js`

- Resolves which character spritesheets should be loaded.
- Prevents scene code from needing to know every texture key manually.

### `docs/src/assets/animations.js`

- Registers Phaser animations from the loaded spritesheets.
- Returns a map of animation keys for the selected player character.

Important connection:

`registerPlayerAnimations(...)` returns animation keys that are later consumed by `new Player(...)`.

## 6. Entity Layer

### `Character`

- Base class for `Player` and `Enemy`.
- Extends `Phaser.Physics.Arcade.Sprite`.
- Contains shared helper behavior like floating damage text.

### `Hitbox`

- Invisible rectangle with a physics body.
- Used for combat overlap detection and enemy detection zones.

Connections:

- `Player` owns several hitboxes for attacks.
- `Enemy` owns hitboxes for detection and enemy attack reach.
- `EnemyManager` registers physics overlaps between hitboxes and living entities.

### `Player`

`Player` is both:

- the controllable character entity
- the input/combat state machine for the selected character

Main responsibilities:

- Keyboard input
- movement and dash logic
- attack animation state
- hitbox timing
- heal and mana systems
- death behavior
- character-specific combat behavior from `characters.js`

Important dependencies:

- Receives `characterConfig` from `MainScene`.
- Receives `animationKeys` from `registerPlayerAnimations(...)`.
- Reads `gameState.enemyGroup` when finding surprise-strike targets.
- Exposes hitboxes that `EnemyManager` uses for overlap-based damage.

### `Enemy`

- Stores patrol state, knockback state, and detection boxes.
- Handles movement and facing.
- Does not spawn itself and does not manage respawn timers.

That lifecycle is owned by `EnemyManager`.

## 7. System Layer

### `EnemyManager`

This module owns the enemy lifecycle.

Responsibilities:

- scheduling spawns
- creating enemies
- attaching physics collisions and overlaps
- applying enemy damage
- applying player damage on overlap
- updating enemy HP bars
- destroying and respawning enemies

Important design choice:

`EnemyManager` receives helper callbacks from `MainScene` for:

- player attack damage
- defense percent
- defense value

That keeps combat math consistent between:

- enemy damage handling
- profile panel display
- scene-level upgrade logic

## 8. UI Layer

### `PlayerHud`

- Screen-space overlay pinned to the camera.
- Reads live values from the player every frame.
- Shows HP, EXP, mana, FPS, and current control labels.

### `PlayerProfilePanel`

- Screen-space stats and upgrade panel.
- Does not own player state.
- Calls callbacks injected by `MainScene`.

Connection summary:

1. `MainScene` creates the panel.
2. `MainScene` binds upgrade callbacks.
3. Clicking the player toggles the panel.
4. Clicking outside the panel closes it.
5. `MainScene.refreshPlayerUi()` pushes live player data into the panel.

## 9. Combat Flow Example

Example: player presses `C` for smash.

1. `MainScene.update()` calls `gameState.player.update()`.
2. `Player.update()` detects the key press and plays the smash animation.
3. `Player.updateSmashHitbox()` enables `swordHitBox` only during the configured animation frames.
4. `EnemyManager.spawnEnemy()` has already registered an overlap between the player smash hitbox and each enemy.
5. When overlap happens, `EnemyManager.damageEnemy(enemy, 'smash')` runs.
6. `EnemyManager` calculates damage using helper functions from `MainScene`.
7. Enemy HP is reduced, hurt animation is played, and the HP bar is updated.
8. If HP reaches zero, `EnemyManager.destroyEnemy()` grants EXP through `MainScene`.

## 10. Level And Upgrade Flow Example

1. Enemy dies in `EnemyManager.destroyEnemy()`.
2. `MainScene.grantEnemyExp(...)` increases EXP.
3. `MainScene.handlePlayerLevelUp(...)` awards upgrade points and restores mana.
4. `PlayerProfilePanel` displays the new point count.
5. Clicking a profile panel `+` button triggers a callback bound by `MainScene`.
6. `MainScene.upgradePlayerHp()`, `upgradePlayerMana()`, `upgradePlayerDefense()`, or `upgradeAllPlayerAttacks()` mutates the player.
7. `MainScene.refreshPlayerUi()` redraws the HUD and panel.

## 11. Recommended Reading Order For Manual Review

1. `docs/src/main.js`
2. `docs/src/config/gameConfig.js`
3. `docs/src/scenes/BootScene.js`
4. `docs/src/scenes/CharacterSelectionScene.js`
5. `docs/src/scenes/MainScene.js`
6. `docs/src/state/gameState.js`
7. `docs/src/constants/gameConstants.js`
8. `docs/src/constants/characters.js`
9. `docs/src/assets/loaders.js`
10. `docs/src/assets/animations.js`
11. `docs/src/entities/characters/Player.js`
12. `docs/src/systems/EnemyManager.js`
13. `docs/src/entities/characters/Enemy.js`
14. `docs/src/ui/PlayerHud.js`
15. `docs/src/ui/PlayerProfilePanel.js`
