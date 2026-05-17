import { GAME_DIMENSIONS, PHYSICS_CONFIG } from '../constants/gameConstants.js';
import InitialLoadingScene from '../scenes/InitialLoadingScene.js';
import BootScene from '../scenes/BootScene.js';
import CharacterSelectionScene from '../scenes/CharacterSelectionScene.js';
import WorldLoadingScene from '../scenes/WorldLoadingScene.js';
import GrassyBiomeWorldScene from '../scenes/worlds/GrassyBiomeWorldScene.js';
import GrassyBiomeClimbScene from '../scenes/worlds/GrassyBiomeClimbScene.js';
import LibraryInteriorScene from '../scenes/worlds/LibraryInteriorScene.js';
import PotionShopInteriorScene from '../scenes/worlds/PotionShopInteriorScene.js';

/**
 * Phaser game configuration is isolated here so bootstrap code stays minimal.
 * `main.js` creates the Phaser instance from this object, and the `scene`
 * array below defines the full application flow from boot to gameplay.
 */
const gameConfig = {
  type: Phaser.AUTO,
  width: GAME_DIMENSIONS.width,
  height: GAME_DIMENSIONS.height,
  pixelArt: true,
  backgroundColor: 0x87ceeb,
  disableVisibilityChange: true,
  scene: [
    InitialLoadingScene,
    BootScene,
    CharacterSelectionScene,
    WorldLoadingScene,
    GrassyBiomeWorldScene,
    GrassyBiomeClimbScene,
    LibraryInteriorScene,
    PotionShopInteriorScene,
  ],
  physics: PHYSICS_CONFIG,
  callbacks: {
    postBoot: (game) => {
      if (game.sound) {
        game.sound.pauseOnBlur = false;
      }
    },
  },
};

export default gameConfig;
