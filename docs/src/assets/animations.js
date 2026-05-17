import { PLAYABLE_CHARACTERS, getCharacterConfig } from '../constants/characters.js';

/**
 * Creates an animation only when it does not already exist in Phaser's cache.
 */
const ensureAnimation = (scene, config) => {
  if (scene.anims.exists(config.key)) {
    return config.key;
  }

  scene.anims.create(config);
  return config.key;
};

/**
 * Returns the final numeric frame index for a loaded spritesheet.
 */
const getLastFrameIndex = (scene, textureKey) => {
  const texture = scene.textures.get(textureKey);
  return Math.max(0, texture.frameTotal - 2);
};

/**
 * Builds a stable animation key for one selected character action.
 */
const buildCharacterAnimationKey = (characterId, action) => `${characterId}.${action}`;

/**
 * Registers character selection preview animations.
 */
export const registerCharacterSelectionAnimations = (scene) => {
  PLAYABLE_CHARACTERS.forEach(({ id }) => {
    const config = getCharacterConfig(id);
    const previewAnimation = config.previewAnimation;

    ensureAnimation(scene, {
      key: previewAnimation.key,
      frames: scene.anims.generateFrameNumbers(config.previewTextureKey, {
        start: previewAnimation.start,
        end: previewAnimation.end,
      }),
      frameRate: previewAnimation.frameRate,
      repeat: -1,
    });
  });
};

/**
 * Registers the selected playable character animations and returns the resolved animation keys.
 * `MainScene` passes the returned map into `new Player(...)`, and `Player`
 * later resolves action names like `smash` or `idle` through that map.
 */
export const registerPlayerAnimations = (scene, characterConfig) => {
  const resolvedConfig = getCharacterConfig(characterConfig?.id);
  if (!resolvedConfig) {
    return {};
  }

  const animationKeys = {};
  const previewAnimation = resolvedConfig.previewAnimation;
  if (previewAnimation && scene.textures.exists(resolvedConfig.previewTextureKey)) {
    animationKeys.preview = ensureAnimation(scene, {
      key: previewAnimation.key,
      frames: scene.anims.generateFrameNumbers(resolvedConfig.previewTextureKey, {
        start: previewAnimation.start,
        end: previewAnimation.end,
      }),
      frameRate: previewAnimation.frameRate,
      repeat: -1,
    });
  }

  const animationDefinitions = [
    { action: 'dash', frameRate: 18, repeat: 0 },
    { action: 'idle', frameRate: 10, repeat: -1 },
    { action: 'idleBreak', frameRate: 10, repeat: -1 },
    { action: 'run', frameRate: 10, repeat: -1 },
    { action: 'jump', frameRate: 8, repeat: 0 },
    { action: 'fall', frameRate: 10, repeat: -1 },
    { action: 'smash', frameRate: 35, repeat: 0 },
    { action: 'thrust', frameRate: 20, repeat: 0 },
    { action: 'spinAttack', frameRate: 15, repeat: 0 },
    { action: 'surpriseJump', frameRate: 12, repeat: 0 },
    { action: 'specialAttack', frameRate: 10, repeat: 0 },
    { action: 'heal', frameRate: 25, repeat: 0 },
    { action: 'death', frameRate: 10, repeat: 0 },
    { action: 'hurt', frameRate: 10, repeat: 0 },
  ];

  animationDefinitions.forEach(({ action, frameRate, repeat, frameRange }) => {
    const textureKey = resolvedConfig.animationTextures?.[action];
    if (!textureKey || !scene.textures.exists(textureKey)) {
      return;
    }

    const key = buildCharacterAnimationKey(resolvedConfig.id, action);
    const resolvedFrameRate = resolvedConfig.animationFrameRates?.[action] ?? frameRate;
    const resolvedRepeat = resolvedConfig.animationRepeats?.[action] ?? repeat;
    const range = resolvedConfig.animationFrameRanges?.[action]
      ?? frameRange
      ?? { start: 0, end: getLastFrameIndex(scene, textureKey) };

    animationKeys[action] = ensureAnimation(scene, {
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, range),
      frameRate: resolvedFrameRate,
      repeat: resolvedRepeat,
    });
  });

  if (resolvedConfig.effects?.spaceSpikesTextureKey && scene.textures.exists(resolvedConfig.effects.spaceSpikesTextureKey)) {
    animationKeys.spaceSpikesBurst = ensureAnimation(scene, {
      key: resolvedConfig.effects.spaceSpikesAnimation.key,
      frames: scene.anims.generateFrameNumbers(
        resolvedConfig.effects.spaceSpikesTextureKey,
        {
          start: resolvedConfig.effects.spaceSpikesAnimation.start,
          end: resolvedConfig.effects.spaceSpikesAnimation.end,
        },
      ),
      frameRate: resolvedConfig.effects.spaceSpikesAnimation.frameRate,
      repeat: 0,
    });
  }

  if (resolvedConfig.effects?.slashTextureKey && scene.textures.exists(resolvedConfig.effects.slashTextureKey)) {
    animationKeys.slashEffect = ensureAnimation(scene, {
      key: resolvedConfig.effects.slashAnimation.key,
      frames: scene.anims.generateFrameNumbers(
        resolvedConfig.effects.slashTextureKey,
        {
          start: resolvedConfig.effects.slashAnimation.start,
          end: resolvedConfig.effects.slashAnimation.end,
        },
      ),
      frameRate: resolvedConfig.effects.slashAnimation.frameRate,
      repeat: 0,
    });
  }

  return animationKeys;
};

/**
 * Registers enemy animations.
 */
export const registerEnemyAnimations = (scene) => {
  [
    {
      textureKey: 'enemy.mushroom.walk',
      animationKey: 'enemy.mushroom.walk',
      frameRange: { start: 0, end: 5 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.mushroom.idle',
      animationKey: 'enemy.mushroom.idle',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.mushroom.hurt',
      animationKey: 'enemy.mushroom.hurt',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.mushroom.hurt') },
      frameRate: 16,
      repeat: 0,
    },
    {
      textureKey: 'enemy.mushroom.attack',
      animationKey: 'enemy.mushroom.attack',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.mushroom.attack2',
      animationKey: 'enemy.mushroom.attack2',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.mushroom.attack3',
      animationKey: 'enemy.mushroom.attack3',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.mushroom.death',
      animationKey: 'enemy.mushroom.death',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.mushroom.death') },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.vampireBat.walk',
      animationKey: 'enemy.vampireBat.walk',
      frameRange: { start: 0, end: 5 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.vampireBat.idle',
      animationKey: 'enemy.vampireBat.idle',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.vampireBat.hurt',
      animationKey: 'enemy.vampireBat.hurt',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.vampireBat.hurt') },
      frameRate: 16,
      repeat: 0,
    },
    {
      textureKey: 'enemy.vampireBat.attack',
      animationKey: 'enemy.vampireBat.attack',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.vampireBat.attack2',
      animationKey: 'enemy.vampireBat.attack2',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.vampireBat.attack3',
      animationKey: 'enemy.vampireBat.attack3',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.vampireBat.death',
      animationKey: 'enemy.vampireBat.death',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.vampireBat.death') },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.goblinKing.walk',
      animationKey: 'enemy.goblinKing.walk',
      frameRange: { start: 0, end: 5 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.goblinKing.idle',
      animationKey: 'enemy.goblinKing.idle',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: -1,
    },
    {
      textureKey: 'enemy.goblinKing.hurt',
      animationKey: 'enemy.goblinKing.hurt',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.goblinKing.hurt') },
      frameRate: 16,
      repeat: 0,
    },
    {
      textureKey: 'enemy.goblinKing.attack',
      animationKey: 'enemy.goblinKing.attack',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.goblinKing.attack2',
      animationKey: 'enemy.goblinKing.attack2',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.goblinKing.attack3',
      animationKey: 'enemy.goblinKing.attack3',
      frameRange: { start: 0, end: 3 },
      frameRate: 10,
      repeat: 0,
    },
    {
      textureKey: 'enemy.goblinKing.death',
      animationKey: 'enemy.goblinKing.death',
      frameRange: { start: 0, end: getLastFrameIndex(scene, 'enemy.goblinKing.death') },
      frameRate: 10,
      repeat: 0,
    },
  ].forEach(({ textureKey, animationKey, frameRange, frameRate, repeat }) => {
    ensureAnimation(scene, {
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(textureKey, frameRange),
      frameRate,
      repeat,
    });
  });
};

/**
 * Registers world prop animations such as the spinning portal.
 */
export const registerWorldAnimations = (scene) => {
  ensureAnimation(scene, {
    key: 'world.portal.spin',
    frames: scene.anims.generateFrameNumbers('portal', { start: 0, end: 9 }),
    frameRate: 10,
    repeat: -1,
  });

  if (scene.textures.exists('librarianWitchNpc')) {
    ensureAnimation(scene, {
      key: 'npc.librarianWitch.idle',
      frames: scene.anims.generateFrameNumbers('librarianWitchNpc', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  if (scene.textures.exists('miroAlchemistNpc')) {
    ensureAnimation(scene, {
      key: 'npc.miroAlchemist.idle',
      frames: scene.anims.generateFrameNumbers('miroAlchemistNpc', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
  }
};
