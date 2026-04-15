import { CHARACTER_SPRITESHEETS } from '../constants/assetPaths.js';
import { CHARACTER_CONFIGS } from '../constants/characters.js';

/**
 * Loads a list of character spritesheets by texture key.
 */
const loadCharacterSpritesheetKeys = (scene, textureKeys) => {
  textureKeys.forEach((textureKey) => {
    const sheet = CHARACTER_SPRITESHEETS[textureKey];
    if (!sheet) {
      return;
    }

    scene.load.spritesheet(textureKey, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
  });
};

/**
 * Loads the preview spritesheets for every playable character in the selection scene.
 */
export const loadCharacterSelectionSpritesheets = (scene) => {
  const previewKeys = Object.values(CHARACTER_CONFIGS).map((config) => config.previewTextureKey);
  loadCharacterSpritesheetKeys(scene, [...new Set(previewKeys)]);
};

/**
 * Loads every spritesheet registered for the selected playable character.
 */
export const loadSelectedCharacterSpritesheets = (scene, characterConfig) => {
  if (!characterConfig) {
    return;
  }

  const textureKeys = [
    characterConfig.previewTextureKey,
    ...Object.values(characterConfig.animationTextures ?? {}),
    ...(characterConfig.effects ? Object.values(characterConfig.effects)
      .filter((value) => typeof value === 'string') : []),
  ];

  loadCharacterSpritesheetKeys(scene, [...new Set(textureKeys)]);
};
