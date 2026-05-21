import {
  PLAYER_ABILITY_SETTINGS,
  PLAYER_ACTION_KEYS,
  PLAYER_PROGRESS_SETTINGS,
} from '../../constants/gameConstants.js';
import { gameState } from '../../state/gameState.js';
import Hitbox from '../combat/Hitbox.js';
import Character from './Character.js';

/**
 * Main controllable player character and combat controller.
 * This class is not only the sprite the camera follows; it is also the local
 * input/combat state machine used by `MainScene.update()`.
 */
export default class Player extends Character {
  constructor(scene, x, y, texture, characterConfig, animationKeys = {}, playerName = 'Player') {
    super(scene, x, y, texture);

    this.setCollideWorldBounds(true);
    this.setScale(2.2);
    this.setDepth(100);

    this.characterConfig = characterConfig;
    this.animationKeys = animationKeys;
    this.combatEnabled = Boolean(characterConfig?.combatEnabled);
    const bodyBounds = characterConfig?.bodyBounds ?? characterConfig?.previewHitArea ?? { x: 66, y: 63, width: 12, height: 18 };
    this.body.setSize(bodyBounds.width, bodyBounds.height, true);
    this.body.setOffset(bodyBounds.x, bodyBounds.y);

    // Core progression stats shown by `PlayerHud` and `PlayerProfilePanel`.
    this.playerName = playerName;
    this.maxHp = 100;
    this.currentHp = this.maxHp;
    this.maxMana = 100;
    this.currentMana = this.maxMana;
    this.level = 1;
    this.coins = 0;
    this.currentExp = 0;
    this.expToNextLevel = PLAYER_PROGRESS_SETTINGS.expToNextLevel;
    this.totalEnemyKills = 0;
    this.availableAttackUpgradePoints = 0;
    this.baseDamageUpgradeLevel = 0;
    this.attackUpgradeLevels = { smash: 0, spinAttack: 0, thrust: 0 };
    this.defenseUpgradeLevel = 0;
    this.hpUpgradeLevel = 0;
    this.manaUpgradeLevel = 0;
    this.defensePercentPerLevel = PLAYER_PROGRESS_SETTINGS.levelUpDefenseBonusPercent;
    this.isDead = false;
    this.isHurting = false;
    this.swordSwing = false;
    this.attackAnimationHandlerBound = false;
    this.attackSoundPlayed = false;
    this.attackSoundFramesPlayed = new Set();
    this.attackShakeFramesPlayed = new Set();
    this.smashStepApplied = false;
    this.thrustStepApplied = false;
    this.spinStepApplied = false;
    this.isSpecialAttackCasting = false;
    this.specialAttackTriggered = false;
    this.healApplied = false;
    this.deathSpinSoundPlayed = false;
    this.deathCharacterSoundPlayed = false;
    this.idleStartTime = scene.time.now;
    this.lastManaRegenAt = null;
    this.lastManaWarningAt = -Infinity;
    this.lastHpWarningAt = -Infinity;
    this.lastContactDamageAt = -Infinity;
    this.idleBreakTriggered = false;
    this.surpriseAttackPrimed = false;
    this.trackedSurpriseEnemy = null;
    this.trackedSpecialEnemy = null;
    this.lastSpecialStrikeFrame = null;
    this.specialAttackStrikeCount = 0;
    this.lastSpecialAttackCountedFrame = null;
    this.specialBuffStacks = 0;
    this.specialBuffMaxStacks = 0;
    this.specialBuffAura = null;
    this.specialBuffStackBar = null;
    this.specialBuffCurrentAttackKey = null;
    this.specialBuffShockwaveApplied = false;
    this.specialBuffShockwaveActive = false;
    this.specialBuffFlameTimer = null;
    this.specialBuffLightningTimer = null;
    this.specialBuffGroundDisc = null;
    this.specialBuffBodyGlow = null;
    this.specialBuffInnerCore = null;
    this.specialBuffHpRegenLastAt = null;
    this.specialAttackAnchorY = null;
    this.specialAttackCastOrigin = null;
    this.specialAttackReturnPosition = null;
    this.lastGroundCastWarningAt = -Infinity;
    this.specialBurstActivateEvent = null;
    this.specialBurstDeactivateEvent = null;
    this.isSurpriseDashing = false;
    this.surpriseDashTween = null;
    this.isMovementDashing = false;
    this.movementDashDirection = 0;
    this.movementDashEndsAt = 0;
    this.remainingAirJumps = this.getJumpProfile().airJumpCount;
    this.lastLeftTapAt = -Infinity;
    this.lastRightTapAt = -Infinity;
    this.isUntouchable = false;
    this.enemyDamageInvincibleUntil = -Infinity;
    this.enemyKnockbackTween = null;
    this.isSmokeHidden = false;
    this.smokeQueuedAttackAction = null;
    this.smokeHideAnimationPending = false;
    this.smokeRevealAnimationPending = false;
    this.smokeAmbushTarget = null;
    this.smokeAmbushSnapApplied = false;
    this.ambushCriticalAttackAction = null;
    this.ambushCriticalDamageMultiplier = 1.8;
    this.sceneEntryState = null;

    // Input is owned locally by the player because this class decides which
    // animation and hitbox state should respond to each key.
    this.cursors = scene.input.keyboard.createCursorKeys();
    ['W', 'A', 'D', 'SPACE'].forEach((key) => {
      this[`key${key}`] = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[key]);
    });
    this.actionKeys = {
      pickup: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.pickup]),
      smash: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.smash]),
      thrust: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.thrust]),
      spinAttack: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.spinAttack]),
      heal: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.heal]),
      specialAttack: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[PLAYER_ACTION_KEYS.specialAttack]),
    };

    // These hitboxes stay attached to the player, while `EnemyManager`
    // registers the actual overlaps that turn them into damage.
    this.swordHitBox = new Hitbox(scene, this.x, this.y, 65, 40);
    this.spinHitBox = new Hitbox(scene, this.x, this.y, 145, 40);
    this.thrustAttackHitBox = new Hitbox(scene, this.x, this.y, 95, 25);
    this.playerHurtBox = new Hitbox(scene, this.x, this.y, bodyBounds.width + 10, bodyBounds.height + 10);
    this.specialAttackHitBox = new Hitbox(
      scene,
      this.x,
      this.y,
      PLAYER_ABILITY_SETTINGS.spaceSpikeRangeWidth,
      PLAYER_ABILITY_SETTINGS.spaceSpikeRangeHeight,
    );
    this.nameLabel = this.scene.add.text(this.x, this.y - 40, this.playerName, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fff7d1',
      fontStyle: 'bold',
      stroke: '#03131d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(115);
    this.spaceSpikeEffects = this.createSpaceSpikeEffects();
    this.bindAttackAnimationHandlers();
    this.updateNameLabelPosition();
    this.updatePlayerHurtBox();
  }

  /**
   * Returns one optional animation key for the active character.
   */
  getOptionalAnimationKey(action) {
    return this.animationKeys[action] ?? null;
  }

  /**
   * Returns the resolved animation key, falling back to idle when missing.
   */
  getAnimationKey(action) {
    return this.getOptionalAnimationKey(action) ?? this.animationKeys.idle;
  }

  /**
   * Keeps the floating player-name label aligned above the body.
   */
  updateNameLabelPosition() {
    if (!this.nameLabel) {
      return;
    }

    const centerX = this.body ? this.body.center.x : this.x;
    const topY = this.body ? this.body.top : this.y;
    this.nameLabel.setPosition(centerX, topY - 18);
  }

  /**
   * Returns the combat tuning overrides for the active character.
   * Values come from `constants/characters.js`, which lets one `Player` class
   * support multiple characters with different attack behavior.
   */
  getCombatProfile(action) {
    return this.characterConfig?.combatProfile?.[action] ?? null;
  }

  /**
   * Returns one action mana cost, allowing per-character overrides.
   */
  getManaCost(action) {
    const actionProfile = this.getCombatProfile(action);

    if (typeof actionProfile?.manaCost === 'number') {
      return actionProfile.manaCost;
    }

    if (action === 'specialAttack') {
      return PLAYER_ABILITY_SETTINGS.specialAttackManaCost;
    }

    return 0;
  }

  /**
   * Returns one action HP cost, allowing per-character overrides.
   */
  getHpCost(action) {
    const actionProfile = this.getCombatProfile(action);
    return typeof actionProfile?.hpCost === 'number' ? actionProfile.hpCost : 0;
  }

  /**
   * Returns the movement tuning overrides for the active character.
   */
  getMovementProfile(action) {
    return this.characterConfig?.movementProfile?.[action] ?? null;
  }

  /**
   * Returns the character's base damage percentage range before attack bonuses.
   */
  getCharacterBaseDamagePercentRange() {
    const baseRange = this.characterConfig?.baseDamagePercent ?? { min: 0, max: 0 };
    return {
      min: baseRange.min ?? 0,
      max: baseRange.max ?? baseRange.min ?? 0,
    };
  }

  /**
   * Returns the percentage bonus granted by base-damage upgrades.
   */
  getBaseDamageUpgradeBonusPercent() {
    return (this.baseDamageUpgradeLevel ?? 0) * PLAYER_PROGRESS_SETTINGS.levelUpBaseDamageBonusPercent;
  }

  /**
   * Returns the current upgraded base damage percentage range.
   */
  getBaseDamagePercentRange() {
    const baseRange = this.getCharacterBaseDamagePercentRange();
    const upgradeBonusPercent = this.getBaseDamageUpgradeBonusPercent();
    return {
      min: baseRange.min + upgradeBonusPercent,
      max: baseRange.max + upgradeBonusPercent,
    };
  }

  /**
   * Returns one level-scaled special-attack bonus percent from the active profile.
   */
  getSpecialAttackLevelBonusPercent(specialAttackProfile = this.getCombatProfile('specialAttack')) {
    const perLevelBonus = specialAttackProfile?.specialDamageLevelBonusPercent ?? 0;
    return Math.max(0, (this.level ?? 1) - 1) * perLevelBonus;
  }

  /**
   * Returns the attack-specific percentage added on top of the character base damage.
   */
  getAttackBonusPercentRange(action) {
    const attackBonusPercents = {
      smash: { min: 0.05, max: 0.05 },
      thrust: { min: 0.03, max: 0.03 },
      spinAttack: { min: 0.04, max: 0.04 },
    };
    const actionProfile = this.getCombatProfile(action);
    const configuredMin = actionProfile?.damagePercentBonusMin;
    const configuredMax = actionProfile?.damagePercentBonusMax;
    const fallbackRange = attackBonusPercents[action] ?? { min: 0, max: 0 };

    return {
      min: typeof configuredMin === 'number' ? configuredMin : fallbackRange.min,
      max: typeof configuredMax === 'number' ? configuredMax : (
        typeof configuredMin === 'number' ? configuredMin : fallbackRange.max
      ),
    };
  }

  /**
   * Returns the skill percentage range applied on top of base damage.
   */
  getSkillDamagePercentRange(action, fallbackAttackConfig = null) {
    const actionProfile = this.getCombatProfile(action);
    if (actionProfile?.damagePercentBonusMin !== undefined || actionProfile?.damagePercentBonusMax !== undefined) {
      return this.getAttackBonusPercentRange(action);
    }

    if (actionProfile?.damagePercentMin !== undefined || actionProfile?.damagePercentMax !== undefined) {
      return {
        min: actionProfile.damagePercentMin ?? actionProfile.damagePercentMax ?? 0,
        max: actionProfile.damagePercentMax ?? actionProfile.damagePercentMin ?? 0,
      };
    }

    if (actionProfile?.damagePercent !== undefined) {
      return {
        min: actionProfile.damagePercent,
        max: actionProfile.damagePercent,
      };
    }

    if (fallbackAttackConfig?.damagePercentMin !== undefined || fallbackAttackConfig?.damagePercentMax !== undefined) {
      return {
        min: fallbackAttackConfig.damagePercentMin ?? fallbackAttackConfig.damagePercentMax ?? 0,
        max: fallbackAttackConfig.damagePercentMax ?? fallbackAttackConfig.damagePercentMin ?? 0,
      };
    }

    if (fallbackAttackConfig?.damagePercent !== undefined) {
      return {
        min: fallbackAttackConfig.damagePercent,
        max: fallbackAttackConfig.damagePercent,
      };
    }

    return this.getAttackBonusPercentRange(action);
  }

  /**
   * Returns the final effective damage percentage range after applying:
   * FinalDamage = BaseDamage x (1 + SkillPercent)
   */
  getAttackDamagePercentRange(action, fallbackAttackConfig = null) {
    const actionProfile = this.getCombatProfile(action);
    if (actionProfile?.totalDamagePercentMin !== undefined || actionProfile?.totalDamagePercentMax !== undefined) {
      return {
        min: actionProfile.totalDamagePercentMin ?? actionProfile.totalDamagePercentMax ?? 0,
        max: actionProfile.totalDamagePercentMax ?? actionProfile.totalDamagePercentMin ?? 0,
      };
    }

    if (actionProfile?.totalDamagePercent !== undefined) {
      return {
        min: actionProfile.totalDamagePercent,
        max: actionProfile.totalDamagePercent,
      };
    }

    const baseRange = this.getBaseDamagePercentRange();
    const skillPercentRange = this.getSkillDamagePercentRange(action, fallbackAttackConfig);

    return {
      min: baseRange.min * (1 + skillPercentRange.min),
      max: baseRange.max * (1 + skillPercentRange.max),
    };
  }

  /**
   * Returns one resolved special-attack damage result for the current enemy max HP.
   */
  getSpecialAttackDamage(enemyMaxHp, fallbackAttackConfig = null) {
    const specialAttackProfile = this.getCombatProfile('specialAttack');

    if (typeof specialAttackProfile?.specialFixedPercentOfEnemyMaxHp === 'number') {
      return Math.max(1, Math.round(enemyMaxHp * specialAttackProfile.specialFixedPercentOfEnemyMaxHp));
    }

    if (specialAttackProfile?.useBasePlusSpecialDamage) {
      const baseRange = this.getBaseDamagePercentRange();
      const levelBonusPercent = this.getSpecialAttackLevelBonusPercent(specialAttackProfile);
      const specialMin = (specialAttackProfile.specialDamagePercentMin
        ?? specialAttackProfile.specialDamagePercent
        ?? fallbackAttackConfig?.specialDamagePercentMin
        ?? fallbackAttackConfig?.damagePercentMin
        ?? fallbackAttackConfig?.damagePercent
        ?? 0) + levelBonusPercent;
      const specialMax = (specialAttackProfile.specialDamagePercentMax
        ?? specialAttackProfile.specialDamagePercent
        ?? fallbackAttackConfig?.specialDamagePercentMax
        ?? fallbackAttackConfig?.damagePercentMax
        ?? fallbackAttackConfig?.damagePercent
        ?? specialMin) + levelBonusPercent;

      return {
        min: Math.max(1, Math.round(enemyMaxHp * (baseRange.min + specialMin))),
        max: Math.max(1, Math.round(enemyMaxHp * (baseRange.max + specialMax))),
      };
    }

    const percentRange = this.getAttackDamagePercentRange('specialAttack', fallbackAttackConfig);
    return {
      min: Math.max(1, Math.round(enemyMaxHp * percentRange.min)),
      max: Math.max(1, Math.round(enemyMaxHp * percentRange.max)),
    };
  }

  /**
   * Applies on-hit benefits granted by the active special attack.
   */
  applySpecialAttackHitBenefits(enemy) {
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    const lifestealPercent = specialAttackProfile?.lifestealPercentOfEnemyMaxHp;
    if (!enemy || typeof lifestealPercent !== 'number' || lifestealPercent <= 0) {
      return;
    }

    const healAmount = Math.max(1, Math.round((enemy.maxHp ?? 0) * lifestealPercent));
    const nextHp = Math.min(this.maxHp, this.currentHp + healAmount);
    const appliedHeal = nextHp - this.currentHp;
    if (appliedHeal <= 0) {
      return;
    }

    this.currentHp = nextHp;
    this.showDamagePopup(this.x, this.y - 24, `+${appliedHeal}`, '#7CFF8A', 1200, 80);
    this.scene?.refreshPlayerUi?.();
  }

  /**
   * Returns true when the player is grounded on terrain or an aligned moving platform.
   */
  isGrounded() {
    if (!this.body) {
      return false;
    }

    if (this.body.blocked.down || this.body.touching.down || this.body.onFloor?.()) {
      return true;
    }

    const platformBody = gameState.movingPlatform?.body;
    if (!platformBody) {
      return false;
    }

    const horizontalOverlap = this.body.right > (platformBody.left + 2)
      && this.body.left < (platformBody.right - 2);
    const verticalProximity = Math.abs(this.body.bottom - platformBody.top) <= 10;
    const ridingPlatform = this.body.velocity.y >= (platformBody.velocity.y - 40);

    return horizontalOverlap && verticalProximity && ridingPlatform;
  }

  /**
   * Returns true when the current frame falls within one configured active window.
   */
  isFrameWithinActiveWindow(frameIndex, activeFrames = []) {
    return activeFrames.some(({ start, end }) => frameIndex >= start && frameIndex <= end);
  }

  /**
   * Applies the configured hitbox size and offset for one action.
   */
  configureAttackHitbox(hitbox, defaults, profile = null) {
    const hitboxConfig = {
      ...defaults,
      ...(profile?.hitbox ?? {}),
    };

    if (hitbox.width !== hitboxConfig.width || hitbox.height !== hitboxConfig.height) {
      hitbox.width = hitboxConfig.width;
      hitbox.height = hitboxConfig.height;
      hitbox.body.setSize(hitboxConfig.width, hitboxConfig.height, true);
    }

    hitbox.follow(this, this.flipX ? -hitboxConfig.offsetX : hitboxConfig.offsetX, hitboxConfig.offsetY);
    return hitboxConfig;
  }

  /**
   * Returns the first frame-specific hitbox config that matches the current frame.
   */
  getFrameHitboxConfig(frameIndex, hitboxFrames = []) {
    return hitboxFrames.find(({ start, end }) => frameIndex >= start && frameIndex <= end) ?? null;
  }

  /**
   * Plays one configured attack sound once per configured frame window.
   */
  playAttackSound(soundConfig = null, fallbackKey, fallbackVolume = 1.2) {
    const frameIndex = this.anims.currentFrame?.index ?? null;
    const triggerFrames = Array.isArray(soundConfig?.triggerFrames) ? soundConfig.triggerFrames : null;
    if (triggerFrames && !triggerFrames.includes(frameIndex)) {
      return;
    }

    const playKey = triggerFrames ? frameIndex : 'once';
    if (this.attackSoundFramesPlayed.has(playKey)) {
      return;
    }

    const layeredSounds = [
      { key: soundConfig?.key ?? fallbackKey, volume: soundConfig?.volume ?? fallbackVolume },
      ...(Array.isArray(soundConfig?.layeredSounds) ? soundConfig.layeredSounds : []),
    ].filter((sound) => Boolean(sound?.key));

    layeredSounds.forEach((sound) => {
      this.scene.sound.play(sound.key, { volume: sound.volume ?? fallbackVolume });
    });

    this.attackSoundFramesPlayed.add(playKey);
    this.attackSoundPlayed = true;
  }

  /**
   * Clears one-shot sound markers before a new action starts.
   */
  resetAttackAudioState() {
    this.attackSoundPlayed = false;
    this.attackSoundFramesPlayed.clear();
    this.attackShakeFramesPlayed.clear();
  }

  /**
   * Returns the fallback hitbox profile used to orient hit-confirmed slash effects.
   */
  getDefaultAttackEffectHitbox(action) {
    const effectDefaults = {
      smash: {
        width: 65,
        height: 40,
        offsetX: 45,
        offsetY: 0,
      },
      spinAttack: {
        width: 58,
        height: 70,
        offsetX: 8,
        offsetY: -14,
      },
      thrust: {
        width: 95,
        height: 25,
        offsetX: 35,
        offsetY: 2,
      },
      specialAttack: {
        width: PLAYER_ABILITY_SETTINGS.spaceSpikeRangeWidth,
        height: PLAYER_ABILITY_SETTINGS.spaceSpikeRangeHeight,
        offsetX: 0,
        offsetY: 0,
      },
    };

    return effectDefaults[action] ?? null;
  }

  /**
   * Resolves the current frame-specific slash effect settings for one attack.
   */
  getAttackHitEffectContext(action) {
    const effectConfig = this.characterConfig?.effects;
    const defaultHitbox = this.getDefaultAttackEffectHitbox(action);
    if (!effectConfig || !defaultHitbox) {
      return null;
    }

    const frameIndex = this.anims.currentFrame?.index ?? null;
    const attackProfile = this.getCombatProfile(action);
    const frameHitboxConfig = this.getFrameHitboxConfig(frameIndex ?? -1, attackProfile?.hitboxFrames ?? []);
    const resolvedHitboxConfig = {
      ...(defaultHitbox ?? {}),
      ...(attackProfile?.hitbox ?? {}),
      ...(frameHitboxConfig ?? {}),
    };
    const frameEffectConfig = this.getFrameHitboxConfig(frameIndex ?? -1, attackProfile?.effectFrames ?? []);
    const resolvedOffsetX = frameEffectConfig?.offsetX ?? resolvedHitboxConfig.offsetX ?? 0;
    const resolvedOffsetY = frameEffectConfig?.offsetY ?? resolvedHitboxConfig.offsetY ?? 0;
    const sweepDirection = frameEffectConfig?.sweepDirection ?? (resolvedOffsetX < 0 ? -1 : 1);

    return {
      angle: frameEffectConfig?.slashAngle ?? effectConfig.slashAngle ?? 0,
      alpha: Math.max(0.98, frameEffectConfig?.slashAlpha ?? effectConfig.slashAlpha ?? 0.98),
      scale: (frameEffectConfig?.slashScale ?? effectConfig.slashScale ?? 1) * 1.08,
      radius: (frameEffectConfig?.slashRadius ?? effectConfig.slashRadius ?? 42) + 4,
      thickness: Math.max(14, (frameEffectConfig?.slashThickness ?? effectConfig.slashThickness ?? 10) * 1.28),
      flatten: frameEffectConfig?.slashFlatten ?? effectConfig.slashFlatten ?? 0.72,
      impactOffsetX: Phaser.Math.Clamp(resolvedOffsetX * 0.18, -18, 18),
      impactOffsetY: Phaser.Math.Clamp(resolvedOffsetY * 0.28, -14, 14),
      sweepDirection,
      palette: effectConfig.slashPalette ?? [0xf8f6ff, 0xb8d6ff, 0x7ee6ff],
    };
  }

  /**
   * Draws one thin slash impact on the struck enemy after a confirmed hit.
   */
  playConfirmedAttackHitEffect(enemy, action) {
    if (!enemy?.active || !this.scene) {
      return;
    }

    const effectContext = this.getAttackHitEffectContext(action);
    if (!effectContext) {
      return;
    }

    const effectX = (enemy.body ? enemy.body.center.x : enemy.x + 36) + (this.flipX ? -effectContext.impactOffsetX : effectContext.impactOffsetX);
    const effectY = (enemy.body ? enemy.body.center.y : enemy.y + 36) + effectContext.impactOffsetY;
    const slashEffect = this.scene.add.graphics()
      .setDepth((enemy.depth ?? this.depth ?? 10) + 5)
      .setPosition(effectX, effectY)
      .setAlpha(effectContext.alpha);

    const outerWidth = effectContext.thickness;
    const midWidth = Math.max(8, effectContext.thickness * 0.86);
    const coreWidth = Math.max(5.6, effectContext.thickness * 0.62);
    const [outerColor, midColor, coreColor] = effectContext.palette;
    const arcStart = effectContext.sweepDirection < 0 ? -18 : -112;
    const arcEnd = effectContext.sweepDirection < 0 ? 112 : 18;
    const drawArc = (radius, color, width, alpha) => {
      slashEffect.lineStyle(width, color, alpha);
      slashEffect.beginPath();
      slashEffect.arc(0, 0, radius, Phaser.Math.DegToRad(arcStart), Phaser.Math.DegToRad(arcEnd), false);
      slashEffect.strokePath();
    };

    drawArc(effectContext.radius + 9, outerColor, outerWidth * 1.2, 0.28);
    drawArc(effectContext.radius + 4, outerColor, outerWidth, 0.76);
    drawArc(effectContext.radius, midColor ?? outerColor, midWidth, 1);
    drawArc(Math.max(10, effectContext.radius - 5), coreColor ?? midColor ?? outerColor, coreWidth, 1);

    const facingRotation = this.flipX ? 180 : 0;
    const signedScaleX = effectContext.scale * (this.flipX ? -1 : 1);
    slashEffect.setScale(signedScaleX, effectContext.scale * effectContext.flatten);
    slashEffect.setRotation(Phaser.Math.DegToRad(facingRotation + effectContext.angle));

    const effectDepth = (enemy.depth ?? this.depth ?? 10) + 6;
    const dashDirection = this.flipX ? -1 : 1;
    const accentColor = coreColor ?? midColor ?? outerColor;
    const glow = this.scene.add.ellipse(effectX, effectY, effectContext.radius * 1.25, effectContext.radius * 0.5, accentColor, 0.22)
      .setDepth(effectDepth)
      .setRotation(Phaser.Math.DegToRad(effectContext.angle))
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      scaleX: 1.65,
      scaleY: 1.35,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    });

    [0, 1, 2].forEach((index) => {
      const streak = this.scene.add.rectangle(
        effectX - (dashDirection * (32 + (index * 8))),
        effectY + ((index - 1) * 7),
        effectContext.radius * (0.95 - (index * 0.12)),
        Math.max(3, effectContext.thickness * (0.24 - (index * 0.035))),
        index === 1 ? accentColor : (midColor ?? outerColor),
        0.82 - (index * 0.14),
      )
        .setDepth(effectDepth + 1)
        .setRotation(Phaser.Math.DegToRad(effectContext.angle + (dashDirection * (index - 1) * 5)))
        .setBlendMode(Phaser.BlendModes.ADD);

      this.scene.tweens.add({
        targets: streak,
        x: streak.x + (dashDirection * (58 + (index * 12))),
        alpha: 0,
        scaleX: 1.9,
        scaleY: 0.6,
        duration: 240 + (index * 45),
        delay: index * 30,
        ease: 'Cubic.easeOut',
        onComplete: () => streak.destroy(),
      });
    });

    [0, 1].forEach((waveIndex) => {
      const wave = this.scene.add.graphics()
        .setDepth(effectDepth)
        .setPosition(effectX - (dashDirection * (waveIndex * 8)), effectY)
        .setAlpha(0.58 - (waveIndex * 0.14))
        .setBlendMode(Phaser.BlendModes.ADD);
      wave.lineStyle(Math.max(1.5, effectContext.thickness * 0.12), waveIndex === 0 ? accentColor : (midColor ?? outerColor), 0.9);
      wave.strokeEllipseShape(new Phaser.Geom.Ellipse(0, 0, effectContext.radius * 0.78, effectContext.radius * 0.34), 48);
      wave.setRotation(Phaser.Math.DegToRad(effectContext.angle));

      this.scene.tweens.add({
        targets: wave,
        x: wave.x - (dashDirection * (14 + (waveIndex * 6))),
        alpha: 0,
        scaleX: 1.8 + (waveIndex * 0.25),
        scaleY: 1.35 + (waveIndex * 0.18),
        duration: 600 + (waveIndex * 150),
        delay: 80 + (waveIndex * 80),
        ease: 'Sine.easeOut',
        onComplete: () => wave.destroy(),
      });
    });

    const lightning = this.scene.add.graphics()
      .setDepth(effectDepth + 2)
      .setPosition(effectX, effectY)
      .setBlendMode(Phaser.BlendModes.ADD);
    const lightningLength = Math.max(70, effectContext.radius * 1.55);
    const lightningStartX = -dashDirection * (lightningLength * 0.48);
    const lightningStep = (lightningLength / 5) * dashDirection;
    const lightningPoints = [
      { x: lightningStartX, y: -6 },
      { x: lightningStartX + lightningStep, y: 5 },
      { x: lightningStartX + (lightningStep * 2), y: -3 },
      { x: lightningStartX + (lightningStep * 3), y: 7 },
      { x: lightningStartX + (lightningStep * 4), y: -5 },
      { x: lightningStartX + (lightningStep * 5), y: 2 },
    ];
    lightning.lineStyle(6, outerColor, 0.34);
    lightning.beginPath();
    lightning.moveTo(lightningPoints[0].x, lightningPoints[0].y);
    lightningPoints.slice(1).forEach((point) => lightning.lineTo(point.x, point.y));
    lightning.strokePath();
    lightning.lineStyle(2, accentColor, 0.96);
    lightning.beginPath();
    lightning.moveTo(lightningPoints[0].x, lightningPoints[0].y);
    lightningPoints.slice(1).forEach((point) => lightning.lineTo(point.x, point.y));
    lightning.strokePath();
    lightning.setRotation(Phaser.Math.DegToRad(effectContext.angle));

    this.scene.tweens.add({
      targets: lightning,
      x: lightning.x + (dashDirection * 18),
      alpha: 0,
      duration: 190,
      delay: 35,
      ease: 'Quad.easeOut',
      onComplete: () => lightning.destroy(),
    });

    this.scene.tweens.add({
      targets: slashEffect,
      alpha: 0,
      scaleX: signedScaleX * 1.28,
      scaleY: effectContext.scale * effectContext.flatten * 1.14,
      y: effectY - 8,
      duration: 580,
      delay: 90,
      ease: 'Sine.easeOut',
      onComplete: () => slashEffect.destroy(),
    });
  }

  /**
   * Plays a camera shake once per configured frame window.
   */
  playAttackCameraShake(shakeConfig = null, fallbackKey = 'once') {
    if (!shakeConfig) {
      return;
    }

    const camera = this.scene?.cameras?.main;
    if (!camera) {
      return;
    }

    const frameIndex = this.anims.currentFrame?.index ?? null;
    const triggerFrames = Array.isArray(shakeConfig.triggerFrames) ? shakeConfig.triggerFrames : null;
    if (triggerFrames && !triggerFrames.includes(frameIndex)) {
      return;
    }

    const playKey = triggerFrames ? frameIndex : fallbackKey;
    if (this.attackShakeFramesPlayed.has(playKey)) {
      return;
    }

    camera.shake(
      shakeConfig.duration ?? 120,
      shakeConfig.intensity ?? 0.004,
      false,
    );

    this.attackShakeFramesPlayed.add(playKey);
  }

  /**
   * Plays the special-skill camera shake when the configured impact lands.
   */
  playSpecialAttackImpactShake() {
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    if (!specialAttackProfile?.cameraShake?.onHitOnly) {
      return;
    }

    const frameIndex = this.anims.currentFrame?.index ?? 'impact';
    this.playAttackCameraShake(specialAttackProfile.cameraShake, `specialAttackImpact-${frameIndex}`);
  }

  /**
   * Returns true when one enemy is valid for the active special attack.
   * Bladed Staff uses cast-origin range gating so jump hitboxes cannot damage
   * enemies outside the original cast radius.
   */
  canSpecialAttackHitEnemy(enemy) {
    if (!enemy?.body) {
      return false;
    }

    const specialAttackProfile = this.getCombatProfile('specialAttack');
    if (!specialAttackProfile) {
      return true;
    }

    if (specialAttackProfile.mode !== 'melee' || !specialAttackProfile.jumpToNearestEnemy) {
      return true;
    }

    const castOrigin = this.specialAttackCastOrigin;
    if (!castOrigin) {
      return true;
    }

    const castRange = specialAttackProfile.searchRange ?? 700;
    const enemyCenterX = enemy.body.center.x;
    const enemyCenterY = enemy.body.center.y;
    const distanceFromCastOrigin = Phaser.Math.Distance.Between(
      castOrigin.x,
      castOrigin.y,
      enemyCenterX,
      enemyCenterY,
    );

    return distanceFromCastOrigin <= castRange;
  }

  /**
   * Clears pending timed windows for Luneblade's spike burst hitbox.
   */
  clearSpecialBurstTimers() {
    this.specialBurstActivateEvent?.remove(false);
    this.specialBurstDeactivateEvent?.remove(false);
    this.specialBurstActivateEvent = null;
    this.specialBurstDeactivateEvent = null;
  }

  /**
   * Plays one character animation when it exists and is not already active.
   */
  playAnimation(action, ignoreIfPlaying = false) {
    const animationKey = this.getOptionalAnimationKey(action);
    if (!animationKey) {
      return false;
    }

    if (ignoreIfPlaying && this.anims.currentAnim?.key === animationKey) {
      return true;
    }

    this.anims.play(animationKey, true);
    return true;
  }

  /**
   * Returns true when X uses Reaper's hide-then-strike sequence.
   */
  usesSurpriseStrike() {
    return this.getCombatProfile('spinAttack')?.mode === 'surpriseStrike';
  }

  /**
   * Returns true when X should chain from a setup animation into a follow-up finisher.
   */
  usesSpinComboFollowUp() {
    return this.getCombatProfile('spinAttack')?.mode === 'smokeCombo'
      && Boolean(this.getOptionalAnimationKey('surpriseJump'));
  }

  /**
   * Returns true when X should enter a hidden ambush state for the Bladed Staff.
   */
  usesSmokeAmbush() {
    return this.getCombatProfile('spinAttack')?.mode === 'smokeAmbush'
      && Boolean(this.getOptionalAnimationKey('surpriseJump'));
  }

  /**
   * Returns the ambush critical multiplier for the active attack, if one is armed.
   */
  getAttackDamageMultiplier(attackType) {
    return this.ambushCriticalAttackAction === attackType ? this.ambushCriticalDamageMultiplier : 1;
  }

  /**
   * Starts the X-key action for the active character.
   */
  beginSpinAction() {
    this.resetAttackAudioState();

    if (this.usesSmokeAmbush()) {
      if (this.isSmokeHidden) {
        this.revealFromSmoke();
        return;
      }

      this.swordSwing = true;
      this.isUntouchable = true;
      this.smokeHideAnimationPending = true;
      this.playAnimation('spinAttack');
      return;
    }

    if (this.usesSurpriseStrike()) {
      const surpriseJumpProfile = this.getCombatProfile('surpriseJump');
      const targetEnemy = this.getNearestEnemyWithinRange(surpriseJumpProfile?.searchRange ?? 350);
      if (!targetEnemy?.body) {
        this.cancelSurpriseCharge();
        return;
      }

      this.trackedSurpriseEnemy = targetEnemy;
      this.exitSurpriseHiddenState();
      this.faceTowardsEnemy(targetEnemy);
      this.swordSwing = true;
      this.startSurpriseDash(surpriseJumpProfile);
      return;
    }

    this.swordSwing = true;
    this.playAnimation('spinAttack');
  }

  /**
   * Restores visibility and collision after surprise-state transitions.
   */
  exitSurpriseHiddenState() {
    this.setAlpha(1);
    if (this.body) {
      this.body.enable = true;
      this.body.updateFromGameObject();
    }
  }

  /**
   * Finds the nearest valid enemy in the current facing direction within the X range.
   */
  getNearestEnemyInFacingDirection(range) {
    const direction = this.flipX ? -1 : 1;
    const playerCenterX = this.body ? this.body.center.x : this.x;
    const playerCenterY = this.body ? this.body.center.y : this.y;
    const enemies = gameState.enemyGroup?.getChildren?.() ?? [];

    const candidates = enemies.filter((enemy) => {
      if (!enemy?.active || enemy.isDead || !enemy.body) {
        return false;
      }

      const deltaX = enemy.body.center.x - playerCenterX;
      return Math.sign(deltaX || direction) === direction && Math.abs(deltaX) <= range;
    });

    if (!candidates.length) {
      return null;
    }

    candidates.sort((enemyA, enemyB) => {
      const distanceXA = Math.abs(enemyA.body.center.x - playerCenterX);
      const distanceXB = Math.abs(enemyB.body.center.x - playerCenterX);
      if (distanceXA !== distanceXB) {
        return distanceXA - distanceXB;
      }

      return Math.abs(enemyA.body.center.y - playerCenterY) - Math.abs(enemyB.body.center.y - playerCenterY);
    });

    return candidates[0];
  }

  /**
   * Finds the nearest valid enemy in any direction within the configured X range.
   */
  getNearestEnemyWithinRange(range) {
    const playerCenterX = this.body ? this.body.center.x : this.x;
    const playerCenterY = this.body ? this.body.center.y : this.y;
    const enemies = gameState.enemyGroup?.getChildren?.() ?? [];

    const candidates = enemies.filter((enemy) => {
      if (!enemy?.active || enemy.isDead || !enemy.body) {
        return false;
      }

      return Math.abs(enemy.body.center.x - playerCenterX) <= range;
    });

    if (!candidates.length) {
      return null;
    }

    candidates.sort((enemyA, enemyB) => {
      const distanceXA = Math.abs(enemyA.body.center.x - playerCenterX);
      const distanceXB = Math.abs(enemyB.body.center.x - playerCenterX);
      if (distanceXA !== distanceXB) {
        return distanceXA - distanceXB;
      }

      return Math.abs(enemyA.body.center.y - playerCenterY) - Math.abs(enemyB.body.center.y - playerCenterY);
    });

    return candidates[0];
  }

  /**
   * Finds a random valid enemy in any direction within the configured X range.
   */
  getRandomEnemyWithinRange(range) {
    const playerCenterX = this.body ? this.body.center.x : this.x;
    const playerCenterY = this.body ? this.body.center.y : this.y;
    const enemies = gameState.enemyGroup?.getChildren?.() ?? [];

    const candidates = enemies.filter((enemy) => {
      if (!enemy?.active || enemy.isDead || !enemy.body) {
        return false;
      }

      const distance = Phaser.Math.Distance.Between(
        playerCenterX,
        playerCenterY,
        enemy.body.center.x,
        enemy.body.center.y,
      );
      return distance <= range;
    });

    if (!candidates.length) {
      return null;
    }

    return Phaser.Utils.Array.GetRandom(candidates);
  }

  /**
   * Finds a random valid enemy around one fixed world position.
   */
  getRandomEnemyAroundPoint(origin, range) {
    if (!origin) {
      return null;
    }

    const enemies = gameState.enemyGroup?.getChildren?.() ?? [];
    const candidates = enemies.filter((enemy) => {
      if (!enemy?.active || enemy.isDead || !enemy.body) {
        return false;
      }

      const distance = Phaser.Math.Distance.Between(
        origin.x,
        origin.y,
        enemy.body.center.x,
        enemy.body.center.y,
      );
      return distance <= range;
    });

    if (!candidates.length) {
      return null;
    }

    return Phaser.Utils.Array.GetRandom(candidates);
  }

  /**
   * Returns the destination used when a special attack jumps to a target enemy.
   */
  getSpecialAttackDestination(targetEnemy, specialProfile = null) {
    if (!targetEnemy?.body || !this.body) {
      return null;
    }

    const attackAnchorY = this.specialAttackAnchorY ?? this.y;
    const destination = {
      x: targetEnemy.body.center.x + (specialProfile?.jumpOffsetX ?? 0),
      y: attackAnchorY + (specialProfile?.jumpOffsetY ?? 0),
    };

    const castOrigin = this.specialAttackCastOrigin;
    const castRange = specialProfile?.searchRange ?? 700;
    if (!castOrigin) {
      return destination;
    }

    const distanceFromCastOrigin = Phaser.Math.Distance.Between(
      castOrigin.x,
      castOrigin.y,
      destination.x,
      destination.y,
    );

    if (distanceFromCastOrigin <= castRange) {
      return destination;
    }

    const angleFromCastOrigin = Phaser.Math.Angle.Between(
      castOrigin.x,
      castOrigin.y,
      destination.x,
      destination.y,
    );

    return {
      x: castOrigin.x + (Math.cos(angleFromCastOrigin) * castRange),
      y: castOrigin.y + (Math.sin(angleFromCastOrigin) * castRange),
    };
  }

  /**
   * Returns true while the player is inside the tracked melee special sequence.
   */
  isTrackingSpecialAttack() {
    const specialAttackKey = this.getOptionalAnimationKey('specialAttack');
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    return specialAttackProfile?.mode === 'melee'
      && Boolean(specialAttackProfile?.jumpToNearestEnemy)
      && this.anims.currentAnim?.key === specialAttackKey;
  }

  /**
   * Returns the frame config entry for the current special strike, if any.
   */
  getSpecialAttackStrikeFrame(frameIndex, specialAttackProfile = null) {
    return specialAttackProfile?.hitboxFrames?.find(({ start, end }) => frameIndex >= start && frameIndex <= end) ?? null;
  }

  /**
   * Counts one melee special strike window even when the hitbox does not touch
   * an enemy, so limited multi-hit specials restore after their full combo.
   */
  canUseSpecialAttackStrike(frameIndex, specialAttackProfile = null) {
    const maxStrikeCount = specialAttackProfile?.maxStrikeCount;
    if (!Number.isFinite(maxStrikeCount) || maxStrikeCount <= 0) {
      return true;
    }

    if (this.lastSpecialAttackCountedFrame !== frameIndex) {
      this.lastSpecialAttackCountedFrame = frameIndex;
      this.specialAttackStrikeCount += 1;
    }

    return this.specialAttackStrikeCount <= maxStrikeCount;
  }

  getSpecialBuffProfile() {
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    return specialAttackProfile?.mode === 'buff' ? specialAttackProfile : null;
  }

  isSpecialBuffActive() {
    return this.specialBuffStacks > 0 && Boolean(this.getSpecialBuffProfile());
  }

  activateSpecialBuff(specialAttackProfile = this.getSpecialBuffProfile()) {
    if (!specialAttackProfile) {
      return false;
    }

    this.isSpecialAttackCasting = false;
    this.swordSwing = false;
    this.specialAttackTriggered = false;
    this.specialBuffMaxStacks = Math.max(1, specialAttackProfile.stackCount ?? 5);
    this.specialBuffStacks = this.specialBuffMaxStacks;
    this.specialBuffCurrentAttackKey = null;
    this.specialBuffShockwaveApplied = false;
    this.specialBuffShockwaveActive = false;
    this.specialAttackHitBox.body.enable = false;
    this.playAttackSound(specialAttackProfile.sound, 'heavySmash');
    this.playPowerChargeCastPresentation();
    this.scene?.cameras?.main?.shake(220, 0.012, false);
    this.ensureSpecialBuffVisuals();
    this.updateSpecialBuffVisuals();
    return true;
  }

  /**
   * Super-Saiyan-style charge burst using the character's color palette.
   * Rising energy columns, ring waves, wisps, and screen tint are all derived
   * from `effects.slashPalette` so each character keeps its own color identity.
   */
  playPowerChargeCastPresentation() {
    if (!this.scene) {
      return;
    }

    const palette = this.characterConfig?.effects?.slashPalette ?? [0xe8ffff, 0x62f5ff, 0x9bffea];
    const [outerColor, midColor, coreColor] = palette;
    const centerX = this.body?.center?.x ?? this.x;
    const centerY = (this.body?.center?.y ?? this.y) - 8;
    const playerTopY = this.body?.top ?? (this.y - 44);
    const depth = this.depth + 3;
    const camera = this.scene.cameras.main;
    const midColorHex = `#${midColor.toString(16).padStart(6, '0')}`;

    // Bright core flash
    const flash = this.scene.add.ellipse(centerX, centerY, 80, 60, coreColor, 0.72)
      .setDepth(depth + 5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 3.6,
      scaleY: 3.2,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Three concentric ring bursts expanding outward
    [0, 1, 2].forEach((index) => {
      const ring = this.scene.add.ellipse(centerX, centerY, 48, 36)
        .setStrokeStyle(index === 0 ? 3 : 2, index === 0 ? outerColor : (index === 1 ? midColor : coreColor), 0.88)
        .setDepth(depth + index)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 5.5 + (index * 1.8),
        scaleY: 4.5 + (index * 1.5),
        alpha: 0,
        duration: 520 + (index * 100),
        delay: index * 70,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    });

    // Vertical energy columns shooting upward (Super Saiyan aura pillars)
    [-28, -12, 0, 12, 28].forEach((offsetX, index) => {
      const isCenter = Math.abs(offsetX) < 1;
      const colHeight = isCenter ? 150 : 90;
      const col = this.scene.add.rectangle(
        centerX + offsetX,
        centerY + 12,
        isCenter ? 6 : 4,
        colHeight,
        index % 2 === 0 ? outerColor : midColor,
        0.72 - (Math.abs(index - 2) * 0.06),
      )
        .setDepth(depth + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: col,
        y: playerTopY - 80 - (Math.abs(offsetX) * 1.2),
        scaleY: 0.15,
        alpha: 0,
        duration: 560 + (index * 40),
        delay: index * 28,
        ease: 'Quad.easeOut',
        onComplete: () => col.destroy(),
      });
    });

    // Floating particle wisps rising from the player base
    for (let i = 0; i < 14; i += 1) {
      const px = centerX + Phaser.Math.Between(-40, 40);
      const py = centerY + Phaser.Math.Between(-8, 16);
      const wisp = this.scene.add.rectangle(
        px,
        py,
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(10, 22),
        palette[i % palette.length],
        Phaser.Math.FloatBetween(0.55, 0.88),
      )
        .setDepth(depth + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: wisp,
        y: py - Phaser.Math.Between(55, 110),
        alpha: 0,
        scaleY: 0.3,
        duration: Phaser.Math.Between(400, 680),
        delay: Phaser.Math.Between(0, 180),
        ease: 'Quad.easeOut',
        onComplete: () => wisp.destroy(),
      });
    }

    // Subtle screen wash in character color
    const screenWash = this.scene.add.rectangle(
      camera.width / 2,
      camera.height / 2,
      camera.width,
      camera.height,
      midColor,
      0,
    )
      .setScrollFactor(0)
      .setDepth(depth + 6)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: screenWash,
      alpha: { from: 0, to: 0.1 },
      duration: 140,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: screenWash,
          alpha: 0,
          duration: 340,
          ease: 'Sine.easeIn',
          onComplete: () => screenWash.destroy(),
        });
      },
    });

    // Floating skill label
    const attackLabel = this.characterConfig?.attackLabels?.specialAttack ?? 'POWER CHARGE';
    const labelText = this.scene.add.text(centerX, playerTopY - 58, attackLabel.toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#e8ffff',
      fontStyle: 'bold',
      stroke: '#063040',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: midColorHex, blur: 14, fill: true },
    }).setOrigin(0.5).setDepth(depth + 7);
    this.scene.tweens.add({
      targets: labelText,
      y: playerTopY - 96,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.86, to: 1 },
      scaleY: { from: 0.86, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: labelText,
          alpha: 0,
          y: '-=14',
          duration: 460,
          delay: 260,
          ease: 'Sine.easeInOut',
          onComplete: () => labelText.destroy(),
        });
      },
    });
  }

  /**
   * Spawns one rising flame tongue from the character's feet.
   * 25% chance of a tall SSJ-style column that overshoots the head.
   */
  spawnAuraFlameWisp() {
    if (!this.scene || !this.isSpecialBuffActive()) {
      return;
    }

    const palette = this.characterConfig?.effects?.slashPalette ?? [0xe8ffff, 0x62f5ff, 0x9bffea];
    const centerX = this.body?.center?.x ?? this.x;
    const bottomY = (this.body?.bottom ?? this.y) + 6;
    const isTall = Phaser.Math.Between(0, 3) === 0;
    const px = centerX + Phaser.Math.Between(-32, 32);
    const height = isTall ? Phaser.Math.Between(100, 180) : Phaser.Math.Between(30, 70);
    const width = isTall ? Phaser.Math.Between(5, 9) : Phaser.Math.Between(3, 6);

    const wisp = this.scene.add.rectangle(
      px,
      bottomY,
      width,
      height,
      palette[Phaser.Math.Between(0, palette.length - 1)],
      Phaser.Math.FloatBetween(0.5, isTall ? 0.82 : 0.72),
    )
      .setDepth(this.depth + 1)
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: wisp,
      y: bottomY - height - Phaser.Math.Between(isTall ? 50 : 12, isTall ? 100 : 36),
      alpha: 0,
      scaleX: isTall ? 0.12 : 0.22,
      scaleY: isTall ? 0.18 : 0.3,
      duration: Phaser.Math.Between(isTall ? 520 : 300, isTall ? 860 : 560),
      delay: Phaser.Math.Between(0, 60),
      ease: 'Quad.easeOut',
      onComplete: () => wisp.destroy(),
    });
  }

  /**
   * Spawns one short-lived jagged lightning bolt on either side of the character.
   * Runs on a repeating timer while the Power Charge buff is active.
   */
  spawnSideLightning() {
    if (!this.scene || !this.isSpecialBuffActive()) {
      return;
    }

    const palette = this.characterConfig?.effects?.slashPalette ?? [0xe8ffff, 0x62f5ff, 0x9bffea];
    const [outerColor, midColor, coreColor] = palette;
    const centerX = this.body?.center?.x ?? this.x;
    const topY = (this.body?.top ?? this.y) - 64;
    const bottomY = (this.body?.bottom ?? this.y) + 8;
    const depth = this.depth + 4;
    const side = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const baseX = centerX + (side * Phaser.Math.Between(18, 30));

    const numPoints = Phaser.Math.Between(5, 9);
    const totalH = bottomY - topY;
    const segH = totalH / numPoints;
    const points = [{ x: baseX, y: bottomY }];
    for (let i = 1; i < numPoints; i += 1) {
      points.push({ x: baseX + Phaser.Math.Between(-10, 10), y: bottomY - segH * i });
    }
    points.push({ x: baseX + Phaser.Math.Between(-4, 4), y: topY });

    const bolt = this.scene.add.graphics()
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);

    const drawBolt = (color, lineWidth, alpha) => {
      bolt.lineStyle(lineWidth, color, alpha);
      bolt.beginPath();
      bolt.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((p) => bolt.lineTo(p.x, p.y));
      bolt.strokePath();
    };

    drawBolt(outerColor, 5, 0.28);
    drawBolt(midColor, 2.5, 0.64);
    drawBolt(coreColor, 1.5, 0.96);

    const sparkX = points[Math.floor(points.length / 2)].x;
    const sparkY = points[Math.floor(points.length / 2)].y;
    const spark = this.scene.add.ellipse(sparkX, sparkY, 10, 10, coreColor, 0.78)
      .setDepth(depth + 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    const duration = Phaser.Math.Between(100, 180);
    this.scene.tweens.add({
      targets: [bolt, spark],
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => { bolt.destroy(); spark.destroy(); },
    });
  }

  ensureSpecialBuffVisuals() {
    const palette = this.characterConfig?.effects?.slashPalette ?? [0xe8ffff, 0x62f5ff, 0x9bffea];
    const [outerColor, midColor, coreColor] = palette;
    const centerX = this.body?.center?.x ?? this.x;
    const centerY = this.body?.center?.y ?? this.y;
    const bottomY = (this.body?.bottom ?? this.y) + 2;

    // Ground aura disc — ellipse at feet that pulses gently
    if (!this.specialBuffGroundDisc) {
      this.specialBuffGroundDisc = this.scene.add.ellipse(centerX, bottomY, 96, 18, midColor, 0.38)
        .setDepth(this.depth - 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: this.specialBuffGroundDisc,
        scaleX: { from: 0.82, to: 1.22 },
        alpha: { from: 0.24, to: 0.52 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Outer body aura — tall ellipse wrapping the whole character silhouette
    if (!this.specialBuffBodyGlow) {
      this.specialBuffBodyGlow = this.scene.add.ellipse(centerX, centerY - 8, 64, 110, outerColor, 0.14)
        .setDepth(this.depth - 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: this.specialBuffBodyGlow,
        scaleX: { from: 0.86, to: 1.22 },
        scaleY: { from: 0.9, to: 1.14 },
        alpha: { from: 0.08, to: 0.28 },
        duration: 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Inner core glow — tight bright ellipse centered on body
    if (!this.specialBuffInnerCore) {
      this.specialBuffInnerCore = this.scene.add.ellipse(centerX, centerY - 6, 30, 52, coreColor, 0.42)
        .setDepth(this.depth + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: this.specialBuffInnerCore,
        alpha: { from: 0.26, to: 0.58 },
        scaleX: { from: 0.88, to: 1.12 },
        duration: 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (!this.specialBuffStackBar) {
      this.specialBuffStackBar = this.scene.add.graphics()
        .setDepth(this.depth + 4);
    }

    if (!this.specialBuffFlameTimer) {
      this.specialBuffFlameTimer = this.scene.time.addEvent({
        delay: 55,
        loop: true,
        callback: this.spawnAuraFlameWisp,
        callbackScope: this,
      });
    }

    if (!this.specialBuffLightningTimer) {
      this.specialBuffLightningTimer = this.scene.time.addEvent({
        delay: 160,
        loop: true,
        callback: this.spawnSideLightning,
        callbackScope: this,
      });
    }
  }

  updateSpecialBuffVisuals() {
    if (!this.isSpecialBuffActive()) {
      this.clearSpecialBuffVisuals();
      return;
    }

    this.ensureSpecialBuffVisuals();
    const centerX = this.body?.center?.x ?? this.x;
    const centerY = this.body?.center?.y ?? this.y;
    const topY = this.body?.top ?? (this.y - 44);
    const bottomY = (this.body?.bottom ?? this.y) + 2;
    this.specialBuffGroundDisc?.setPosition(centerX, bottomY);
    this.specialBuffBodyGlow?.setPosition(centerX, centerY - 8);
    this.specialBuffInnerCore?.setPosition(centerX, centerY - 6);

    if (!this.specialBuffStackBar) {
      return;
    }

    const segmentWidth = 12;
    const segmentHeight = 5;
    const gap = 3;
    const totalWidth = (segmentWidth * this.specialBuffMaxStacks) + (gap * (this.specialBuffMaxStacks - 1));
    const startX = centerX - (totalWidth / 2);
    const y = topY - 26;

    this.specialBuffStackBar.clear();
    for (let index = 0; index < this.specialBuffMaxStacks; index += 1) {
      const filled = index < this.specialBuffStacks;
      const x = startX + (index * (segmentWidth + gap));
      this.specialBuffStackBar.fillStyle(filled ? 0x80f7ff : 0x1f3a46, filled ? 0.94 : 0.62);
      this.specialBuffStackBar.fillRect(x, y, segmentWidth, segmentHeight);
      this.specialBuffStackBar.lineStyle(1, filled ? 0xf6ffff : 0x4b6670, 0.92);
      this.specialBuffStackBar.strokeRect(x, y, segmentWidth, segmentHeight);
    }
  }

  clearSpecialBuffVisuals() {
    this.specialBuffFlameTimer?.remove(false);
    this.specialBuffFlameTimer = null;
    this.specialBuffLightningTimer?.remove(false);
    this.specialBuffLightningTimer = null;
    this.specialBuffHpRegenLastAt = null;
    this.specialBuffGroundDisc?.destroy();
    this.specialBuffGroundDisc = null;
    this.specialBuffBodyGlow?.destroy();
    this.specialBuffBodyGlow = null;
    this.specialBuffInnerCore?.destroy();
    this.specialBuffInnerCore = null;
    this.specialBuffAura?.destroy();
    this.specialBuffAura = null;
    this.specialBuffStackBar?.destroy();
    this.specialBuffStackBar = null;
  }

  playSpecialSkillAuraEffect() {
    if (!this.scene) return;
    const characterId = this.characterConfig?.id;
    if (characterId === 'axion') return;
    const specialAttackKey = this.getOptionalAnimationKey('specialAttack');
    const specialAnimation = specialAttackKey ? this.scene.anims.get(specialAttackKey) : null;
    const specialDurationMs = specialAnimation
      ? Math.max(800, Math.ceil((specialAnimation.frames.length / Math.max(specialAnimation.frameRate, 1)) * 1000))
      : 1200;
    const totalDurationMs = specialDurationMs + 2000;
    if (characterId === 'bladedStaff') this.playBladedStaffSpecialAura(totalDurationMs);
    else if (characterId === 'reaper') this.playReaperSpecialAura(totalDurationMs);
    else if (characterId === 'luneblade') this.playLunebladeSpecialAura(totalDurationMs);
  }

  playBladedStaffSpecialAura(durationMs) {
    if (!this.scene) return;
    const palette = [0x6ddb6d, 0xa8e84c, 0xd4e88a, 0xe8d070, 0xffffff];
    const [windGreen, leafGreen, lightGreen] = palette;
    const fadeDuration = 700;
    const fadeDelay = Math.max(300, durationMs - fadeDuration);
    const depth = this.depth - 1;
    const getPos = () => ({
      cx: this.body?.center?.x ?? this.x,
      by: (this.body?.bottom ?? this.y) + 4,
      cy: this.body?.center?.y ?? this.y,
      ty: this.body?.top ?? (this.y - 44),
    });
    const { cx, by, cy, ty } = getPos();

    // Intro burst — screen green wash
    const camera = this.scene.cameras.main;
    const screenWash = this.scene.add.rectangle(camera.width / 2, camera.height / 2, camera.width, camera.height, windGreen, 0)
      .setScrollFactor(0).setDepth(this.depth + 6).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: screenWash, alpha: { from: 0, to: 0.07 }, duration: 120, ease: 'Sine.easeOut',
      onComplete: () => this.scene?.tweens.add({ targets: screenWash, alpha: 0, duration: 380, onComplete: () => screenWash.destroy() }),
    });

    // Burst ring expand from ground
    [0, 1, 2].forEach((i) => {
      const ring = this.scene.add.ellipse(cx, by, 50, 12)
        .setStrokeStyle(3 - i * 0.5, [windGreen, leafGreen, lightGreen][i], 0.88)
        .setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring, scaleX: 4.5 + i * 1.4, scaleY: 4.5 + i * 1.4, alpha: 0,
        duration: 500 + i * 80, delay: i * 65, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    });

    // Wind pillars shooting upward
    [-26, -10, 0, 10, 26].forEach((ox, i) => {
      const isCenter = ox === 0;
      const col = this.scene.add.rectangle(cx + ox, cy + 10, isCenter ? 6 : 3,
        isCenter ? 140 : 80, i % 2 === 0 ? windGreen : leafGreen,
        0.70 - Math.abs(i - 2) * 0.08)
        .setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: col, y: ty - 80 - Math.abs(ox) * 1.2, scaleY: 0.12, alpha: 0,
        duration: 540 + i * 40, delay: i * 28, ease: 'Quad.easeOut',
        onComplete: () => col.destroy(),
      });
    });

    // Skill label
    const labelText = this.scene.add.text(cx, ty - 52, 'GALE FORCE', {
      fontFamily: 'Arial', fontSize: '20px', color: '#d4ffb0', fontStyle: 'bold',
      stroke: '#1a3a00', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#6ddb6d', blur: 12, fill: true },
    }).setOrigin(0.5).setDepth(this.depth + 7);
    this.scene.tweens.add({
      targets: labelText, y: ty - 86, alpha: { from: 0, to: 1 }, scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 },
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => this.scene?.tweens.add({
        targets: labelText, alpha: 0, y: '-=14', duration: 500, delay: 300, ease: 'Sine.easeIn',
        onComplete: () => labelText.destroy(),
      }),
    });

    // Persistent: double ground wind disc
    const groundDisc = this.scene.add.ellipse(cx, by, 124, 28, windGreen, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const groundDiscInner = this.scene.add.ellipse(cx, by, 74, 16, leafGreen, 0.38)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    this.scene.tweens.add({ targets: groundDisc, scaleX: { from: 0.72, to: 1.34 }, alpha: { from: 0.14, to: 0.34 }, duration: 430, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: groundDiscInner, scaleX: { from: 0.80, to: 1.22 }, alpha: { from: 0.22, to: 0.54 }, duration: 330, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Persistent: body wind glow (tall)
    const bodyGlow = this.scene.add.ellipse(cx, cy - 10, 76, 134, windGreen, 0.13)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    this.scene.tweens.add({ targets: bodyGlow, scaleX: { from: 0.84, to: 1.24 }, alpha: { from: 0.07, to: 0.22 }, duration: 390, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Persistent: 4 tornado funnel bases orbiting the character
    const tornadoOffsets = [[-42, -6], [42, -6], [-26, -20], [26, -20]];
    const tornadoDiscs = tornadoOffsets.map(([ox, oy], i) => {
      const td = this.scene.add.ellipse(cx + ox, by + oy, 20, 10, leafGreen, 0.48)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
      this.scene.tweens.add({ targets: td, scaleX: { from: 0.7, to: 1.5 }, scaleY: { from: 0.7, to: 1.4 }, alpha: { from: 0.26, to: 0.64 }, duration: 250 + i * 30, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return td;
    });

    // Tornado particle columns spiraling upward from each funnel base
    const tornadoTimer = this.scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const [ox, oy] = tornadoOffsets[Phaser.Math.Between(0, 3)];
        const col = this.scene.add.rectangle(
          pcx + ox + Phaser.Math.Between(-7, 7), pby + oy,
          Phaser.Math.Between(3, 8), Phaser.Math.Between(18, 42),
          palette[Phaser.Math.Between(0, 3)], 0.84,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
        this.scene.tweens.add({
          targets: col, x: col.x + Phaser.Math.Between(-14, 14), y: col.y - Phaser.Math.Between(65, 140),
          alpha: 0, scaleX: 0.35, duration: Phaser.Math.Between(380, 680), ease: 'Quad.easeOut',
          onComplete: () => col.destroy(),
        });
      },
    });

    // Wind streaks sweeping sideways at multiple heights
    const windStreakTimer = this.scene.time.addEvent({
      delay: 88, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, cy: pcy } = getPos();
        const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const streak = this.scene.add.rectangle(
          pcx, pcy + Phaser.Math.Between(-55, 10),
          Phaser.Math.Between(36, 96), Phaser.Math.FloatBetween(1.5, 3.5),
          palette[Phaser.Math.Between(0, 3)], 0.62,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
        this.scene.tweens.add({
          targets: streak, x: streak.x + dir * Phaser.Math.Between(70, 150), alpha: 0,
          duration: Phaser.Math.Between(180, 320), ease: 'Cubic.easeOut',
          onComplete: () => streak.destroy(),
        });
      },
    });

    // Leaves spinning and drifting upward
    const leafTimer = this.scene.time.addEvent({
      delay: 68, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const color = palette[Phaser.Math.Between(0, 3)];
        const leaf = this.scene.add.rectangle(
          pcx + Phaser.Math.Between(-38, 38), pby,
          Phaser.Math.Between(5, 12), Phaser.Math.Between(3, 7), color, 0.92,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2)
          .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        this.scene.tweens.add({
          targets: leaf, x: leaf.x + Phaser.Math.Between(-44, 44), y: leaf.y - Phaser.Math.Between(90, 190),
          alpha: 0, rotation: leaf.rotation + Phaser.Math.FloatBetween(-3, 3),
          duration: Phaser.Math.Between(700, 1200), ease: 'Quad.easeOut',
          onComplete: () => leaf.destroy(),
        });
      },
    });

    // Wind spore puffs expanding softly
    const sporeTimer = this.scene.time.addEvent({
      delay: 115, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const spore = this.scene.add.circle(
          pcx + Phaser.Math.Between(-30, 30), pby + Phaser.Math.Between(-12, 0),
          Phaser.Math.Between(4, 11), lightGreen, 0.38,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
        this.scene.tweens.add({
          targets: spore, scaleX: 2.6, scaleY: 2.6, alpha: 0, y: spore.y - Phaser.Math.Between(30, 65),
          duration: Phaser.Math.Between(380, 640), ease: 'Quad.easeOut',
          onComplete: () => spore.destroy(),
        });
      },
    });

    // Follow player position for persistent elements
    const posUpdateTimer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby, cy: pcy } = getPos();
        groundDisc.setPosition(pcx, pby);
        groundDiscInner.setPosition(pcx, pby);
        bodyGlow.setPosition(pcx, pcy - 10);
        tornadoDiscs.forEach((td, i) => td.active && td.setPosition(pcx + tornadoOffsets[i][0], pby + tornadoOffsets[i][1]));
      },
    });

    this.scene.time.delayedCall(fadeDelay, () => {
      tornadoTimer.remove(false);
      windStreakTimer.remove(false);
      leafTimer.remove(false);
      sporeTimer.remove(false);
      posUpdateTimer.remove(false);
      const fadeTargets = [groundDisc, groundDiscInner, bodyGlow, ...tornadoDiscs];
      this.scene?.tweens.add({
        targets: fadeTargets, alpha: 0, duration: fadeDuration,
        onComplete: () => fadeTargets.forEach((t) => t?.destroy()),
      });
    });
  }

  playReaperSpecialAura(durationMs) {
    if (!this.scene) return;
    const darkPalette = [0x0a000f, 0x1a0028, 0x2d0050, 0x3d0068];
    const glowPalette = [0x8b00cc, 0x6b00a8, 0xb030ff, 0xd060ff];
    const fadeDuration = 700;
    const fadeDelay = Math.max(300, durationMs - fadeDuration);
    const depth = this.depth - 1;
    const getPos = () => ({
      cx: this.body?.center?.x ?? this.x,
      by: (this.body?.bottom ?? this.y) + 4,
      cy: this.body?.center?.y ?? this.y,
      ty: this.body?.top ?? (this.y - 44),
    });
    const { cx, by, cy, ty } = getPos();

    // Intro burst — dark screen wash + purple core flash
    const camera = this.scene.cameras.main;
    const screenWash = this.scene.add.rectangle(camera.width / 2, camera.height / 2, camera.width, camera.height, 0x1a0028, 0)
      .setScrollFactor(0).setDepth(this.depth + 6);
    this.scene.tweens.add({
      targets: screenWash, alpha: { from: 0, to: 0.22 }, duration: 160, ease: 'Sine.easeOut',
      onComplete: () => this.scene?.tweens.add({ targets: screenWash, alpha: 0, duration: 440, onComplete: () => screenWash.destroy() }),
    });

    const purpleFlash = this.scene.add.ellipse(cx, cy, 92, 72, 0xb030ff, 0.62)
      .setDepth(this.depth + 5).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: purpleFlash, scaleX: 4.2, scaleY: 3.6, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => purpleFlash.destroy() });

    // Void ring burst expand from ground
    [0, 1, 2].forEach((i) => {
      const ring = this.scene.add.ellipse(cx, by, 62, 14)
        .setStrokeStyle(3 - i * 0.5, glowPalette[i], 0.88)
        .setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring, scaleX: 4.8 + i * 1.6, scaleY: 4.8 + i * 1.6, alpha: 0,
        duration: 520 + i * 100, delay: i * 70, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    });

    // Burst smoke columns erupting from ground
    for (let i = 0; i < 8; i += 1) {
      const bc = this.scene.add.rectangle(
        cx + Phaser.Math.Between(-42, 42), by,
        Phaser.Math.Between(10, 24), Phaser.Math.Between(32, 76),
        darkPalette[Phaser.Math.Between(1, 3)], 0.82,
      ).setDepth(this.depth + 1).setOrigin(0.5, 1);
      this.scene.tweens.add({
        targets: bc, y: bc.y - Phaser.Math.Between(90, 180), alpha: 0, scaleX: 1.9,
        duration: Phaser.Math.Between(520, 900), delay: Phaser.Math.Between(0, 130), ease: 'Cubic.easeOut',
        onComplete: () => bc.destroy(),
      });
    }

    // Skill label
    const labelText = this.scene.add.text(cx, ty - 52, 'ABYSS SURGE', {
      fontFamily: 'Arial', fontSize: '20px', color: '#c060ff', fontStyle: 'bold',
      stroke: '#0a000f', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 0, color: '#8b00cc', blur: 14, fill: true },
    }).setOrigin(0.5).setDepth(this.depth + 7);
    this.scene.tweens.add({
      targets: labelText, y: ty - 86, alpha: { from: 0, to: 1 }, scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 },
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => this.scene?.tweens.add({
        targets: labelText, alpha: 0, y: '-=14', duration: 480, delay: 300, ease: 'Sine.easeIn',
        onComplete: () => labelText.destroy(),
      }),
    });

    // Persistent: large dark shadow pool + outer glow ring
    const shadowPool = this.scene.add.ellipse(cx, by, 134, 30, 0x05000a, 0.84)
      .setDepth(depth);
    const groundGlow = this.scene.add.ellipse(cx, by, 148, 36, 0x6b00a8, 0.26)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    this.scene.tweens.add({ targets: shadowPool, scaleX: { from: 0.82, to: 1.30 }, alpha: { from: 0.58, to: 0.90 }, duration: 540, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: groundGlow, scaleX: { from: 0.78, to: 1.34 }, alpha: { from: 0.14, to: 0.40 }, duration: 460, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Persistent: layered body aura (dark outer + purple inner glow)
    const bodyAuraOuter = this.scene.add.ellipse(cx, cy - 10, 84, 148, 0x2d0050, 0.34)
      .setDepth(depth);
    const bodyAuraInner = this.scene.add.ellipse(cx, cy - 8, 54, 106, 0x8b00cc, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    const bodyAuraCore = this.scene.add.ellipse(cx, cy - 6, 30, 64, 0xd060ff, 0.10)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
    this.scene.tweens.add({ targets: bodyAuraOuter, scaleX: { from: 0.86, to: 1.22 }, alpha: { from: 0.20, to: 0.44 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: bodyAuraInner, scaleX: { from: 0.80, to: 1.26 }, alpha: { from: 0.10, to: 0.30 }, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: bodyAuraCore, scaleX: { from: 0.76, to: 1.30 }, alpha: { from: 0.06, to: 0.20 }, duration: 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Dense dark smoke columns rising from feet
    const smokeTimer = this.scene.time.addEvent({
      delay: 62, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const isTall = Phaser.Math.Between(0, 3) === 0;
        const smoke = this.scene.add.rectangle(
          pcx + Phaser.Math.Between(-30, 30), pby,
          Phaser.Math.Between(14, 34), isTall ? Phaser.Math.Between(80, 170) : Phaser.Math.Between(30, 72),
          darkPalette[Phaser.Math.Between(1, 3)], 0.80,
        ).setDepth(depth + 2).setOrigin(0.5, 1);
        this.scene.tweens.add({
          targets: smoke, y: smoke.y - Phaser.Math.Between(70, 160), alpha: 0, scaleX: 1.8, scaleY: 0.3,
          duration: Phaser.Math.Between(520, 950), ease: 'Cubic.easeOut',
          onComplete: () => smoke.destroy(),
        });
      },
    });

    // Purple ghost flames rising with ADD blend
    const ghostFlameTimer = this.scene.time.addEvent({
      delay: 75, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const isTall = Phaser.Math.Between(0, 4) === 0;
        const flame = this.scene.add.rectangle(
          pcx + Phaser.Math.Between(-24, 24), pby,
          Phaser.Math.Between(4, 10), isTall ? Phaser.Math.Between(100, 190) : Phaser.Math.Between(36, 74),
          glowPalette[Phaser.Math.Between(0, 3)], 0.74,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 3).setOrigin(0.5, 1);
        this.scene.tweens.add({
          targets: flame, y: flame.y - Phaser.Math.Between(62, 150), alpha: 0, scaleX: 0.28, scaleY: 0.18,
          duration: Phaser.Math.Between(450, 780), ease: 'Quad.easeOut',
          onComplete: () => flame.destroy(),
        });
      },
    });

    // Void pulse rings expanding from feet
    const voidRingTimer = this.scene.time.addEvent({
      delay: 230, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const ring = this.scene.add.graphics().setDepth(depth + 2);
        ring.lineStyle(3, glowPalette[Phaser.Math.Between(0, 2)], 0.66);
        ring.strokeEllipse(0, 0, 72, 16);
        ring.setPosition(pcx, pby);
        this.scene.tweens.add({
          targets: ring, scaleX: 3.0, scaleY: 3.0, alpha: 0,
          duration: 500, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      },
    });

    // Multi-layer side tendrils lashing outward
    const tendrilTimer = this.scene.time.addEvent({
      delay: 155, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, cy: pcy } = getPos();
        const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const yOff = Phaser.Math.Between(-46, 18);
        const color = glowPalette[Phaser.Math.Between(0, 3)];
        [{ w: 5.5, a: 0.26 }, { w: 2.5, a: 0.62 }, { w: 1.2, a: 0.94 }].forEach(({ w, a }) => {
          const t = this.scene.add.rectangle(
            pcx + dir * 18, pcy + yOff, Phaser.Math.Between(24, 62), w, color, a,
          ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 3);
          this.scene.tweens.add({
            targets: t, x: t.x + dir * Phaser.Math.Between(52, 108), alpha: 0,
            duration: Phaser.Math.Between(220, 400), ease: 'Cubic.easeOut',
            onComplete: () => t.destroy(),
          });
        });
      },
    });

    // Ash / soul spark particles drifting upward
    const ashTimer = this.scene.time.addEvent({
      delay: 95, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const ash = this.scene.add.circle(
          pcx + Phaser.Math.Between(-32, 32), pby,
          Phaser.Math.Between(2, 5), glowPalette[Phaser.Math.Between(0, 3)], 0.72,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
        this.scene.tweens.add({
          targets: ash, y: ash.y - Phaser.Math.Between(62, 140), x: ash.x + Phaser.Math.Between(-18, 18),
          alpha: 0, duration: Phaser.Math.Between(600, 1050), ease: 'Quad.easeOut',
          onComplete: () => ash.destroy(),
        });
      },
    });

    // Dark soul wisps (wide smear shapes drifting sideways)
    const wispTimer = this.scene.time.addEvent({
      delay: 180, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, cy: pcy } = getPos();
        const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const wisp = this.scene.add.rectangle(
          pcx, pcy + Phaser.Math.Between(-40, 20),
          Phaser.Math.Between(20, 48), Phaser.Math.Between(8, 18),
          darkPalette[Phaser.Math.Between(2, 3)], 0.55,
        ).setDepth(depth + 1);
        this.scene.tweens.add({
          targets: wisp, x: wisp.x + dir * Phaser.Math.Between(30, 70), y: wisp.y - Phaser.Math.Between(20, 50),
          alpha: 0, scaleX: 1.5, duration: Phaser.Math.Between(400, 700), ease: 'Quad.easeOut',
          onComplete: () => wisp.destroy(),
        });
      },
    });

    // Follow player position for persistent elements
    const posUpdateTimer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby, cy: pcy } = getPos();
        shadowPool.setPosition(pcx, pby);
        groundGlow.setPosition(pcx, pby);
        bodyAuraOuter.setPosition(pcx, pcy - 10);
        bodyAuraInner.setPosition(pcx, pcy - 8);
        bodyAuraCore.setPosition(pcx, pcy - 6);
      },
    });

    this.scene.time.delayedCall(fadeDelay, () => {
      smokeTimer.remove(false);
      ghostFlameTimer.remove(false);
      voidRingTimer.remove(false);
      tendrilTimer.remove(false);
      ashTimer.remove(false);
      wispTimer.remove(false);
      posUpdateTimer.remove(false);
      const fadeTargets = [shadowPool, groundGlow, bodyAuraOuter, bodyAuraInner, bodyAuraCore];
      this.scene?.tweens.add({
        targets: fadeTargets, alpha: 0, duration: fadeDuration,
        onComplete: () => fadeTargets.forEach((t) => t?.destroy()),
      });
    });
  }

  playLunebladeSpecialAura(durationMs) {
    if (!this.scene) return;
    const icePalette = [0xd0f4ff, 0x8ae8ff, 0xb8eeff, 0xffffff, 0x50c8ff];
    const [iceWhite, iceCyan, iceMid, white, deepCyan] = icePalette;
    const fadeDuration = 700;
    const fadeDelay = Math.max(300, durationMs - fadeDuration);
    const depth = this.depth - 1;
    const getPos = () => ({
      cx: this.body?.center?.x ?? this.x,
      by: (this.body?.bottom ?? this.y) + 4,
      cy: this.body?.center?.y ?? this.y,
      ty: this.body?.top ?? (this.y - 44),
    });
    const { cx, by, cy, ty } = getPos();

    // Intro burst — ice white screen flash
    const camera = this.scene.cameras.main;
    const screenWash = this.scene.add.rectangle(camera.width / 2, camera.height / 2, camera.width, camera.height, iceCyan, 0)
      .setScrollFactor(0).setDepth(this.depth + 6).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: screenWash, alpha: { from: 0, to: 0.09 }, duration: 130, ease: 'Sine.easeOut',
      onComplete: () => this.scene?.tweens.add({ targets: screenWash, alpha: 0, duration: 360, onComplete: () => screenWash.destroy() }),
    });

    // Ice core flash expanding
    const iceFlash = this.scene.add.ellipse(cx, cy, 82, 62, white, 0.82)
      .setDepth(this.depth + 5).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: iceFlash, scaleX: 4.0, scaleY: 3.4, alpha: 0, duration: 370, ease: 'Cubic.easeOut', onComplete: () => iceFlash.destroy() });

    // Ice ring burst from ground
    [0, 1, 2].forEach((i) => {
      const ring = this.scene.add.ellipse(cx, by, 54, 12)
        .setStrokeStyle(3 - i * 0.5, [white, iceCyan, iceWhite][i], 0.90)
        .setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring, scaleX: 5.2 + i * 1.6, scaleY: 5.2 + i * 1.6, alpha: 0,
        duration: 510 + i * 80, delay: i * 62, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    });

    // Ice pillars shooting upward
    [-26, -10, 0, 10, 26].forEach((ox, i) => {
      const isCenter = ox === 0;
      const col = this.scene.add.rectangle(cx + ox, cy + 10, isCenter ? 6 : 3,
        isCenter ? 158 : 86, i % 2 === 0 ? iceCyan : iceWhite,
        0.72 - Math.abs(i - 2) * 0.08)
        .setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: col, y: ty - 92 - Math.abs(ox) * 1.2, scaleY: 0.12, alpha: 0,
        duration: 555 + i * 38, delay: i * 30, ease: 'Quad.easeOut',
        onComplete: () => col.destroy(),
      });
    });

    // Skill label
    const labelText = this.scene.add.text(cx, ty - 52, 'FROST SURGE', {
      fontFamily: 'Arial', fontSize: '20px', color: '#d0f4ff', fontStyle: 'bold',
      stroke: '#002040', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#8ae8ff', blur: 12, fill: true },
    }).setOrigin(0.5).setDepth(this.depth + 7);
    this.scene.tweens.add({
      targets: labelText, y: ty - 86, alpha: { from: 0, to: 1 }, scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 },
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => this.scene?.tweens.add({
        targets: labelText, alpha: 0, y: '-=14', duration: 480, delay: 300, ease: 'Sine.easeIn',
        onComplete: () => labelText.destroy(),
      }),
    });

    // Persistent: double ice ground disc
    const iceDisc = this.scene.add.ellipse(cx, by, 126, 28, iceCyan, 0.32)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const iceDiscInner = this.scene.add.ellipse(cx, by, 76, 16, white, 0.44)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    this.scene.tweens.add({ targets: iceDisc, scaleX: { from: 0.74, to: 1.32 }, alpha: { from: 0.18, to: 0.42 }, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: iceDiscInner, scaleX: { from: 0.80, to: 1.24 }, alpha: { from: 0.26, to: 0.56 }, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Persistent: layered body ice glow
    const bodyGlowOuter = this.scene.add.ellipse(cx, cy - 10, 80, 142, iceCyan, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const bodyGlowInner = this.scene.add.ellipse(cx, cy - 8, 50, 100, white, 0.10)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    this.scene.tweens.add({ targets: bodyGlowOuter, scaleX: { from: 0.84, to: 1.26 }, alpha: { from: 0.08, to: 0.24 }, duration: 390, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: bodyGlowInner, scaleX: { from: 0.82, to: 1.20 }, alpha: { from: 0.06, to: 0.18 }, duration: 310, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Snowflakes drifting upward
    const snowTimer = this.scene.time.addEvent({
      delay: 52, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const color = icePalette[Phaser.Math.Between(0, icePalette.length - 1)];
        const flake = this.scene.add.circle(
          pcx + Phaser.Math.Between(-36, 36), pby,
          Phaser.Math.Between(2, 5), color, 0.90,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
        this.scene.tweens.add({
          targets: flake, x: flake.x + Phaser.Math.Between(-24, 24), y: flake.y - Phaser.Math.Between(90, 170),
          alpha: 0, duration: Phaser.Math.Between(750, 1150), ease: 'Quad.easeOut',
          onComplete: () => flake.destroy(),
        });
      },
    });

    // Cold mist puffs expanding upward
    const mistTimer = this.scene.time.addEvent({
      delay: 82, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const mist = this.scene.add.ellipse(
          pcx + Phaser.Math.Between(-26, 26), pby,
          Phaser.Math.Between(38, 66), Phaser.Math.Between(12, 24), iceWhite, 0.28,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
        this.scene.tweens.add({
          targets: mist, y: mist.y - Phaser.Math.Between(52, 115), scaleX: 2.2, scaleY: 1.7, alpha: 0,
          duration: Phaser.Math.Between(560, 940), ease: 'Quad.easeOut',
          onComplete: () => mist.destroy(),
        });
      },
    });

    // Ice wind gusts sweeping sideways at multiple heights
    const gustTimer = this.scene.time.addEvent({
      delay: 92, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, cy: pcy } = getPos();
        const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const streak = this.scene.add.rectangle(
          pcx, pcy + Phaser.Math.Between(-55, 10),
          Phaser.Math.Between(42, 108), Phaser.Math.FloatBetween(1.5, 3.5),
          icePalette[Phaser.Math.Between(0, 3)], 0.60,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
        this.scene.tweens.add({
          targets: streak, x: streak.x + dir * Phaser.Math.Between(86, 170), alpha: 0,
          duration: Phaser.Math.Between(175, 320), ease: 'Cubic.easeOut',
          onComplete: () => streak.destroy(),
        });
      },
    });

    // Ice lightning bolts — jagged vertical, blue-white (same 3-layer approach as Axion side bolts)
    const lightningTimer = this.scene.time.addEvent({
      delay: 135, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby, ty: pty } = getPos();
        const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const boltX = pcx + dir * Phaser.Math.Between(18, 34);
        const totalH = Math.abs(pty - pby) + Phaser.Math.Between(20, 54);
        const segs = Phaser.Math.Between(6, 10);
        const pts = Array.from({ length: segs + 1 }, (_, s) => ({
          x: boltX + Phaser.Math.Between(-9, 9),
          y: pby - (s / segs) * totalH,
        }));

        const bolt = this.scene.add.graphics().setDepth(depth + 3);
        [[4.5, deepCyan, 0.20], [2.2, iceCyan, 0.62], [1.0, white, 0.96]].forEach(([lw, col, a]) => {
          bolt.lineStyle(lw, col, a);
          bolt.beginPath();
          pts.forEach((p, i) => (i === 0 ? bolt.moveTo(p.x, p.y) : bolt.lineTo(p.x, p.y)));
          bolt.strokePath();
        });

        const mid = pts[Math.floor(segs / 2)];
        const spark = this.scene.add.circle(mid.x, mid.y, Phaser.Math.Between(3, 6), white, 0.92)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 4);

        const boltDur = Phaser.Math.Between(85, 165);
        this.scene.tweens.add({ targets: bolt, alpha: 0, duration: boltDur, ease: 'Linear', onComplete: () => bolt.destroy() });
        this.scene.tweens.add({ targets: spark, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: boltDur, ease: 'Cubic.easeOut', onComplete: () => spark.destroy() });
      },
    });

    // Frost ring pulses expanding from feet
    const frostRingTimer = this.scene.time.addEvent({
      delay: 290, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const ring = this.scene.add.graphics().setDepth(depth + 2);
        ring.lineStyle(2.5, iceCyan, 0.64);
        ring.strokeEllipse(0, 0, 70, 16);
        ring.setPosition(pcx, pby);
        this.scene.tweens.add({
          targets: ring, scaleX: 2.8, scaleY: 2.8, alpha: 0,
          duration: 470, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      },
    });

    // Ice crystal shards (thin angled fragments shooting upward)
    const shardTimer = this.scene.time.addEvent({
      delay: 170, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby } = getPos();
        const shard = this.scene.add.rectangle(
          pcx + Phaser.Math.Between(-34, 34), pby,
          Phaser.Math.Between(3, 8), Phaser.Math.Between(14, 30),
          icePalette[Phaser.Math.Between(0, 3)], 0.82,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 3)
          .setRotation(Phaser.Math.FloatBetween(-0.6, 0.6));
        this.scene.tweens.add({
          targets: shard, y: shard.y - Phaser.Math.Between(62, 130), x: shard.x + Phaser.Math.Between(-22, 22),
          alpha: 0, rotation: shard.rotation + Phaser.Math.FloatBetween(-1.2, 1.2),
          duration: Phaser.Math.Between(520, 880), ease: 'Quad.easeOut',
          onComplete: () => shard.destroy(),
        });
      },
    });

    // Follow player position for persistent elements
    const posUpdateTimer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!this.scene || !this.active) return;
        const { cx: pcx, by: pby, cy: pcy } = getPos();
        iceDisc.setPosition(pcx, pby);
        iceDiscInner.setPosition(pcx, pby);
        bodyGlowOuter.setPosition(pcx, pcy - 10);
        bodyGlowInner.setPosition(pcx, pcy - 8);
      },
    });

    this.scene.time.delayedCall(fadeDelay, () => {
      snowTimer.remove(false);
      mistTimer.remove(false);
      gustTimer.remove(false);
      lightningTimer.remove(false);
      frostRingTimer.remove(false);
      shardTimer.remove(false);
      posUpdateTimer.remove(false);
      const fadeTargets = [iceDisc, iceDiscInner, bodyGlowOuter, bodyGlowInner];
      this.scene?.tweens.add({
        targets: fadeTargets, alpha: 0, duration: fadeDuration,
        onComplete: () => fadeTargets.forEach((t) => t?.destroy()),
      });
    });
  }

  deactivateSpecialBuff() {
    this.specialBuffStacks = 0;
    this.specialBuffMaxStacks = 0;
    this.specialBuffCurrentAttackKey = null;
    this.specialBuffShockwaveApplied = false;
    this.specialBuffShockwaveActive = false;
    this.specialAttackHitBox.body.enable = false;
    this.clearSpecialBuffVisuals();
  }

  getCurrentSpecialBuffAttackAction() {
    const currentAnimationKey = this.anims.currentAnim?.key;
    if (!currentAnimationKey) {
      return null;
    }

    return ['smash', 'thrust', 'spinAttack'].find((action) => currentAnimationKey === this.getOptionalAnimationKey(action)) ?? null;
  }

  getSpecialBuffAttackActiveFrames(action) {
    const attackProfile = this.getCombatProfile(action);
    const fallbackActiveFrames = {
      smash: [{ start: 11, end: 13 }],
      thrust: [{ start: 1, end: 1 }],
      spinAttack: [{ start: 1, end: 1 }],
    };

    return attackProfile?.hitbox?.activeFrames ?? fallbackActiveFrames[action] ?? [];
  }

  updateSpecialBuffShockwave(specialAttackProfile) {
    this.updateSpecialBuffVisuals();
    this.specialAttackHitBox.setVisible(false);

    if (!specialAttackProfile || (this.specialBuffStacks <= 0 && !this.specialBuffShockwaveActive)) {
      this.specialAttackHitBox.body.enable = false;
      return;
    }

    const attackAction = this.getCurrentSpecialBuffAttackAction();
    const currentAnimationKey = this.anims.currentAnim?.key ?? null;
    if (!attackAction) {
      this.specialBuffCurrentAttackKey = null;
      this.specialBuffShockwaveApplied = false;
      this.specialBuffShockwaveActive = false;
      this.specialAttackHitBox.body.enable = false;
      if (this.specialBuffStacks <= 0) {
        this.deactivateSpecialBuff();
      }
      return;
    }

    if (this.specialBuffCurrentAttackKey !== currentAnimationKey) {
      this.specialBuffCurrentAttackKey = currentAnimationKey;
      this.specialBuffShockwaveApplied = false;
      this.specialBuffShockwaveActive = false;
    }

    const currentFrame = this.anims.currentFrame?.index ?? -1;
    const activeFrames = this.getSpecialBuffAttackActiveFrames(attackAction);
    const isActiveFrame = this.isFrameWithinActiveWindow(currentFrame, activeFrames);
    if (!isActiveFrame) {
      this.specialBuffShockwaveApplied = false;
      this.specialBuffShockwaveActive = false;
      this.specialAttackHitBox.body.enable = false;
      if (this.specialBuffStacks <= 0) {
        this.deactivateSpecialBuff();
      }
      return;
    }

    if (!this.specialBuffShockwaveApplied && this.specialBuffStacks > 0) {
      this.specialBuffShockwaveApplied = true;
      this.specialBuffShockwaveActive = true;
      this.specialBuffStacks = Math.max(0, this.specialBuffStacks - 1);
      this.playSpecialBuffShockwaveVisual(specialAttackProfile);
    }

    if (!this.specialBuffShockwaveActive) {
      this.specialAttackHitBox.body.enable = false;
      return;
    }

    const shockwave = specialAttackProfile?.shockwave ?? {};
    const width = shockwave.width ?? 600;
    const height = shockwave.height ?? 92;
    const offsetX = shockwave.offsetX ?? ((width / 2) + 26);
    const offsetY = shockwave.offsetY ?? -12;
    if (this.specialAttackHitBox.width !== width || this.specialAttackHitBox.height !== height) {
      this.specialAttackHitBox.width = width;
      this.specialAttackHitBox.height = height;
      this.specialAttackHitBox.body.setSize(width, height, true);
    }

    this.specialAttackHitBox.follow(this, this.flipX ? -offsetX : offsetX, offsetY);
    this.specialAttackHitBox.body.enable = true;
    this.updateSpecialBuffVisuals();

    if (this.specialBuffStacks <= 0) {
      this.clearSpecialBuffVisuals();
    }
  }

  playSpecialBuffShockwaveVisual(specialAttackProfile = null) {
    const shockwave = specialAttackProfile?.shockwave ?? {};
    const length = shockwave.visualLength ?? shockwave.width ?? 600;
    const direction = this.flipX ? -1 : 1;
    const startX = this.body?.center?.x ?? this.x;
    const startY = (this.body?.center?.y ?? this.y) - 12;
    const bottomY = (this.body?.bottom ?? this.y) + 4;
    const effectDepth = this.depth + 3;
    const colors = this.characterConfig?.effects?.slashPalette ?? [0xe8ffff, 0x62f5ff, 0x9bffea];
    const [outerColor, midColor, coreColor] = colors;

    // Slashing wave arcs that travel away in the character's facing direction
    [0, 1, 2].forEach((index) => {
      const arcRadius = 26 + (index * 10);
      const travelDist = 260 + (index * 55);
      const wave = this.scene.add.graphics()
        .setPosition(startX + (direction * 18), startY)
        .setDepth(effectDepth + index)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.9 - (index * 0.16))
        .setScale(direction, 1);

      wave.lineStyle(6 - (index * 1.5), colors[index % colors.length], 0.88 - (index * 0.1));
      wave.beginPath();
      wave.arc(0, 0, arcRadius, -Math.PI * 0.44, Math.PI * 0.44, false);
      wave.strokePath();

      this.scene.tweens.add({
        targets: wave,
        x: startX + (direction * travelDist),
        scaleX: direction * (1.5 + (index * 0.2)),
        scaleY: 1.5 + (index * 0.16),
        alpha: 0,
        duration: 350 + (index * 60),
        delay: index * 45,
        ease: 'Cubic.easeOut',
        onComplete: () => wave.destroy(),
      });
    });

    // Upward flame columns bursting from the player's feet (Super Saiyan style)
    [-18, -8, 0, 8, 18].forEach((offsetX, idx) => {
      const isCenter = idx === 2;
      const flameH = Phaser.Math.Between(40, 72) + (isCenter ? 36 : 0);
      const flame = this.scene.add.rectangle(
        startX + offsetX,
        bottomY,
        isCenter ? 7 : 4,
        flameH,
        idx % 2 === 0 ? outerColor : midColor,
        0.74 - (Math.abs(idx - 2) * 0.08),
      )
        .setDepth(effectDepth + 2)
        .setOrigin(0.5, 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: flame,
        y: bottomY - flameH - Phaser.Math.Between(18, 44),
        scaleY: 0.1,
        scaleX: 0.28 + (isCenter ? 0.18 : 0),
        alpha: 0,
        duration: Phaser.Math.Between(360, 520),
        delay: idx * 22,
        ease: 'Quad.easeOut',
        onComplete: () => flame.destroy(),
      });
    });

    // Core energy flash at origin
    const coreFlash = this.scene.add.ellipse(startX, startY, 32, 24, coreColor, 0.76)
      .setDepth(effectDepth + 4)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: coreFlash,
      scaleX: 2.8,
      scaleY: 2.2,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => coreFlash.destroy(),
    });
  }

  /**
   * Starts the R-key action and optionally snaps to a random enemy first.
   */
  beginSpecialAttackAction() {
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    if (specialAttackProfile?.mode === 'buff') {
      this.resetAttackAudioState();
      this.activateSpecialBuff(specialAttackProfile);
      return;
    }

    this.isSpecialAttackCasting = true;
    this.trackedSpecialEnemy = null;
    this.lastSpecialStrikeFrame = null;
    this.specialAttackStrikeCount = 0;
    this.lastSpecialAttackCountedFrame = null;
    this.specialAttackAnchorY = this.y;
    this.specialAttackReturnPosition = {
      x: this.x,
      y: this.y,
    };
    this.specialAttackCastOrigin = {
      x: this.body ? this.body.center.x : this.x,
      y: this.body ? this.body.center.y : this.y,
    };

    if (specialAttackProfile?.jumpToNearestEnemy) {
      this.trackedSpecialEnemy = this.getRandomEnemyAroundPoint(
        this.specialAttackCastOrigin,
        specialAttackProfile?.searchRange ?? 700,
      );

      if (this.trackedSpecialEnemy?.body) {
        const currentCenterX = this.body ? this.body.center.x : this.x;
        this.flipX = this.trackedSpecialEnemy.body.center.x < currentCenterX;
        this.setVelocity(0, 0);
      }
    }

    this.resetAttackAudioState();
    this.swordSwing = true;
    this.isUntouchable = Boolean(this.trackedSpecialEnemy);
    this.playSpecialAttackCastPresentation();
    this.playAnimation('specialAttack');
    this.playSpecialSkillAuraEffect();
  }

  /**
   * Plays one shared cast-time presentation for any special skill.
   */
  playSpecialAttackCastPresentation() {
    const camera = this.scene.cameras.main;
    const viewportWidth = camera.width;
    const viewportHeight = camera.height;
    const specialAttackKey = this.getOptionalAnimationKey('specialAttack');
    const specialAnimation = specialAttackKey ? this.scene.anims.get(specialAttackKey) : null;
    const specialDurationMs = specialAnimation
      ? Math.max(800, Math.ceil((specialAnimation.frames.length / Math.max(specialAnimation.frameRate, 1)) * 1000))
      : 1200;
    const introDurationMs = Math.max(220, Math.round(specialDurationMs * 0.22));
    const holdDurationMs = Math.max(320, Math.round(specialDurationMs * 0.36));
    const labelFadeDelayMs = Math.max(120, Math.round(specialDurationMs * 0.18));
    const labelFadeDurationMs = Math.max(420, specialDurationMs - labelFadeDelayMs);
    const burstFadeDurationMs = Math.max(360, Math.round(specialDurationMs * 0.52));
    const attackLabel = this.characterConfig?.attackLabels?.specialAttack ?? 'SPECIAL SKILL';
    const bannerY = Math.max(54, viewportHeight * 0.15);
    const playerCenterX = this.body ? this.body.center.x : this.x;
    const playerTopY = this.body ? this.body.top : this.y;
    const titleText = attackLabel.toUpperCase();
    const streakColor = 0x8ae7ff;
    const accentColor = 0xffef9b;
    const topGlow = this.scene.add.rectangle(viewportWidth / 2, 34, viewportWidth * 0.94, 22, streakColor, 0.0)
      .setScrollFactor(0)
      .setDepth(260);
    const bottomGlow = this.scene.add.rectangle(viewportWidth / 2, viewportHeight - 34, viewportWidth * 0.94, 22, streakColor, 0.0)
      .setScrollFactor(0)
      .setDepth(260);
    const dashLights = [];
    const dashGroups = [
      {
        direction: 'right',
        lanes: [
          { y: 18, width: 0.22, height: 3, offsetDelay: 0, color: 0xf4fbff, alpha: 0.95 },
          { y: 32, width: 0.28, height: 3, offsetDelay: 120, color: 0x9ae7ff, alpha: 0.82 },
          { y: 46, width: 0.18, height: 2, offsetDelay: 220, color: 0xffef9b, alpha: 0.78 },
        ],
        waveIntervalMs: 280,
        durationScale: 0.48,
      },
      {
        direction: 'right',
        lanes: [
          { y: 24, width: 0.34, height: 4, offsetDelay: 80, color: 0x8ae7ff, alpha: 0.74 },
          { y: 52, width: 0.30, height: 3, offsetDelay: 190, color: 0xf4fbff, alpha: 0.7 },
        ],
        waveIntervalMs: 360,
        durationScale: 0.62,
      },
      {
        direction: 'left',
        lanes: [
          { y: viewportHeight - 18, width: 0.22, height: 3, offsetDelay: 30, color: 0xffef9b, alpha: 0.92 },
          { y: viewportHeight - 34, width: 0.28, height: 3, offsetDelay: 160, color: 0x9ae7ff, alpha: 0.82 },
          { y: viewportHeight - 50, width: 0.18, height: 2, offsetDelay: 240, color: 0xf4fbff, alpha: 0.72 },
        ],
        waveIntervalMs: 300,
        durationScale: 0.5,
      },
      {
        direction: 'left',
        lanes: [
          { y: viewportHeight - 26, width: 0.34, height: 4, offsetDelay: 90, color: 0xf4fbff, alpha: 0.84 },
          { y: viewportHeight - 42, width: 0.30, height: 3, offsetDelay: 210, color: 0x8ae7ff, alpha: 0.68 },
        ],
        waveIntervalMs: 380,
        durationScale: 0.66,
      },
    ];

    const spawnDashLight = (lane, direction, groupDurationMs, startDelayMs) => {
      const fromLeft = direction === 'right';
      const startX = fromLeft ? -(viewportWidth * 0.42) : viewportWidth + (viewportWidth * 0.42);
      const targetX = fromLeft ? viewportWidth + (viewportWidth * 0.42) : -(viewportWidth * 0.42);
      const dash = this.scene.add.rectangle(
        startX,
        lane.y,
        viewportWidth * lane.width,
        lane.height,
        lane.color,
        lane.alpha,
      ).setScrollFactor(0).setDepth(261);
      dashLights.push(dash);
      this.scene.tweens.add({
        targets: dash,
        x: targetX,
        alpha: { from: lane.alpha, to: 0.04 },
        duration: groupDurationMs,
        delay: startDelayMs,
        ease: 'Sine.easeInOut',
        onComplete: () => dash.destroy(),
      });
    };

    dashGroups.forEach((group) => {
      const groupDurationMs = Math.max(220, Math.round(specialDurationMs * group.durationScale));
      const activeWindowMs = Math.max(0, specialDurationMs - groupDurationMs);
      const waveCount = Math.max(1, Math.floor(activeWindowMs / group.waveIntervalMs) + 1);
      for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
        const waveDelayMs = waveIndex * group.waveIntervalMs;
        group.lanes.forEach((lane) => {
          spawnDashLight(lane, group.direction, groupDurationMs, waveDelayMs + lane.offsetDelay);
        });
      }
    });
    const labelShadow = this.scene.add.text(playerCenterX + 2, playerTopY - 82, titleText, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#04131f',
      fontStyle: 'bold',
      stroke: '#04131f',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(262);
    const labelText = this.scene.add.text(playerCenterX, playerTopY - 86, titleText, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#fff8cf',
      fontStyle: 'bold',
      stroke: '#67e8ff',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#67e8ff', blur: 14, fill: true },
    }).setOrigin(0.5).setDepth(263);
    const bannerText = this.scene.add.text(viewportWidth / 2, bannerY, 'ULTIMATE RELEASE', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#e9fbff',
      fontStyle: 'bold',
      stroke: '#0b2235',
      strokeThickness: 3,
      backgroundColor: '#153854',
      padding: { x: 14, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(262);
    const burstRing = this.scene.add.ellipse(playerCenterX, playerTopY - 6, 54, 54)
      .setStrokeStyle(3, accentColor, 0.9)
      .setDepth(261);
    const burstGlow = this.scene.add.ellipse(playerCenterX, playerTopY - 6, 96, 96, streakColor, 0.12)
      .setDepth(260);

    this.scene.tweens.add({
      targets: [topGlow, bottomGlow],
      alpha: { from: 0, to: 0.6 },
      duration: introDurationMs,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [topGlow, bottomGlow],
          alpha: { from: 0.6, to: 0 },
          duration: Math.max(320, specialDurationMs - introDurationMs),
          ease: 'Sine.easeInOut',
          onComplete: () => {
            topGlow.destroy();
            bottomGlow.destroy();
          },
        });
      },
    });
    this.scene.tweens.add({
      targets: [labelShadow, labelText, bannerText],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.94, to: 1 },
      scaleY: { from: 0.94, to: 1 },
      duration: introDurationMs,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [labelShadow, labelText],
          y: '-=32',
          alpha: 0,
          scaleX: 1.08,
          scaleY: 1.08,
          delay: labelFadeDelayMs,
          duration: labelFadeDurationMs,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            labelShadow.destroy();
            labelText.destroy();
          },
        });
      },
    });
    this.scene.tweens.add({
      targets: bannerText,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      y: '-=8',
      duration: introDurationMs,
      yoyo: true,
      hold: holdDurationMs,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: bannerText,
      alpha: { from: 1, to: 0 },
      delay: introDurationMs + holdDurationMs,
      duration: Math.max(260, specialDurationMs - introDurationMs - holdDurationMs),
      ease: 'Sine.easeInOut',
      onComplete: () => bannerText.destroy(),
    });
    this.scene.tweens.add({
      targets: [burstRing, burstGlow],
      scaleX: { from: 0.7, to: 1.5 },
      scaleY: { from: 0.7, to: 1.5 },
      alpha: { from: 0.9, to: 0 },
      duration: burstFadeDurationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        burstRing.destroy();
        burstGlow.destroy();
      },
    });
  }

  /**
   * Repositions the melee special only on strike frames using the target's last
   * known location so camera follow does not shake between hits.
   */
  updateSpecialAttackTracking() {
    if (!this.isTrackingSpecialAttack()) {
      return false;
    }

    const specialAttackProfile = this.getCombatProfile('specialAttack');
    const currentFrame = this.anims.currentFrame?.index ?? 0;
    const strikeFrame = this.getSpecialAttackStrikeFrame(currentFrame, specialAttackProfile);
    if (!strikeFrame) {
      this.setVelocity(0, 0);
      return true;
    }

    if (this.lastSpecialStrikeFrame === strikeFrame.start) {
      this.setVelocity(0, 0);
      return true;
    }

    this.lastSpecialStrikeFrame = strikeFrame.start;
    this.trackedSpecialEnemy = this.getRandomEnemyAroundPoint(
      this.specialAttackCastOrigin,
      specialAttackProfile?.searchRange ?? 700,
    );

    const targetEnemy = this.trackedSpecialEnemy;
    const destination = this.getSpecialAttackDestination(targetEnemy, specialAttackProfile);
    if (!targetEnemy?.body || !destination || !this.body) {
      this.setVelocity(0, 0);
      return true;
    }

    this.faceTowardsEnemy(targetEnemy);
    this.setVelocity(0, 0);
    this.setPosition(destination.x, destination.y);
    this.body.updateFromGameObject();
    return true;
  }

  /**
   * Returns the world position used for a smoke-ambush re-entry behind the enemy.
   */
  getSmokeAmbushDestination(targetEnemy) {
    if (!targetEnemy?.body || !this.body) {
      return null;
    }

    const ambushProfile = this.getCombatProfile('surpriseJump');
    const teleportOffsetX = ambushProfile?.teleportOffsetX ?? 54;
    // Enemy `flipX` is used here as its facing flag:
    // - `true`  => enemy is facing right, so "behind" is to its left
    // - `false` => enemy is facing left, so "behind" is to its right
    const behindOffsetX = targetEnemy.flipX ? -teleportOffsetX : teleportOffsetX;

    return {
      x: targetEnemy.body.center.x + behindOffsetX,
      // Snap directly to the enemy's current body position so smoke-in does
      // not introduce any extra jump arc or vertical offset.
      y: targetEnemy.body.center.y,
    };
  }

  /**
   * Makes the player fully hidden and waits for the next attack key.
   */
  enterSmokeHiddenState() {
    this.isSmokeHidden = true;
    this.isUntouchable = true;
    this.smokeHideAnimationPending = false;
    this.ambushCriticalAttackAction = null;
    this.setAlpha(0);
    this.setVelocity(0, 0);
    this.spinHitBox.body.enable = false;
  }

  /**
   * Clears smoke ambush state so the player can safely recover in any scene.
   */
  resetSmokeAmbushState(playIdle = false) {
    this.isSmokeHidden = false;
    this.smokeQueuedAttackAction = null;
    this.smokeHideAnimationPending = false;
    this.smokeRevealAnimationPending = false;
    this.smokeAmbushTarget = null;
    this.smokeAmbushSnapApplied = false;
    this.ambushCriticalAttackAction = null;
    this.isUntouchable = false;
    this.swordSwing = false;
    this.setAlpha(1);
    this.exitSurpriseHiddenState();

    if (this.spinHitBox?.body) {
      this.spinHitBox.body.enable = false;
    }

    if (playIdle && !this.isDead) {
      this.playAnimation('idle', true);
    }
  }

  /**
   * Restores the player from the hidden smoke state without teleporting to an enemy.
   */
  revealFromSmoke() {
    this.isSmokeHidden = false;
    this.isUntouchable = true;
    this.smokeHideAnimationPending = false;
    this.smokeRevealAnimationPending = true;
    this.smokeQueuedAttackAction = null;
    this.smokeAmbushTarget = null;
    this.smokeAmbushSnapApplied = false;
    this.ambushCriticalAttackAction = null;
    this.setAlpha(1);
    if (!this.playAnimation('surpriseJump')) {
      this.resetSmokeAmbushState(true);
    }
  }

  /**
   * Queues a follow-up attack that will fire after smoke-in completes behind the target enemy.
   */
  triggerSmokeAmbushAttack(action) {
    const ambushProfile = this.getCombatProfile('surpriseJump');
    const targetEnemy = this.getNearestEnemyWithinRange(ambushProfile?.searchRange ?? 700);
    if (!targetEnemy?.body) {
      this.revealFromSmoke();
      return true;
    }

    const destination = this.getSmokeAmbushDestination(targetEnemy);
    if (!destination) {
      this.revealFromSmoke();
      return true;
    }

    this.isSmokeHidden = false;
    this.isUntouchable = true;
    this.smokeHideAnimationPending = false;
    this.smokeRevealAnimationPending = true;
    this.smokeQueuedAttackAction = action;
    this.smokeAmbushTarget = targetEnemy;
    this.smokeAmbushSnapApplied = false;
    this.ambushCriticalAttackAction = action;
    this.setAlpha(1);
    this.setVelocity(0, 0);
    if (!this.playAnimation('surpriseJump')) {
      this.resetSmokeAmbushState(true);
      return true;
    }
    return true;
  }

  /**
   * Snaps the smoke-in reveal to the target enemy after a few reveal frames so
   * the ambush uses fresher enemy positioning without shaking the camera.
   */
  updateSmokeAmbushTracking() {
    if (!this.smokeRevealAnimationPending || !this.smokeQueuedAttackAction) {
      return;
    }

    const targetEnemy = this.smokeAmbushTarget;
    if (!targetEnemy?.active || targetEnemy.isDead || !targetEnemy.body || !this.body) {
      return;
    }

    const destination = this.getSmokeAmbushDestination(targetEnemy);
    if (!destination) {
      return;
    }

    const ambushProfile = this.getCombatProfile('surpriseJump');
    const revealSnapFrame = ambushProfile?.revealSnapFrame ?? 3;
    const currentFrame = this.anims.currentFrame?.index ?? 0;
    if (currentFrame < revealSnapFrame || this.smokeAmbushSnapApplied) {
      return;
    }

    this.setPosition(destination.x, destination.y);
    this.body.updateFromGameObject();
    this.flipX = !targetEnemy.flipX;
    this.smokeAmbushSnapApplied = true;
  }

  /**
   * Processes hidden-state input while the Bladed Staff is waiting for a combo finisher.
   */
  updateSmokeAmbushState() {
    if (!this.isSmokeHidden) {
      return false;
    }

    this.setVelocityX(0);

    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.smash) && this.getOptionalAnimationKey('smash')) {
      return this.triggerSmokeAmbushAttack('smash');
    }

    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.thrust) && this.getOptionalAnimationKey('thrust')) {
      return this.triggerSmokeAmbushAttack('thrust');
    }

    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.spinAttack)) {
      this.revealFromSmoke();
      return true;
    }

    return true;
  }

  /**
   * Ends the hidden state and returns the player to idle when no strike will fire.
   */
  cancelSurpriseCharge() {
    this.stopSurpriseDash();
    this.exitSurpriseHiddenState();
    this.surpriseAttackPrimed = false;
    this.trackedSurpriseEnemy = null;
    this.resetAttackAudioState();
    this.swordSwing = false;
    if (!this.isDead) {
      this.playAnimation('idle', true);
    }
  }

  /**
   * Faces the player toward the current target enemy so the strike hitbox points the right way.
   */
  faceTowardsEnemy(targetEnemy) {
    if (!targetEnemy?.body) {
      return;
    }

    const playerReferenceX = this.body ? this.body.center.x : this.x;
    this.flipX = targetEnemy.body.center.x < playerReferenceX;
  }

  /**
   * Returns the locked dash destination on the tracked enemy's current body position.
   */
  getSurpriseDashDestination(surpriseJumpProfile = null) {
    if (!this.trackedSurpriseEnemy?.body) {
      return null;
    }

    return {
      x: this.trackedSurpriseEnemy.body.center.x,
      y: this.trackedSurpriseEnemy.body.center.y,
    };
  }

  /**
   * Anchors the Reaper on the locked enemy body position used for the attack.
   */
  positionAboveTrackedEnemy(surpriseJumpProfile = null) {
    const destination = this.getSurpriseDashDestination(surpriseJumpProfile);
    if (!destination) {
      return false;
    }

    this.setVelocity(0, 0);
    this.setPosition(destination.x, destination.y);
    this.body.updateFromGameObject();
    return true;
  }

  /**
   * Stops the active surprise dash tween if one is running.
   */
  stopSurpriseDash() {
    if (this.surpriseDashTween) {
      this.surpriseDashTween.remove();
      this.surpriseDashTween = null;
    }

    this.isSurpriseDashing = false;
  }

  /**
   * Dashes from the player's current location to the tracked enemy, then starts Surprise Attack.
   */
  startSurpriseDash(surpriseJumpProfile = null) {
    const destination = this.getSurpriseDashDestination(surpriseJumpProfile);
    if (!destination) {
      this.cancelSurpriseCharge();
      return;
    }

    this.stopSurpriseDash();
    this.isSurpriseDashing = true;
    if (this.body) {
      this.body.enable = false;
    }

    this.surpriseDashTween = this.scene.tweens.add({
      targets: this,
      x: destination.x,
      y: destination.y,
      duration: surpriseJumpProfile?.dashDurationMs ?? 180,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.surpriseDashTween = null;
        this.isSurpriseDashing = false;
        this.exitSurpriseHiddenState();
        this.positionAboveTrackedEnemy(surpriseJumpProfile);
        this.playAnimation('spinAttack');
      },
    });
  }

  /**
   * Updates the Reaper surprise-strike targeting while its jump or strike animation is active.
   */
  updateSurpriseCharge() {
    if (!this.usesSurpriseStrike()) {
      return false;
    }

    if (this.isSurpriseDashing) {
      this.setVelocity(0, 0);
      return true;
    }

    const spinAttackKey = this.getOptionalAnimationKey('spinAttack');

    if (this.anims.currentAnim?.key === spinAttackKey) {
      this.setVelocity(0, 0);
      return true;
    }

    return false;
  }

  /**
   * Returns true when the active character supports directional double-tap dash movement.
   */
  usesDirectionalDash() {
    return Boolean(this.getOptionalAnimationKey('dash') && this.getMovementProfile('dash'));
  }

  /**
   * Returns the resolved grounded-jump and air-jump tuning for the active character.
   */
  getJumpProfile() {
    const jumpProfile = this.getMovementProfile('jump');
    return {
      velocity: jumpProfile?.velocity ?? 500,
      airJumpCount: Math.max(0, jumpProfile?.airJumpCount ?? 1),
      airJumpHeightRatio: Phaser.Math.Clamp(jumpProfile?.airJumpHeightRatio ?? 0.5, 0, 1),
    };
  }

  /**
   * Returns true when any jump key was pressed this frame.
   */
  isJumpJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keyW)
      || Phaser.Input.Keyboard.JustDown(this.keySPACE);
  }

  /**
   * Restores the available air jumps whenever the player is standing on solid ground.
   */
  resetAirJumpsIfGrounded() {
    if (!this.isGrounded()) {
      return false;
    }

    this.remainingAirJumps = this.getJumpProfile().airJumpCount;
    return true;
  }

  /**
   * Starts a grounded jump or one additional air jump at reduced height.
   */
  tryJump() {
    if (!this.isJumpJustPressed()) {
      return false;
    }

    const isGrounded = this.isGrounded();
    const jumpProfile = this.getJumpProfile();

    if (isGrounded) {
      this.setVelocityY(-jumpProfile.velocity);
      this.playAnimation('jump');
      return true;
    }

    if (this.remainingAirJumps <= 0) {
      return false;
    }

    // Arcade jump height scales with velocity squared, so sqrt(0.5) produces
    // an air jump that reaches roughly half the grounded jump height.
    const airJumpVelocity = jumpProfile.velocity * Math.sqrt(jumpProfile.airJumpHeightRatio);
    this.remainingAirJumps -= 1;
    this.setVelocityY(-airJumpVelocity);
    this.playAnimation('jump');
    return true;
  }

  /**
   * Starts a horizontal dash in the requested direction.
   */
  startDirectionalDash(direction) {
    const dashProfile = this.getMovementProfile('dash');
    if (!dashProfile) {
      return false;
    }

    const dashDurationMs = dashProfile.durationMs ?? 180;
    const dashDistance = dashProfile.distance ?? 550;
    const dashSpeed = dashProfile.speed ?? (dashDistance / Math.max(dashDurationMs / 1000, 0.001));

    this.isMovementDashing = true;
    this.movementDashDirection = direction;
    this.movementDashEndsAt = this.scene.time.now + dashDurationMs;
    this.flipX = direction < 0;
    this.setVelocityX(dashSpeed * direction);
    this.playAnimation('dash');
    return true;
  }

  /**
   * Checks for a double-tap on A/D or Left/Right and starts a dash when detected.
   */
  tryStartDirectionalDash() {
    if (!this.usesDirectionalDash()) {
      return false;
    }

    const dashProfile = this.getMovementProfile('dash');
    const doubleTapWindowMs = dashProfile?.doubleTapWindowMs ?? 220;
    const now = this.scene.time.now;

    if (Phaser.Input.Keyboard.JustDown(this.keyA) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      const shouldDash = (now - this.lastLeftTapAt) <= doubleTapWindowMs;
      this.lastLeftTapAt = now;
      if (shouldDash) {
        if (!this.canSpendMana(dashProfile?.manaCost ?? 0)) {
          this.showNotEnoughMana();
          return true;
        }
        this.spendMana(dashProfile?.manaCost ?? 0);
        return this.startDirectionalDash(-1);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyD) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      const shouldDash = (now - this.lastRightTapAt) <= doubleTapWindowMs;
      this.lastRightTapAt = now;
      if (shouldDash) {
        if (!this.canSpendMana(dashProfile?.manaCost ?? 0)) {
          this.showNotEnoughMana();
          return true;
        }
        this.spendMana(dashProfile?.manaCost ?? 0);
        return this.startDirectionalDash(1);
      }
    }

    return false;
  }

  /**
   * Advances the active movement dash until its timer ends or the player hits a wall.
   */
  updateMovementDash() {
    if (!this.isMovementDashing) {
      return false;
    }

    if (this.scene.time.now >= this.movementDashEndsAt || this.body.blocked.left || this.body.blocked.right) {
      this.isMovementDashing = false;
      this.movementDashDirection = 0;
      this.movementDashEndsAt = 0;
      this.setVelocityX(0);
      if (!this.isDead && !this.swordSwing) {
        this.playAnimation('idle', true);
      }
      return false;
    }

    const dashProfile = this.getMovementProfile('dash');
    this.setVelocityX((dashProfile?.speed ?? 520) * this.movementDashDirection);
    this.playAnimation('dash', true);
    return true;
  }

  /**
   * Creates the row of spike sprites used by the Space attack burst.
   */
  createSpaceSpikeEffects() {
    const textureKey = this.characterConfig?.effects?.spaceSpikesTextureKey;
    if (!textureKey) {
      return [];
    }

    const effectCount = Math.max(3, Math.ceil(PLAYER_ABILITY_SETTINGS.spaceSpikeRangeWidth / 144));

    return Array.from({ length: effectCount }, () => this.scene.add.sprite(this.x, this.y, textureKey)
      .setOrigin(0.5, 1)
      .setDepth(96)
      .setVisible(false));
  }

  /**
   * Enables clicking the player sprite to open the profile panel.
   */
  enableProfileInteraction() {
    const hitArea = new Phaser.Geom.Rectangle(
      this.body.offset.x,
      this.body.offset.y,
      this.body.width,
      this.body.height,
    );

    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  }

  /**
   * Returns the percentage-based defense reduction granted by upgrades.
   */
  getDefensePercent() {
    return this.defenseUpgradeLevel * this.defensePercentPerLevel;
  }

  /**
   * Returns the flat damage reduction derived from the defense percentage.
   */
  getDefenseValue() {
    return Math.round(this.maxHp * this.getDefensePercent());
  }

  /**
   * Resets attack state once a non-looping attack animation finishes.
   * This is where the player returns temporary combat state back to neutral
   * after Phaser reports that an action animation has completed.
   */
  bindAttackAnimationHandlers() {
    if (this.attackAnimationHandlerBound) {
      return;
    }

    const attackAnimations = ['smash', 'thrust', 'spinAttack', 'surpriseJump', 'specialAttack', 'heal', 'death']
      .map((action) => this.getOptionalAnimationKey(action))
      .filter(Boolean);
    const deathKey = this.getOptionalAnimationKey('death');
    const surpriseJumpKey = this.getOptionalAnimationKey('surpriseJump');

    this.on('animationcomplete', (animation) => {
      if (!attackAnimations.includes(animation.key)) {
        if (animation.key === this.getOptionalAnimationKey('idleBreak')) {
          this.idleBreakTriggered = true;
          if (!this.isDead) {
            this.playAnimation('idle', true);
          }
        }
        return;
      }

      if (this.usesSpinComboFollowUp() && animation.key === this.getOptionalAnimationKey('spinAttack')) {
        this.playAnimation('surpriseJump');
        return;
      }

      if (this.usesSmokeAmbush() && animation.key === this.getOptionalAnimationKey('spinAttack') && this.smokeHideAnimationPending) {
        this.enterSmokeHiddenState();
        return;
      }

      if (this.usesSmokeAmbush() && animation.key === this.getOptionalAnimationKey('surpriseJump') && this.smokeRevealAnimationPending) {
        this.smokeRevealAnimationPending = false;
        this.isUntouchable = false;

        if (this.smokeQueuedAttackAction) {
          const targetEnemy = this.smokeAmbushTarget;
          if (targetEnemy?.active && !targetEnemy.isDead && targetEnemy.body && this.body) {
            const destination = this.getSmokeAmbushDestination(targetEnemy);
            if (destination) {
              this.setPosition(destination.x, destination.y);
              this.body.updateFromGameObject();
              this.flipX = !targetEnemy.flipX;
            }
          }

          const queuedAction = this.smokeQueuedAttackAction;
          this.smokeQueuedAttackAction = null;
          this.smokeAmbushSnapApplied = false;
          this.playAnimation(queuedAction);
          return;
        }

        this.resetSmokeAmbushState(true);
        return;
      }

      if (animation.key === this.getOptionalAnimationKey('specialAttack') && this.specialAttackReturnPosition && this.body) {
        this.setVelocity(0, 0);
        this.setPosition(this.specialAttackReturnPosition.x, this.specialAttackReturnPosition.y);
        this.body.updateFromGameObject();
      }

      this.swordSwing = false;
      this.stopSurpriseDash();
      this.resetAttackAudioState();
      this.smashStepApplied = false;
      this.thrustStepApplied = false;
      this.spinStepApplied = false;
      this.isSpecialAttackCasting = false;
      this.specialAttackTriggered = false;
      this.healApplied = false;
      this.surpriseAttackPrimed = false;
      this.trackedSurpriseEnemy = null;
      this.trackedSpecialEnemy = null;
      this.lastSpecialStrikeFrame = null;
      this.specialAttackStrikeCount = 0;
      this.lastSpecialAttackCountedFrame = null;
      this.specialAttackAnchorY = null;
      this.specialAttackCastOrigin = null;
      this.specialAttackReturnPosition = null;
      this.isMovementDashing = false;
      this.movementDashDirection = 0;
      this.movementDashEndsAt = 0;
      this.isUntouchable = false;
      if (['smash', 'thrust'].includes(animation.key.split('.').pop())) {
        this.ambushCriticalAttackAction = null;
      }
      this.exitSurpriseHiddenState();
      this.swordHitBox.body.enable = false;
      this.spinHitBox.body.enable = false;
      this.thrustAttackHitBox.body.enable = false;
      this.specialAttackHitBox.body.enable = false;
      this.stopSpaceSpikeEffects();
      if (animation.key !== deathKey && !this.isDead) {
        this.playAnimation('idle', true);
      }
    });

    this.attackAnimationHandlerBound = true;
  }

  /**
   * Frame update for movement, jumping, and attack animation triggers.
   * `MainScene.update()` calls this every frame before enemy and UI updates.
   */
  update() {
    if (this.isDead) {
      this.setVelocityX(0);
      this.updatePlayerHurtBox();
      this.updateNameLabelPosition();
      this.updateDeathAudio();
      return;
    }

    this.resetAirJumpsIfGrounded();

    let movingX = false;
    const baseSpeed = 200;
    let isPerformingAction = false;

    if (this.updateSceneEntry(baseSpeed)) {
      movingX = true;
      isPerformingAction = true;
    } else if (this.updateSmokeAmbushState()) {
      isPerformingAction = true;
    } else if (this.updateSurpriseCharge()) {
      isPerformingAction = true;
    } else if (this.updateMovementDash()) {
      isPerformingAction = true;
    } else if (!this.swordSwing) {
      this.setVelocityX(0);

      if (this.combatEnabled && Phaser.Input.Keyboard.JustDown(this.actionKeys.smash) && this.getOptionalAnimationKey('smash')) {
        this.resetAttackAudioState();
        this.swordSwing = true;
        this.playAnimation('smash');
        isPerformingAction = true;
      } else if (this.combatEnabled && Phaser.Input.Keyboard.JustDown(this.actionKeys.thrust) && this.getOptionalAnimationKey('thrust')) {
        this.resetAttackAudioState();
        this.swordSwing = true;
        this.playAnimation('thrust');
        isPerformingAction = true;
      } else if (this.combatEnabled && Phaser.Input.Keyboard.JustDown(this.actionKeys.spinAttack) && this.getOptionalAnimationKey('spinAttack')) {
        this.beginSpinAction();
        isPerformingAction = true;
      } else if (this.combatEnabled && Phaser.Input.Keyboard.JustDown(this.actionKeys.heal) && this.getOptionalAnimationKey('heal')) {
        if (this.canHeal()) {
          this.resetAttackAudioState();
          this.swordSwing = true;
          this.playAnimation('heal');
          isPerformingAction = true;
        } else if (this.currentHp > 0 && this.currentHp < this.maxHp) {
          this.showNotEnoughMana();
        }
      } else if (
        this.combatEnabled
        && !this.isSpecialAttackCasting
        && Phaser.Input.Keyboard.JustDown(this.actionKeys.specialAttack)
        && this.getOptionalAnimationKey('specialAttack')
      ) {
        const specialAttackHpCost = this.getHpCost('specialAttack');
        const specialAttackProfile = this.getCombatProfile('specialAttack');
        if (!this.canSpendHp(specialAttackHpCost)) {
          this.showNotEnoughHp();
          isPerformingAction = true;
        } else if (specialAttackProfile?.mode !== 'buff' && !this.isGrounded()) {
          this.showOnGroundCastWarning();
          isPerformingAction = true;
        } else {
          const specialAttackManaCost = this.getManaCost('specialAttack');
          if (this.canSpendMana(specialAttackManaCost)) {
            this.spendHp(specialAttackHpCost);
            this.spendMana(specialAttackManaCost);
            this.beginSpecialAttackAction();
            isPerformingAction = true;
          } else {
            this.showNotEnoughMana();
          }
        }
      } else {
        if (this.tryStartDirectionalDash()) {
          isPerformingAction = true;
        } else {
          if (this.tryJump()) {
            isPerformingAction = true;
          }

          if (this.cursors.left.isDown || this.keyA.isDown) {
            this.setVelocityX(-baseSpeed);
            this.playAnimation('run');
            this.flipX = true;
            movingX = true;
            isPerformingAction = true;
          } else if (this.cursors.right.isDown || this.keyD.isDown) {
            this.setVelocityX(baseSpeed);
            this.playAnimation('run');
            this.flipX = false;
            movingX = true;
            isPerformingAction = true;
          }

          if (this.body.velocity.y > 0 && !this.isGrounded()) {
            this.playAnimation('fall');
            isPerformingAction = true;
          } else if (!movingX && this.anims.currentAnim?.key !== this.getOptionalAnimationKey('idleBreak')) {
            this.playAnimation('idle', true);
          }
        }
      }
    } else {
      isPerformingAction = true;
    }

    if (
      this.anims.currentAnim?.key === this.getOptionalAnimationKey('spinAttack')
      && !['surpriseStrike', 'smokeCombo', 'smokeAmbush'].includes(this.getCombatProfile('spinAttack')?.mode)
    ) {
      this.setVelocityX(this.flipX ? -(baseSpeed + 100) : baseSpeed + 100);
      isPerformingAction = true;
    }

    if (this.updateSpecialAttackTracking()) {
      isPerformingAction = true;
    }

    this.updateSmokeAmbushTracking();
    this.updateHitboxes();
    this.updatePlayerHurtBox();
    this.updateHeal();
    this.updateIdleBreakState(isPerformingAction, movingX);
    this.updateManaRegeneration();
    this.updateSpecialBuffHpRegen();
    this.updateNameLabelPosition();
  }

  beginSceneEntry(entryConfig = {}) {
    const direction = entryConfig.direction === 'left' ? 'left' : 'right';
    this.sceneEntryState = {
      direction,
      speed: entryConfig.speed ?? 200,
      endsAt: this.scene.time.now + (entryConfig.durationMs ?? 260),
    };
    this.flipX = direction === 'left';
  }

  updateSceneEntry(baseSpeed) {
    if (!this.sceneEntryState) {
      return false;
    }

    if (this.scene.time.now >= this.sceneEntryState.endsAt) {
      this.sceneEntryState = null;
      this.setVelocityX(0);
      if (this.isGrounded()) {
        this.playAnimation('idle', true);
      }
      return false;
    }

    const direction = this.sceneEntryState.direction === 'left' ? -1 : 1;
    const speed = this.sceneEntryState.speed ?? baseSpeed;
    this.setVelocityX(speed * direction);
    this.flipX = direction < 0;

    if (this.body.velocity.y > 0 && !this.isGrounded()) {
      this.playAnimation('fall');
    } else {
      this.playAnimation('run');
    }

    return true;
  }

  /**
   * Plays the long idle animation after the player stands still long enough.
   */
  updateIdleBreakState(isPerformingAction, movingX) {
    const idleBreakKey = this.getOptionalAnimationKey('idleBreak');
    const isIdle = !isPerformingAction
      && !movingX
      && this.isGrounded()
      && !this.cursors.left.isDown
      && !this.cursors.right.isDown
      && !this.keyA.isDown
      && !this.keyD.isDown
      && !this.cursors.up.isDown
      && !this.keyW.isDown
      && !this.keySPACE.isDown
      && Math.abs(this.body.velocity.x) < 1;

    if (!isIdle) {
      this.idleStartTime = this.scene.time.now;
      this.idleBreakTriggered = false;
      return;
    }

    if (!idleBreakKey || this.anims.currentAnim?.key === idleBreakKey) {
      return;
    }

    const idleElapsed = this.scene.time.now - this.idleStartTime;
    if (!this.idleBreakTriggered && idleElapsed >= 20000) {
      this.anims.play(idleBreakKey, true);
      this.idleBreakTriggered = true;
    }
  }

  /**
   * Returns true when the player has enough mana to use an action.
   */
  canSpendMana(manaCost) {
    return this.currentMana >= manaCost;
  }

  /**
   * Returns true when the player has enough HP to use an HP-cost action safely.
   */
  canSpendHp(hpCost) {
    return hpCost <= 0 || this.currentHp > hpCost;
  }

  /**
   * Deducts mana while preventing negative values.
   */
  spendMana(manaCost) {
    this.currentMana = Math.max(0, this.currentMana - manaCost);
  }

  /**
   * Deducts HP while preventing death from action cost alone.
   */
  spendHp(hpCost) {
    if (hpCost <= 0) {
      return;
    }

    this.currentHp = Math.max(1, this.currentHp - hpCost);
  }

  /**
   * Shows a temporary warning when a mana-based action cannot be used.
   */
  showNotEnoughMana() {
    if ((this.scene.time.now - this.lastManaWarningAt) < 350) {
      return;
    }

    this.lastManaWarningAt = this.scene.time.now;
    const manaWarning = this.scene.add.text(this.x, this.y - 90, 'Not enough Mana', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#7dd3fc',
      fontStyle: 'bold',
      stroke: '#03131d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(240);

    this.scene.tweens.add({
      targets: manaWarning,
      y: manaWarning.y - 34,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => manaWarning.destroy(),
    });
  }

  /**
   * Shows a temporary warning when an HP-based action cannot be used.
   */
  showNotEnoughHp() {
    if ((this.scene.time.now - this.lastHpWarningAt) < 350) {
      return;
    }

    this.lastHpWarningAt = this.scene.time.now;
    const hpWarning = this.scene.add.text(this.x, this.y - 90, 'Not enough HP', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fda4af',
      fontStyle: 'bold',
      stroke: '#03131d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(240);

    this.scene.tweens.add({
      targets: hpWarning,
      y: hpWarning.y - 34,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => hpWarning.destroy(),
    });
  }

  /**
   * Shows a temporary warning when the special skill is attempted mid-air.
   */
  showOnGroundCastWarning() {
    if ((this.scene.time.now - this.lastGroundCastWarningAt) < 350) {
      return;
    }

    this.lastGroundCastWarningAt = this.scene.time.now;
    const groundCastWarning = this.scene.add.text(this.x, this.y - 90, 'on ground cast', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fef08a',
      fontStyle: 'bold',
      stroke: '#03131d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(240);

    this.scene.tweens.add({
      targets: groundCastWarning,
      y: groundCastWarning.y - 34,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => groundCastWarning.destroy(),
    });
  }

  /**
   * Returns true when healing is allowed and would restore real HP.
   */
  canHeal() {
    return this.combatEnabled
      && !this.isDead
      && this.currentHp > 0
      && this.currentHp < this.maxHp
      && this.canSpendMana(this.getHealManaCost());
  }

  /**
   * Applies the heal once during the heal animation.
   */
  updateHeal() {
    const healKey = this.getOptionalAnimationKey('heal');
    if (!healKey || this.anims.currentAnim?.key !== healKey) {
      return;
    }

    if (this.healApplied) {
      return;
    }

    if ((this.anims.currentFrame?.index ?? 0) < 1) {
      return;
    }

    this.spendMana(this.getHealManaCost());
    const healAmount = Math.max(1, Math.round(this.maxHp * PLAYER_ABILITY_SETTINGS.healPercent));
    const healedHp = Math.min(this.maxHp, this.currentHp + healAmount);
    const appliedHeal = healedHp - this.currentHp;

    if (appliedHeal <= 0) {
      this.healApplied = true;
      return;
    }

    this.currentHp = healedHp;
    this.scene.sound.play('healing', { volume: 1, seek: 1 });
    this.showDamagePopup(this.x, this.y - 24, `+${appliedHeal}`, '#7CFF8A', 1400, 90);
    this.healApplied = true;
  }

  /**
   * Returns the mana cost for heal as a percentage of the max mana pool.
   */
  getHealManaCost() {
    return Math.max(1, Math.ceil(this.maxMana * PLAYER_ABILITY_SETTINGS.healManaCostPercent));
  }

  /**
   * Regenerates mana after a long idle period, then continues on a slower interval.
   */
  updateManaRegeneration() {
    if (this.currentMana >= this.maxMana) {
      return;
    }

    if (this.lastManaRegenAt === null) {
      this.lastManaRegenAt = this.scene.time.now;
      return;
    }

    if ((this.scene.time.now - this.lastManaRegenAt) < PLAYER_ABILITY_SETTINGS.manaRegenMovingIntervalMs) {
      return;
    }

    this.lastManaRegenAt = this.scene.time.now;
    this.regenerateManaTick();
  }

  /**
   * Applies one mana regeneration tick.
   */
  regenerateManaTick() {
    const manaGain = PLAYER_ABILITY_SETTINGS.manaRegenMovingFlatAmount;
    this.currentMana = Math.min(this.maxMana, this.currentMana + manaGain);
  }

  /**
   * Regenerates 0.6% of max HP per second while the Power Charge buff is active.
   * Stops automatically once all stacks are consumed and the buff ends.
   */
  updateSpecialBuffHpRegen() {
    if (!this.isSpecialBuffActive()) {
      this.specialBuffHpRegenLastAt = null;
      return;
    }

    const now = this.scene.time.now;
    if (this.specialBuffHpRegenLastAt === null) {
      this.specialBuffHpRegenLastAt = now;
      return;
    }

    const tickIntervalMs = 1000;
    const elapsed = now - this.specialBuffHpRegenLastAt;
    if (elapsed < tickIntervalMs) {
      return;
    }

    const ticks = Math.floor(elapsed / tickIntervalMs);
    this.specialBuffHpRegenLastAt += ticks * tickIntervalMs;

    if (this.currentHp >= this.maxHp) {
      return;
    }

    const healPerTick = Math.max(1, Math.round(this.maxHp * 0.006));
    const totalHeal = healPerTick * ticks;
    const actualHeal = Math.min(totalHeal, this.maxHp - this.currentHp);
    this.currentHp = Math.min(this.maxHp, this.currentHp + actualHeal);
    this.showDamagePopup(this.x, this.y - 28, `+${actualHeal}`, '#7CFF8A', 900, 60);
    this.scene?.refreshPlayerUi?.();
  }

  /**
   * Updates all player attack hitboxes against the current animation frame.
   * This is the bridge between animation timing and collision-based combat.
   */
  updateHitboxes() {
    this.updateSmashHitbox();
    this.updateSpinHitbox();
    this.updateThrustHitbox();
    this.updateSpecialAttackEffect();
  }

  updatePlayerHurtBox() {
    if (!this.playerHurtBox?.body) {
      return;
    }

    const centerX = this.body?.center?.x ?? this.x;
    const centerY = this.body?.center?.y ?? this.y;
    this.playerHurtBox.setPosition(centerX, centerY);
    this.playerHurtBox.body.updateFromGameObject();
    this.playerHurtBox.body.enable = this.active && !this.isDead;
    this.playerHurtBox.setVisible(false);
  }

  grantEnemyDamageInvincibility(durationMs = 500) {
    this.enemyDamageInvincibleUntil = this.scene.time.now + durationMs;
  }

  isEnemyDamageInvincible(currentTime = this.scene.time.now) {
    return currentTime < (this.enemyDamageInvincibleUntil ?? -Infinity);
  }

  /**
   * Updates the smash hitbox and sound timing.
   */
  updateSmashHitbox() {
    const smashKey = this.getOptionalAnimationKey('smash');
    const smashProfile = this.getCombatProfile('smash');
    this.swordHitBox.setVisible(false);
    const hitboxConfig = this.configureAttackHitbox(this.swordHitBox, {
      width: 65,
      height: 40,
      offsetX: 45,
      offsetY: 0,
      activeFrames: [{ start: 11, end: 13 }],
    }, smashProfile);

    if (!smashKey) {
      this.swordHitBox.body.enable = false;
      return;
    }

    const currentFrame = this.anims.currentFrame?.index ?? -1;
    if (this.anims.currentAnim?.key === smashKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
      if (!this.smashStepApplied) {
        this.x += this.flipX ? -14 : 14;
        this.smashStepApplied = true;
      }

      this.swordHitBox.body.enable = true;
      this.playAttackSound(smashProfile?.sound, 'smashAttack');
    } else {
      this.swordHitBox.body.enable = false;
      this.smashStepApplied = false;
    }
  }

  /**
   * Updates the X attack hitbox and sound timing.
   */
  updateSpinHitbox() {
    const spinKey = this.getOptionalAnimationKey('spinAttack');
    const spinFollowUpKey = this.getOptionalAnimationKey('surpriseJump');
    const spinProfile = this.getCombatProfile('spinAttack');
    const spinFollowUpProfile = this.getCombatProfile('surpriseJump');
    this.spinHitBox.setVisible(false);

    if (spinProfile?.mode === 'surpriseStrike') {
      const hitboxConfig = this.configureAttackHitbox(this.spinHitBox, {
        width: 58,
        height: 70,
        offsetX: 8,
        offsetY: -14,
        activeFrames: [{ start: 14, end: 17 }],
      }, spinProfile);

      if (!spinKey) {
        this.spinHitBox.body.enable = false;
        return;
      }

      const currentFrame = this.anims.currentFrame?.index ?? -1;
      if (this.anims.currentAnim?.key === spinKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
        this.spinHitBox.body.enable = true;
        this.playAttackSound(spinProfile?.sound, 'reaperSurpriseAttack');
      } else {
        this.spinHitBox.body.enable = false;
      }
      return;
    }

    if (spinProfile?.mode === 'smokeCombo') {
      const hitboxConfig = this.configureAttackHitbox(this.spinHitBox, {
        width: 70,
        height: 36,
        offsetX: 16,
        offsetY: 0,
        activeFrames: [{ start: 3, end: 7 }],
      }, spinFollowUpProfile);

      if (!spinKey || !spinFollowUpKey) {
        this.spinHitBox.body.enable = false;
        return;
      }

      const currentFrame = this.anims.currentFrame?.index ?? -1;
      if (this.anims.currentAnim?.key === spinFollowUpKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
        this.spinHitBox.body.enable = true;
      } else {
        this.spinHitBox.body.enable = false;
      }
      return;
    }

    if (spinProfile?.mode === 'smokeAmbush') {
      this.spinHitBox.body.enable = false;
      return;
    }

    const hitboxConfig = this.configureAttackHitbox(this.spinHitBox, {
      width: 145,
      height: 40,
      offsetX: 7,
      offsetY: 0,
      activeFrames: [{ start: 1, end: 1 }],
    }, spinProfile);

    if (!spinKey) {
      this.spinHitBox.body.enable = false;
      return;
    }

    const currentFrame = this.anims.currentFrame?.index ?? -1;
    if (this.anims.currentAnim?.key === spinKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
      if (!this.spinStepApplied) {
        this.x += this.flipX ? -18 : 18;
        this.spinStepApplied = true;
      }

      this.spinHitBox.body.enable = true;
      this.playAttackSound(spinProfile?.sound ?? { key: 'spinAttack', volume: 1.2, triggerFrames: [1] }, 'spinAttack');
    } else if (this.anims.currentAnim?.key === spinKey) {
      this.spinHitBox.body.enable = false;
      this.spinStepApplied = false;
    } else if (this.anims.currentAnim?.key !== spinKey) {
      this.spinHitBox.body.enable = false;
    }
  }

  /**
   * Updates the thrust hitbox and sound timing.
   */
  updateThrustHitbox() {
    const thrustKey = this.getOptionalAnimationKey('thrust');
    const thrustProfile = this.getCombatProfile('thrust');
    this.thrustAttackHitBox.setVisible(false);
    const hitboxConfig = this.configureAttackHitbox(this.thrustAttackHitBox, {
      width: 95,
      height: 25,
      offsetX: 35,
      offsetY: 2,
      activeFrames: [{ start: 1, end: 1 }],
    }, thrustProfile);

    if (!thrustKey) {
      this.thrustAttackHitBox.body.enable = false;
      return;
    }

    const currentFrame = this.anims.currentFrame?.index ?? -1;
    if (this.anims.currentAnim?.key === thrustKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
      if (!this.thrustStepApplied) {
        this.x += this.flipX ? -14 : 14;
        this.thrustStepApplied = true;
      }

      this.thrustAttackHitBox.body.enable = true;
      this.playAttackSound(thrustProfile?.sound, 'thrustAttack');
    } else if (this.anims.currentAnim?.key === thrustKey) {
      this.thrustAttackHitBox.body.enable = false;
      this.thrustStepApplied = false;
    } else {
      this.thrustAttackHitBox.body.enable = false;
    }
  }

  /**
   * Triggers the special attack visuals, sound, and hitbox timing.
   * Luneblade uses the burst/spike version, while Reaper can override this
   * through character combat config to use a melee-style special instead.
   */
  updateSpecialAttackEffect() {
    const specialAttackKey = this.getOptionalAnimationKey('specialAttack');
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    const specialMode = specialAttackProfile?.mode ?? 'burst';
    this.specialAttackHitBox.setVisible(false);

    if (!specialAttackKey) {
      this.specialAttackHitBox.body.enable = false;
      this.clearSpecialBurstTimers();
      return;
    }

    const currentFrame = this.anims.currentFrame?.index ?? 0;
    if (specialMode === 'buff') {
      this.updateSpecialBuffShockwave(specialAttackProfile);
      return;
    }

    if (specialMode === 'animationOnly') {
      this.specialAttackHitBox.body.enable = false;
      this.isUntouchable = false;
      return;
    }

    if (specialMode === 'melee') {
      const frameHitboxConfig = this.getFrameHitboxConfig(currentFrame, specialAttackProfile?.hitboxFrames ?? []);
      const hitboxConfig = this.configureAttackHitbox(this.specialAttackHitBox, {
        width: PLAYER_ABILITY_SETTINGS.spaceSpikeRangeWidth,
        height: PLAYER_ABILITY_SETTINGS.spaceSpikeRangeHeight,
        offsetX: 0,
        offsetY: 0,
        activeFrames: [],
      }, {
        ...(specialAttackProfile ?? {}),
        hitbox: {
          ...(specialAttackProfile?.hitbox ?? {}),
          ...(frameHitboxConfig ?? {}),
        },
      });

      if (this.anims.currentAnim?.key === specialAttackKey) {
        this.playAttackSound(specialAttackProfile?.sound, 'heavySmash');
        if (!specialAttackProfile?.cameraShake?.onHitOnly) {
          this.playAttackCameraShake(specialAttackProfile?.cameraShake, 'specialAttackMelee');
        }
      }

      if (
        this.anims.currentAnim?.key === specialAttackKey
        && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)
        && this.canUseSpecialAttackStrike(currentFrame, specialAttackProfile)
      ) {
        this.specialAttackHitBox.body.enable = true;
      } else {
        this.specialAttackHitBox.body.enable = false;
      }
      return;
    }

    if (this.anims.currentAnim?.key !== specialAttackKey) {
      this.specialAttackHitBox.body.enable = false;
      return;
    }

    const burstStartFrame = specialAttackProfile?.burstStartFrame ?? PLAYER_ABILITY_SETTINGS.spaceSpikeBurstStartFrame;
    const burstEndFrame = specialAttackProfile?.burstEndFrame ?? PLAYER_ABILITY_SETTINGS.spaceSpikeBurstEndFrame;

    if (currentFrame >= burstStartFrame && !this.specialAttackTriggered) {
      this.triggerSpaceSpikeBurst(specialAttackProfile);
      this.specialAttackTriggered = true;
    }

    if (currentFrame >= burstStartFrame) {
      this.playAttackSound(specialAttackProfile?.sound, 'heavySmash');
    }
  }

  /**
   * Positions the underground spikes around the player and enables damage checks.
   */
  triggerSpaceSpikeBurst(specialAttackProfile = null) {
    if (!this.spaceSpikeEffects.length) {
      return;
    }

    this.clearSpecialBurstTimers();
    const footY = this.body ? this.body.bottom : this.y + 36;
    const hitboxY = footY - (PLAYER_ABILITY_SETTINGS.spaceSpikeRangeHeight / 2) + 10;

    this.specialAttackHitBox.x = this.x;
    this.specialAttackHitBox.y = hitboxY;
    this.specialAttackHitBox.body.updateFromGameObject();
    this.specialAttackHitBox.body.enable = false;

    const totalWidth = PLAYER_ABILITY_SETTINGS.spaceSpikeRangeWidth;
    const startX = this.x - (totalWidth / 2);
    const spacing = this.spaceSpikeEffects.length > 1
      ? totalWidth / (this.spaceSpikeEffects.length - 1)
      : 0;

    this.spaceSpikeEffects.forEach((effect, index) => {
      effect.setPosition(startX + (spacing * index), footY + 1);
      effect.setVisible(true);
      effect.play(this.characterConfig.effects.spaceSpikesAnimation.key, true);
    });

    this.playAttackCameraShake(specialAttackProfile?.cameraShake, 'specialAttackBurst');

    const hitboxDelayMs = specialAttackProfile?.hitboxDelayMs ?? 120;
    const hitboxActiveDurationMs = specialAttackProfile?.hitboxActiveDurationMs ?? 170;
    this.specialBurstActivateEvent = this.scene.time.delayedCall(hitboxDelayMs, () => {
      if (!this.active || !this.specialAttackHitBox?.body) {
        return;
      }

      this.specialAttackHitBox.body.enable = true;
      this.specialBurstDeactivateEvent = this.scene.time.delayedCall(hitboxActiveDurationMs, () => {
        if (!this.active || !this.specialAttackHitBox?.body) {
          return;
        }

        this.specialAttackHitBox.body.enable = false;
        this.specialBurstDeactivateEvent = null;
      });
      this.specialBurstActivateEvent = null;
    });
  }

  /**
   * Hides all temporary spike burst visuals.
   */
  stopSpaceSpikeEffects() {
    this.clearSpecialBurstTimers();
    this.specialAttackHitBox.body.enable = false;
    this.spaceSpikeEffects.forEach((effect) => {
      effect.anims.stop();
      effect.setVisible(false);
    });
  }

  /**
   * Plays the player death sounds in sequence during the sword-spin death animation.
   */
  updateDeathAudio() {
    const deathKey = this.getOptionalAnimationKey('death');
    if (!deathKey || this.anims.currentAnim?.key !== deathKey) {
      return;
    }

    const frameIndex = this.anims.currentFrame?.index ?? 0;
    if (frameIndex >= 4 && !this.deathSpinSoundPlayed) {
      this.scene.sound.play('swordspinDeath', { volume: 1.1 });
      this.deathSpinSoundPlayed = true;
    }

    if (frameIndex >= 7 && !this.deathCharacterSoundPlayed) {
      this.scene.sound.play('deathCharacter', { volume: 1 });
      this.deathCharacterSoundPlayed = true;
    }
  }

  /**
   * Clears active attack state and prepares one-shot flags for the death sequence.
   */
  beginDeathState() {
    this.isDead = true;
    this.isHurting = true;
    this.swordSwing = false;
    this.stopSurpriseDash();
    this.resetAttackAudioState();
    this.smashStepApplied = false;
    this.thrustStepApplied = false;
    this.spinStepApplied = false;
    this.isSpecialAttackCasting = false;
    this.specialAttackTriggered = false;
    this.healApplied = false;
    this.surpriseAttackPrimed = false;
    this.trackedSurpriseEnemy = null;
    this.trackedSpecialEnemy = null;
    this.lastSpecialStrikeFrame = null;
    this.specialAttackStrikeCount = 0;
    this.lastSpecialAttackCountedFrame = null;
    this.specialAttackAnchorY = null;
    this.specialAttackCastOrigin = null;
    this.specialAttackReturnPosition = null;
    this.deactivateSpecialBuff();
    this.isMovementDashing = false;
    this.movementDashDirection = 0;
    this.movementDashEndsAt = 0;
    this.isUntouchable = false;
    this.enemyDamageInvincibleUntil = -Infinity;
    this.enemyKnockbackTween?.stop();
    this.enemyKnockbackTween = null;
    this.isSmokeHidden = false;
    this.smokeQueuedAttackAction = null;
    this.smokeHideAnimationPending = false;
    this.smokeRevealAnimationPending = false;
    this.smokeAmbushTarget = null;
    this.smokeAmbushSnapApplied = false;
    this.ambushCriticalAttackAction = null;
    this.exitSurpriseHiddenState();
    this.deathSpinSoundPlayed = false;
    this.deathCharacterSoundPlayed = false;
    this.setVelocity(0, 0);
    this.swordHitBox.body.enable = false;
    this.spinHitBox.body.enable = false;
    this.thrustAttackHitBox.body.enable = false;
    this.playerHurtBox.body.enable = true;
    this.specialAttackHitBox.body.enable = false;
    this.stopSpaceSpikeEffects();
  }
}
