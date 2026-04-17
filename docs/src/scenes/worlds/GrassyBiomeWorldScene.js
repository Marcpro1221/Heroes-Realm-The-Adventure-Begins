import { SCENE_KEYS } from '../../constants/sceneKeys.js';
import BaseWorldScene from './BaseWorldScene.js';

/**
 * First Sylvan Region world scene.
 */
export default class GrassyBiomeWorldScene extends BaseWorldScene {
  constructor() {
    super(SCENE_KEYS.GRASSY_BIOME_1);
  }
}
