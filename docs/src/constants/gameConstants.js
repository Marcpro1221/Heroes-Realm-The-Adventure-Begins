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
  pickup: 'E',
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
  contactDamageOverlapDelayMs: 900,
  contactDamageIntervalMs: 500,
  expPerEnemy: 16,
  coinPerEnemy: 12,
  knockbackDistance: 35,
  knockbackMinPercent: 0.02,
  knockbackJumpVelocity: -180,
  obstacleTurnCooldownMs: 220,
  patrolEdgePadding: 18,
  obstacleNudgeDistance: 14,
  chaseSpeed: 88,
  detectionLoseSightGraceMs: 900,
  hitChaseDurationMs: 2000,
  disengageDelayMs: 2000,
  repositionDurationMs: 900,
  playerDamageInvincibleMs: 500,
  playerKnockbackDistance: 10,
  debugEnemyAi: false,
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
      attack2: 'enemy.mushroom.attack2',
      attack3: 'enemy.mushroom.attack3',
      death: 'enemy.mushroom.death',
    }),
    scale: 1.5,
    bodySize: Object.freeze({ width: 40, height: 65 }),
    bodyOffsets: Object.freeze({ left: 30, right: 0, y: 7 }),
    hpBarOffsetY: 18,
    maxHp: 50,
    defense: 10,
    expReward: 16,
    coinReward: 23,
    contactDamageFixedMin: 5,
    contactDamageFixedMax: 7,
    patrolSpeed: 55.55,
    combatProfile: Object.freeze({
      detectionZone: Object.freeze({
        width: 180,
        height: 92,
        offsetX: 58,
        offsetY: 46,
      }),
      attackDetectionZone: Object.freeze({
        width: 108,
        height: 68,
        offsetX: 58,
        offsetY: 46,
      }),
      attackRange: Object.freeze({
        horizontal: 64,
        vertical: 42,
      }),
      attackHitbox: Object.freeze({
        width: 56,
        height: 34,
        offsetX: 42,
        offsetY: 54,
        activeFrames: [{ start: 2, end: 3 }],
        animationConfigs: Object.freeze({
          'enemy.mushroom.attack': Object.freeze({
            width: 56,
            height: 34,
            offsetX: 42,
            offsetY: 75,
            activeFrames: [{ start: 2, end: 3 }],
          }),
          'enemy.mushroom.attack2': Object.freeze({
            width: 58,
            height: 36,
            offsetX: 46,
            offsetY: 54,
            activeFrames: [{ start: 2, end: 3 }],
          }),
          'enemy.mushroom.attack3': Object.freeze({
            width: 44,
            height: 22,
            offsetX: 24,
            offsetY: 86,
            activeFrames: [{ start: 2, end: 3 }],
            frameHitboxes: Object.freeze([
              Object.freeze({ start: 2, end: 2, width: 36, height: 18, offsetX: 16, offsetY: 66 }),
              Object.freeze({ start: 3, end: 3, width: 44, height: 22, offsetX: 26, offsetY: 66 }),
            ]),
          }),
        }),
      }),
      attackCooldownMs: 1050,
      chaseSpeed: 84,
    }),
  }),
  [ENEMY_TYPES.VAMPIRE_BAT]: Object.freeze({
    textureKey: 'enemy.vampireBat.walk',
    animationKeys: Object.freeze({
      walk: 'enemy.vampireBat.walk',
      idle: 'enemy.vampireBat.idle',
      hurt: 'enemy.vampireBat.hurt',
      attack: 'enemy.vampireBat.attack',
      attack2: 'enemy.vampireBat.attack2',
      attack3: 'enemy.vampireBat.attack3',
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
    coinReward: 35,
    contactDamageMinPercent: 0.30,
    contactDamageMaxPercent: 0.35,
    patrolSpeed: 62,
    combatProfile: Object.freeze({
      detectionZone: Object.freeze({
        width: 240,
        height: 120,
        offsetX: 54,
        offsetY: 40,
      }),
      attackDetectionZone: Object.freeze({
        width: 132,
        height: 78,
        offsetX: 54,
        offsetY: 40,
      }),
      attackRange: Object.freeze({
        horizontal: 86,
        vertical: 58,
      }),
      attackHitbox: Object.freeze({
        width: 72,
        height: 30,
        offsetX: 50,
        offsetY: 30,
        activeFrames: [{ start: 1, end: 3 }],
      }),
      attackCooldownMs: 900,
      chaseSpeed: 104,
    }),
  }),
  [ENEMY_TYPES.GOBLIN_KING]: Object.freeze({
    textureKey: 'enemy.goblinKing.walk',
    animationKeys: Object.freeze({
      walk: 'enemy.goblinKing.walk',
      idle: 'enemy.goblinKing.idle',
      hurt: 'enemy.goblinKing.hurt',
      attack: 'enemy.goblinKing.attack',
      attack2: 'enemy.goblinKing.attack2',
      attack3: 'enemy.goblinKing.attack3',
      death: 'enemy.goblinKing.death',
    }),
    scale: 1.6,
    // Cover both the rider and boar so combat matches the mounted silhouette.
    bodySize: Object.freeze({ width: 60, height: 48 }),
    bodyOffsets: Object.freeze({ left: 8, right: 4, y: 20 }),
    hpBarOffsetY: 24,
    maxHp: 150,
    defense: 30,
    expReward: 48,
    coinReward: 55,
    contactDamageFixedMin: 16,
    contactDamageFixedMax: 18,
    patrolSpeed: 58,
    combatProfile: Object.freeze({
      attackPattern: Object.freeze(['attack2', 'attack3']),
      detectionZone: Object.freeze({
        width: 250,
        height: 118,
        offsetX: 58,
        offsetY: 42,
      }),
      attackDetectionZone: Object.freeze({
        width: 108,
        height: 62,
        offsetX: 58,
        offsetY: 42,
      }),
      attackRange: Object.freeze({
        horizontal: 82,
        vertical: 46,
      }),
      attackHitbox: Object.freeze({
        width: 76,
        height: 36,
        offsetX: 42,
        offsetY: 64,
        activeFrames: [{ start: 2, end: 3 }],
        animationConfigs: Object.freeze({
          'enemy.goblinKing.attack3': Object.freeze({
            width: 12,
            height: 12,
            offsetX: 40,
            offsetY: 70,
            activeFrames: [{ start: 3, end: 4 }],
            projectile: true,
            projectileSpeed: 280,
            projectileMaxDistance: 260,
          }),
        }),
      }),
      attackCooldownMs: 1150,
      chaseSpeed: 92,
    }),
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
