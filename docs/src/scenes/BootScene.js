import { SCENE_KEYS } from '../constants/sceneKeys.js';

/**
 * Minimal boot scene used to centralize the first scene transition.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  /**
   * Starts the character selection scene immediately after boot.
   */
  create() {
    this.scene.start(SCENE_KEYS.CHARACTER_SELECTION);
  }
}
