import { SCENE_KEYS } from '../../constants/sceneKeys.js';
import BaseWorldScene from './BaseWorldScene.js';

/**
 * Second grassy-biome world scene with a vertical climb layout.
 */
export default class GrassyBiomeClimbScene extends BaseWorldScene {
  constructor() {
    super(SCENE_KEYS.GRASSY_BIOME_2);
  }
}
