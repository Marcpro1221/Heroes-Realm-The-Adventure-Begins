import { SCENE_KEYS } from '../../constants/sceneKeys.js';
import BaseWorldScene from './BaseWorldScene.js';

/**
 * First grassy-biome world scene.
 */
export default class GrassyBiomeWorldScene extends BaseWorldScene {
  constructor() {
    super(SCENE_KEYS.GRASSY_BIOME_1);
  }
}
