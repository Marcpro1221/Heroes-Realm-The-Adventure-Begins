import { MAIN_SCENE_DIMENSIONS } from '../constants/gameConstants.js';

/**
 * Shared runtime state for systems that need cross-scene references.
 * `MainScene` populates most of these references during `create()`, while
 * `Player`, `EnemyManager`, and the UI modules read from this object so they
 * can collaborate without each module having to pass every live object around.
 */
export const gameState = {
  width: MAIN_SCENE_DIMENSIONS.width,
  height: MAIN_SCENE_DIMENSIONS.height,
  selectedCharacterId: null,
  playerName: '',
  player: null,
  enemyGroup: null,
  platforms: null,
  oneWayPlatforms: null,
  movingPlatform: null,
  backgroundMusic: null,
  pendingPlayerSnapshot: null,
  pendingPlayerSpawn: null,
  pendingPlayerEntry: null,
  sceneReturnPositions: {},
  portal: null,
};
