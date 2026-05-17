import { loadCharacterSelectionSpritesheets, loadSelectedCharacterSpritesheets } from './characterLoaders.js';
import {
  AUDIO_ASSETS,
  ENEMY_SPRITESHEETS,
  NPC_SPRITESHEETS,
  WORLD_PROP_SPRITESHEETS,
  UI_IMAGE_ASSETS,
  WORLD_IDS,
  WORLD_IMAGE_ASSETS,
} from '../constants/assetPaths.js';
import { getCharacterConfig } from '../constants/characters.js';

/**
 * Helper for loading a named group of images.
 */
const loadImages = (scene, assetMap) => {
  Object.entries(assetMap).forEach(([key, path]) => {
    // Loop through every image entry so new assets can be added from one place.
    scene.load.image(key, path);
  });
};

/**
 * Helper for loading a named group of audio files.
 */
const loadAudio = (scene, assetMap) => {
  Object.entries(assetMap).forEach(([key, path]) => {
    // Loop through every audio entry so sound registration stays consistent.
    scene.load.audio(key, path);
  });
};

/**
 * Helper for loading Phaser spritesheets from a shared definition table.
 */
const loadSpritesheets = (scene, assetKeys, spritesheets) => {
  assetKeys.forEach((assetKey) => {
    // Load only the requested spritesheets for the current scene.
    const sheet = spritesheets[assetKey];
    scene.load.spritesheet(assetKey, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
  });
};

/**
 * Assets required for the character selection scene.
 * Called only by `CharacterSelectionScene.preload()`.
 */
export const loadCharacterSelectionAssets = (scene) => {
  loadImages(scene, UI_IMAGE_ASSETS);
  loadAudio(scene, { journey: AUDIO_ASSETS.journey });
  loadCharacterSelectionSpritesheets(scene);
};

/**
 * Assets required for the playable world scene.
 * Called only by `MainScene.preload()`, and it reads the selected character id
 * from Phaser's registry so only the active character spritesheets are loaded.
 */
export const loadMainSceneAssets = (scene, worldAssetId = null) => {
  const selectedCharacterConfig = getCharacterConfig(scene.registry.get('selectedCharacterId'));
  const resolvedWorldAssetId = worldAssetId ?? scene.worldAssetId ?? WORLD_IDS.GRASSY_BIOME;
  const currentWorldAssets = WORLD_IMAGE_ASSETS[resolvedWorldAssetId] ?? WORLD_IMAGE_ASSETS[WORLD_IDS.GRASSY_BIOME];

  loadImages(scene, {
    coinDrop: UI_IMAGE_ASSETS.coinDrop,
    inventoryButtonIcon: UI_IMAGE_ASSETS.inventoryButtonIcon,
    ...currentWorldAssets.backgrounds,
    ...currentWorldAssets.platforms,
    ...currentWorldAssets.props,
  });
  loadAudio(scene, {
    grassyBiome: AUDIO_ASSETS.grassyBiome,
    thrustAttack: AUDIO_ASSETS.thrustAttack,
    smashAttack: AUDIO_ASSETS.smashAttack,
    heavySmash: AUDIO_ASSETS.heavySmash,
    reaperDoubleSlash: AUDIO_ASSETS.reaperDoubleSlash,
    reaperSlash: AUDIO_ASSETS.reaperSlash,
    reaperSpecialSkill: AUDIO_ASSETS.reaperSpecialSkill,
    reaperSurpriseJump: AUDIO_ASSETS.reaperSurpriseJump,
    reaperSurpriseAttack: AUDIO_ASSETS.reaperSurpriseAttack,
    bladedStaffSpecialSkill: AUDIO_ASSETS.bladedStaffSpecialSkill,
    healing: AUDIO_ASSETS.healing,
    levelUp: AUDIO_ASSETS.levelUp,
    swordspinDeath: AUDIO_ASSETS.swordspinDeath,
    deathCharacter: AUDIO_ASSETS.deathCharacter,
    playerDamageHurt: AUDIO_ASSETS.playerDamageHurt,
    spinAttack: AUDIO_ASSETS.spinAttack,
    hitAttack: AUDIO_ASSETS.hitAttack,
  });
  loadSelectedCharacterSpritesheets(scene, selectedCharacterConfig);
  loadSpritesheets(scene, [
    'portal',
    'enemy.mushroom.walk',
    'enemy.mushroom.idle',
    'enemy.mushroom.hurt',
    'enemy.mushroom.attack',
    'enemy.mushroom.attack2',
    'enemy.mushroom.attack3',
    'enemy.mushroom.death',
    'enemy.vampireBat.walk',
    'enemy.vampireBat.idle',
    'enemy.vampireBat.hurt',
    'enemy.vampireBat.attack',
    'enemy.vampireBat.attack2',
    'enemy.vampireBat.attack3',
    'enemy.vampireBat.death',
    'enemy.goblinKing.walk',
    'enemy.goblinKing.idle',
    'enemy.goblinKing.hurt',
    'enemy.goblinKing.attack',
    'enemy.goblinKing.attack2',
    'enemy.goblinKing.attack3',
    'enemy.goblinKing.death',
  ], {
    ...WORLD_PROP_SPRITESHEETS,
    ...ENEMY_SPRITESHEETS,
  });
  loadSpritesheets(scene, ['healerNpc', 'librarianWitchNpc', 'miroAlchemistNpc'], NPC_SPRITESHEETS);
};

/**
 * Checks whether the current world's critical assets are already cached.
 * This lets world scenes skip duplicate preload work after loading screens
 * or scene restarts while staying configurable for future worlds.
 */
export const areWorldSceneAssetsReady = (scene, worldSceneConfig = null) => {
  if (!worldSceneConfig) {
    return false;
  }

  const selectedCharacterConfig = getCharacterConfig(scene.registry.get('selectedCharacterId'));
  const requiredTextureKeys = [
    ...(worldSceneConfig.preloadCheck?.textureKeys ?? []),
    selectedCharacterConfig?.spawnTextureKey,
  ].filter(Boolean);
  const requiredAudioKeys = worldSceneConfig.preloadCheck?.audioKeys ?? [];

  return requiredTextureKeys.every((textureKey) => scene.textures.exists(textureKey))
    && requiredAudioKeys.every((audioKey) => scene.cache.audio.exists(audioKey));
};
