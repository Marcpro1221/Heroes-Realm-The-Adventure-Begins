/**
 * All asset locations are centralized here so path changes only happen in one file.
 */
const ASSET_ROOT = 'Resources/Assets';
const UI_ROOT = [ASSET_ROOT, 'UI'].join('/');
const WORLDS_ROOT = [ASSET_ROOT, 'Worlds'].join('/');

/**
 * Small helper for building asset paths with consistent separators.
 */
const buildAssetPath = (...segments) => [ASSET_ROOT, ...segments].join('/');
const buildUiAssetPath = (...segments) => [UI_ROOT, ...segments].join('/');
const buildWorldAssetPath = (worldId, ...segments) => [WORLDS_ROOT, worldId, ...segments].join('/');

export const WORLD_IDS = Object.freeze({
  GRASSY_BIOME: 'grassy-biome',
});

/**
 * Static images used by the world and menus.
 */
export const UI_IMAGE_ASSETS = Object.freeze({
  menu: buildUiAssetPath('Menu', 'GameMainSceneCharacterSelection.png'),
  coinDrop: buildUiAssetPath('Icons', 'coin-drop.svg'),
  inventoryButtonIcon: buildUiAssetPath('Icons', 'inventory-button.svg'),
});

export const WORLD_IMAGE_ASSETS = Object.freeze({
  [WORLD_IDS.GRASSY_BIOME]: Object.freeze({
    backgrounds: Object.freeze({
      ruins: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Backgrounds', 'ruins.png'),
      clouds: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Backgrounds', 'clouds.png'),
      mountain: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Backgrounds', 'mountain.png'),
      trees: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Backgrounds', 'trees.png'),
    }),
    platforms: Object.freeze({
      ground: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Platforms', 'ground.png'),
      upperPlatform: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Platforms', 'big_platforms.png'),
      singlePlatform: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Platforms', 'single_platform.png'),
      mediumPlatform: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Platforms', 'medium_platform.png'),
    }),
    props: Object.freeze({
      potionShop: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'House, Shop, Interior, Exterior', 'PotionShop.png'),
      library: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'House, Shop, Interior, Exterior', 'Library.png'),
      libraryInterior: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'House, Shop, Interior, Exterior', 'LibraryLatestInteriorDesign.png'),
      potionShopInterior: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'House, Shop, Interior, Exterior', 'PotionShopInterior-flatfloor.png'),
    }),
  }),
});

export const WORLD_PROP_SPRITESHEETS = Object.freeze({
  portal: {
    path: buildWorldAssetPath(WORLD_IDS.GRASSY_BIOME, 'Props', 'portal_spritesheet.png'),
    frameWidth: 157,
    frameHeight: 236,
  },
});

export const IMAGE_ASSETS = Object.freeze({
  ...UI_IMAGE_ASSETS,
  ...WORLD_IMAGE_ASSETS[WORLD_IDS.GRASSY_BIOME].backgrounds,
  ...WORLD_IMAGE_ASSETS[WORLD_IDS.GRASSY_BIOME].platforms,
  ...WORLD_IMAGE_ASSETS[WORLD_IDS.GRASSY_BIOME].props,
});

/**
 * Audio files used during scene transitions and combat.
 */
export const AUDIO_ASSETS = Object.freeze({
  journey: buildAssetPath('Music-Sounds', 'The_Journey.mp3'),
  grassyBiome: buildAssetPath('Music-Sounds', 'Grassy_Biome.mp3'),
  thrustAttack: buildAssetPath('Music-Sounds', 'ThrustAttack.mp3'),
  smashAttack: buildAssetPath('Music-Sounds', 'smashAttack3.mp3'),
  heavySmash: buildAssetPath('Music-Sounds', 'heavySmash.mp3'),
  reaperDoubleSlash: buildAssetPath('Music-Sounds', 'Double SlashReaper.mp3'),
  reaperSlash: buildAssetPath('Music-Sounds', 'SlashReaper.mp3'),
  reaperSpecialSkill: buildAssetPath('Music-Sounds', 'SpecialSkillRepear.mp3'),
  reaperSurpriseJump: buildAssetPath('Music-Sounds', 'Special Jump.wav'),
  reaperSurpriseAttack: buildAssetPath('Music-Sounds', 'Surprise Attack Reaper.mp3'),
  bladedStaffSpecialSkill: buildAssetPath('Music-Sounds', 'specialskillbladedstaff.mp3'),
  healing: buildAssetPath('Music-Sounds', 'healing.mp3'),
  levelUp: buildAssetPath('Music-Sounds', 'levelup.mp3'),
  swordspinDeath: buildAssetPath('Music-Sounds', 'swordspinDeath.mp3'),
  deathCharacter: buildAssetPath('Music-Sounds', 'DeathCharacter.mp3'),
  playerDamageHurt: buildAssetPath('Music-Sounds', 'character damage.mp3'),
  spinAttack: buildAssetPath('Music-Sounds', 'spinAttack.mp3'),
  hitAttack: buildAssetPath('Music-Sounds', 'hitAttack.mp3'),
});

/**
 * Spritesheet definitions for each playable character set.
 */
export const CHARACTER_SPRITESHEETS = Object.freeze({
  'luneblace.idle': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Idle.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.idleBreak': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Idle Break.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.run': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Run.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.jump': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Jump.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.fall': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Fall.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.smash': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Smash.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.thrust': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Thrust.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.spinAttack': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Spin.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.specialAttack': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Special Skill.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.spaceSpikes': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Space Spikes.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.heal': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Heal.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.death': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Death.png'), frameWidth: 144, frameHeight: 144 },
  'luneblace.hurt': { path: buildAssetPath('Sprite_Sheet_Luneblace', 'Hurt.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.dash': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Dash.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.death': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Death.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.doubleSlash': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Double Slash.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.hurt': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Hurt.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.idle': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Idle.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.idleBreak': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Idle Break.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.jump': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Jump.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.fall': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Fall.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.run': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Run.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.slash': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Slash.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.slashEffect': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Slash Effect.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.specialAttack': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Special Skill.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.surpriseAttack': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Surprise Attack.png'), frameWidth: 144, frameHeight: 144 },
  'reaper.surpriseJump': { path: buildAssetPath('Sprite_Sheet_Reaper', 'Surprise Jump.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.dash': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Dash.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.death': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Death.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.doubleSlash': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Double Slash.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.fall': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Fall.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.hurt': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Hurt.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.idle': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Idle.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.idleBreak': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Idle Break.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.jump': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Jump.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.run': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Run.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.slash': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Slash.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.slashEffect': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Slash Effect.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.smokeIn': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Smoke In.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.smokeOut': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Smoke Out.png'), frameWidth: 144, frameHeight: 144 },
  'bladedStaff.specialAttack': { path: buildAssetPath('Sprite_Sheet_Bladed_Staff', 'Special Skill.png'), frameWidth: 144, frameHeight: 144 },
  'axion.attack1': { path: buildAssetPath('Sprite_Sheet_Axion', 'Attack 1.png'), frameWidth: 144, frameHeight: 144 },
  'axion.attack2': { path: buildAssetPath('Sprite_Sheet_Axion', 'Attack 2.png'), frameWidth: 144, frameHeight: 144 },
  'axion.dash': { path: buildAssetPath('Sprite_Sheet_Axion', 'Dash.png'), frameWidth: 144, frameHeight: 144 },
  'axion.death': { path: buildAssetPath('Sprite_Sheet_Axion', 'Death.png'), frameWidth: 144, frameHeight: 144 },
  'axion.fall': { path: buildAssetPath('Sprite_Sheet_Axion', 'Fall.png'), frameWidth: 144, frameHeight: 144 },
  'axion.hurt': { path: buildAssetPath('Sprite_Sheet_Axion', 'Hurt.png'), frameWidth: 144, frameHeight: 144 },
  'axion.idle': { path: buildAssetPath('Sprite_Sheet_Axion', 'Idle.png'), frameWidth: 144, frameHeight: 144 },
  'axion.jump': { path: buildAssetPath('Sprite_Sheet_Axion', 'Jump.png'), frameWidth: 144, frameHeight: 144 },
  'axion.run': { path: buildAssetPath('Sprite_Sheet_Axion', 'Run.png'), frameWidth: 144, frameHeight: 144 },
});

/**
 * Spritesheet definitions for enemy animation sets.
 */
export const ENEMY_SPRITESHEETS = Object.freeze({
  'enemy.mushroom.walk': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_walk.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.idle': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_idle.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.hurt': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_hurt.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.attack': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_attack1.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.attack2': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_attack2.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.attack3': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_attack4.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.mushroom.death': { path: buildAssetPath('Huge_mushroom', 'HugeMushroom_death.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.walk': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_walk.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.idle': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_idle.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.hurt': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_hurt.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.attack': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_attack1.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.attack2': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_attack2.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.attack3': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_attack3.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.vampireBat.death': { path: buildAssetPath('Boss Mobs', '3 Vampire bat', 'VampireBat_death.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.walk': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_walk.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.idle': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_idle.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.hurt': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_hurt.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.attack': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_attack1.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.attack2': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_attack3.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.attack3': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_attack4.png'), frameWidth: 72, frameHeight: 72 },
  'enemy.goblinKing.death': { path: buildAssetPath('Boss Mobs', '2 Goblin king', 'GoblinKing_death.png'), frameWidth: 72, frameHeight: 72 },
});

export const NPC_SPRITESHEETS = Object.freeze({
  healerNpc: { path: buildAssetPath('NPC', 'GirlHealerNPC.png'), frameWidth: 32, frameHeight: 48 },
  librarianWitchNpc: { path: buildAssetPath('NPC', 'LibrarianWitchNPC.png'), frameWidth: 96, frameHeight: 192 },
  miroAlchemistNpc: { path: buildAssetPath('NPC', 'MiroAlchemistNPC.png'), frameWidth: 96, frameHeight: 192 },
});
