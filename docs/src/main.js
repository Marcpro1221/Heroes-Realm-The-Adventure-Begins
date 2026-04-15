import gameConfig from './config/gameConfig.js';
import { GAME_DIMENSIONS } from './constants/gameConstants.js';

/**
 * Shared global world size for debugging and browser console inspection.
 * This is separate from `src/state/gameState.js`: here we only expose a tiny
 * browser-global helper, while `gameState.js` stores the live Phaser objects
 * used by scenes, entities, and systems during gameplay.
 */
window.gameState = {
  height: GAME_DIMENSIONS.worldHeight,
  width: GAME_DIMENSIONS.worldWidth,
};

/**
 * Bootstrap the Phaser game once all modules are loaded.
 * Scene order and physics setup come from `config/gameConfig.js`.
 */
new Phaser.Game(gameConfig);
