import { SCENE_KEYS } from './sceneKeys.js';

/**
 * Static dimensions for the playable world and visible viewport.
 */
export const GAME_DIMENSIONS = Object.freeze({
  width: 1136,
  height: 636,
  worldWidth: 4708,
  worldHeight: 1524,
});

/**
 * Default world bounds for the current main exploration scene.
 * Future biomes/scenes can define their own dimensions without reusing asset widths.
 */
export const MAIN_SCENE_DIMENSIONS = Object.freeze({
  width: 4708,
  height: 1524,
});

/**
 * Shared physics configuration for every scene.
 */
export const PHYSICS_CONFIG = Object.freeze({
  default: 'arcade',
  arcade: {
    gravity: { y: 800 },
    debug: false,
  },
});

/**
 * Player combat balance values live here so tuning does not require scene edits.
 */
export const PLAYER_ACTION_KEYS = Object.freeze({
  smash: 'J',
  thrust: 'K',
  spinAttack: 'L',
  heal: 'U',
  specialAttack: 'I',
});

/**
 * Shared player action key bindings used by gameplay and the HUD.
 */
export const PLAYER_ATTACK_CONFIG = Object.freeze({
  smash: {
    keyLabel: PLAYER_ACTION_KEYS.smash,
    label: 'Rift Cleave',
    damagePercentMin: 0.2,
    damagePercentMax: 0.24,
    knockbackPercent: 0.02,
    hitCooldownMs: 450,
    tintDurationMs: 180,
  },
  spinAttack: { keyLabel: PLAYER_ACTION_KEYS.spinAttack, label: 'Abyss Sweep', damagePercent: 0.08, knockbackPercent: 0.02, hitCooldownMs: 90, tintDurationMs: 70 },
  thrust: { keyLabel: PLAYER_ACTION_KEYS.thrust, label: 'Void Burst', damagePercent: 0.18, knockbackPercent: 0.04, hitCooldownMs: 180, tintDurationMs: 100 },
  specialAttack: { keyLabel: PLAYER_ACTION_KEYS.specialAttack, label: 'Underworld Spikes', damagePercent: 0.65, knockbackPercent: 0.02, hitCooldownMs: 700, tintDurationMs: 220 },
});

/**
 * Enemy combat and respawn tuning values.
 */
export const ENEMY_SETTINGS = Object.freeze({
  maxSpawns: 11,
  spawnDelayMs: 2500,
  respawnEnabled: true,
  initialSpawnBaseDelayMs: 5000,
  initialSpawnStepMs: 500,
  respawnBaseDelayMs: 9000,
  respawnLocationStepMs: 500,
  respawnDelayStepMs: 500,
  respawnDelayIncreaseEveryDeaths: 1,
  respawnMaxDelayMs: 20000,
  respawnRetryDelayMs: 3000,
  respawnJitterMs: 1500,
  maxHp: 100,
  contactDamageMinPercent: 0.07,
  contactDamageMaxPercent: 0.10,
  contactDamageIntervalMs: 500,
  expPerEnemy: 16,
  knockbackDistance: 35,
  knockbackMinPercent: 0.02,
  knockbackJumpVelocity: -180,
  obstacleTurnCooldownMs: 220,
  patrolEdgePadding: 18,
  obstacleNudgeDistance: 14,
  chaseSpeed: 88,
  disengageDelayMs: 2000,
  repositionDurationMs: 900,
});

export const ENEMY_TYPES = Object.freeze({
  MUSHROOM: 'mushroom',
  VAMPIRE_BAT: 'vampireBat',
  GOBLIN_KING: 'goblinKing',
});

export const ENEMY_ARCHETYPES = Object.freeze({
  [ENEMY_TYPES.MUSHROOM]: Object.freeze({
    textureKey: 'enemy.mushroom.walk',
    animationKeys: Object.freeze({
      walk: 'enemy.mushroom.walk',
      idle: 'enemy.mushroom.idle',
      hurt: 'enemy.mushroom.hurt',
      attack: 'enemy.mushroom.attack',
      death: 'enemy.mushroom.death',
    }),
    scale: 1.5,
    bodySize: Object.freeze({ width: 40, height: 65 }),
    bodyOffsets: Object.freeze({ left: 30, right: 0, y: 7 }),
    hpBarOffsetY: 18,
    maxHp: 50,
    defense: 10,
    expReward: 16,
    contactDamageMinPercent: 0.07,
    contactDamageMaxPercent: 0.10,
    patrolSpeed: 55.55,
  }),
  [ENEMY_TYPES.VAMPIRE_BAT]: Object.freeze({
    textureKey: 'enemy.vampireBat.walk',
    animationKeys: Object.freeze({
      walk: 'enemy.vampireBat.walk',
      idle: 'enemy.vampireBat.idle',
      hurt: 'enemy.vampireBat.hurt',
      attack: 'enemy.vampireBat.attack',
      death: 'enemy.vampireBat.death',
    }),
    scale: 1.6,
    // Transparent padding on the sprite sheet is wide; these values match
    // the visible torso/body far more closely than the mushroom defaults.
    bodySize: Object.freeze({ width: 44, height: 36 }),
    bodyOffsets: Object.freeze({ left: 14, right: 14, y: 28 }),
    hpBarOffsetY: 24,
    maxHp: 320,
    defense: 0,
    expReward: 16,
    contactDamageMinPercent: 0.30,
    contactDamageMaxPercent: 0.35,
    patrolSpeed: 62,
  }),
  [ENEMY_TYPES.GOBLIN_KING]: Object.freeze({
    textureKey: 'enemy.goblinKing.walk',
    animationKeys: Object.freeze({
      walk: 'enemy.goblinKing.walk',
      idle: 'enemy.goblinKing.idle',
      hurt: 'enemy.goblinKing.hurt',
      attack: 'enemy.goblinKing.attack',
      death: 'enemy.goblinKing.death',
    }),
    scale: 1.6,
    // Cover both the rider and boar so combat matches the mounted silhouette.
    bodySize: Object.freeze({ width: 60, height: 48 }),
    bodyOffsets: Object.freeze({ left: 8, right: 4, y: 20 }),
    hpBarOffsetY: 24,
    maxHp: 275,
    defense: 30,
    expReward: 48,
    contactDamageFixedMin: 45,
    contactDamageFixedMax: 50,
    patrolSpeed: 58,
  }),
});

/**
 * Growth values for player upgrades and level progression.
 */
export const PLAYER_PROGRESS_SETTINGS = Object.freeze({
  levelUpDamageBonus: 3,
  levelUpBaseDamageBonusPercent: 0.01,
  levelUpDefenseBonusPercent: 0.01,
  expToNextLevel: 200,
});

/**
 * Mana costs and healing values for player actions.
 */
export const PLAYER_ABILITY_SETTINGS = Object.freeze({
  smashManaCost: 0,
  spinManaCost: 0,
  specialAttackManaCost: 40,
  healPercent: 0.2,
  healManaCostPercent: 0.08,
  spaceSpikeRangeWidth: 600,
  spaceSpikeRangeHeight: 220,
  spaceSpikeBurstStartFrame: 5,
  spaceSpikeBurstEndFrame: 9,
  manaRegenIdleDelayMs: 20000,
  manaRegenIntervalMs: 10000,
  manaRegenPercent: 0.03,
  manaRegenMovingIntervalMs: 20000,
  manaRegenMovingFlatAmount: 15,
});

/**
 * Static platform layout for the current map.
 */
export const PLATFORM_LAYOUT = Object.freeze({
  ground: { x: 0, yOffset: 100 },
  upperPlatform: { xOffset: -600, y: 700 },
  mediumPlatform: { xOffset: -1250, yOffset: 1080 },
  singlePlatforms: [
    { xOffset: -950, yOffset: 950 },
    { x: GAME_DIMENSIONS.worldWidth - 550, y: GAME_DIMENSIONS.worldHeight - 250 },
    { x: GAME_DIMENSIONS.worldWidth - 550, y: GAME_DIMENSIONS.worldHeight - 930 },
    { x: GAME_DIMENSIONS.worldWidth - 230, y: GAME_DIMENSIONS.worldHeight - 330 },
  ],
  movingPlatformIndex: 6,
  movingPlatformTargetYOffset: 850,
  movingPlatformDurationMs: 3000,
});

/**
 * Current enemy spawn points. These remain data-only to keep the scene readable.
 */
export const ENEMY_SPAWN_POINTS = Object.freeze(
  [
    { x: 720, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 590, patrolMaxX: 860, respawnBaseDelayMs: 10500, respawnJitterMs: 900 },
    { x: 1290, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 1140, patrolMaxX: 1460, respawnBaseDelayMs: 12500, respawnJitterMs: 1400 },
    { x: 1910, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 1760, patrolMaxX: 2070, respawnBaseDelayMs: 9800, respawnJitterMs: 1100 },
    { x: 2540, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 2390, patrolMaxX: 2710, respawnBaseDelayMs: 13200, respawnJitterMs: 1600 },
    { x: 3170, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 3010, patrolMaxX: 3340, respawnBaseDelayMs: 11800, respawnJitterMs: 1200 },
    { x: 3450, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 3330, patrolMaxX: 3580, respawnBaseDelayMs: 11300, respawnJitterMs: 1000 },
    { x: 3720, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 3550, patrolMaxX: 3890, respawnBaseDelayMs: 15600, respawnJitterMs: 1800 },
    { x: 3980, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 3860, patrolMaxX: 4125, respawnBaseDelayMs: 14900, respawnJitterMs: 1600 },
    { x: 4250, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 4080, patrolMaxX: 4420, respawnBaseDelayMs: 17100, respawnJitterMs: 2200 },
    { x: 4520, y: 1250, enemyType: ENEMY_TYPES.MUSHROOM, patrolMinX: 4380, patrolMaxX: 4650, respawnBaseDelayMs: 18200, respawnJitterMs: 2300 },
  ],
);

/**
 * Human-readable scene order for the Phaser game instance.
 */
export const SCENE_ORDER = Object.freeze([
  SCENE_KEYS.BOOT,
  SCENE_KEYS.CHARACTER_SELECTION,
  SCENE_KEYS.GRASSY_BIOME_1,
  SCENE_KEYS.GRASSY_BIOME_2,
]);
