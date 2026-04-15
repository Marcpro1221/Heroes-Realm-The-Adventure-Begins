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
    this.thrustStepApplied = false;
    this.spinStepApplied = false;
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
    this.lastLeftTapAt = -Infinity;
    this.lastRightTapAt = -Infinity;
    this.isUntouchable = false;
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
    const baseRange = this.getBaseDamagePercentRange();
    const skillPercentRange = this.getSkillDamagePercentRange(action, fallbackAttackConfig);

    return {
      min: baseRange.min * (1 + skillPercentRange.min),
      max: baseRange.max * (1 + skillPercentRange.max),
    };
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
   * Starts the R-key action and optionally snaps to a random enemy first.
   */
  beginSpecialAttackAction() {
    const specialAttackProfile = this.getCombatProfile('specialAttack');
    this.trackedSpecialEnemy = null;
    this.lastSpecialStrikeFrame = null;
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
    this.playAnimation('specialAttack');
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
   * Starts a horizontal dash in the requested direction.
   */
  startDirectionalDash(direction) {
    const dashProfile = this.getMovementProfile('dash');
    if (!dashProfile) {
      return false;
    }

    const dashDurationMs = dashProfile.durationMs ?? 180;
    const dashDistance = dashProfile.distance ?? 200;
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
      this.thrustStepApplied = false;
      this.spinStepApplied = false;
      this.specialAttackTriggered = false;
      this.healApplied = false;
      this.surpriseAttackPrimed = false;
      this.trackedSurpriseEnemy = null;
      this.trackedSpecialEnemy = null;
      this.lastSpecialStrikeFrame = null;
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
      this.updateNameLabelPosition();
      this.updateDeathAudio();
      return;
    }

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
        && Phaser.Input.Keyboard.JustDown(this.actionKeys.specialAttack)
        && this.getOptionalAnimationKey('specialAttack')
      ) {
        const specialAttackHpCost = this.getHpCost('specialAttack');
        if (!this.canSpendHp(specialAttackHpCost)) {
          this.showNotEnoughHp();
          isPerformingAction = true;
        } else if (!this.body.blocked.down) {
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
          if ((this.cursors.up.isDown || this.keyW.isDown || this.keySPACE.isDown) && this.body.blocked.down) {
            this.setVelocityY(-500);
            this.playAnimation('jump');
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

          if (this.body.velocity.y > 0 && !this.body.touching.down) {
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
    this.updateHeal();
    this.updateIdleBreakState(isPerformingAction, movingX);
    this.updateManaRegeneration();
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
      if (this.body.blocked.down || this.body.touching.down) {
        this.playAnimation('idle', true);
      }
      return false;
    }

    const direction = this.sceneEntryState.direction === 'left' ? -1 : 1;
    const speed = this.sceneEntryState.speed ?? baseSpeed;
    this.setVelocityX(speed * direction);
    this.flipX = direction < 0;

    if (this.body.velocity.y > 0 && !this.body.touching.down) {
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
      && this.body.blocked.down
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
   * Updates all player attack hitboxes against the current animation frame.
   * This is the bridge between animation timing and collision-based combat.
   */
  updateHitboxes() {
    this.updateSmashHitbox();
    this.updateSpinHitbox();
    this.updateThrustHitbox();
    this.updateSpecialAttackEffect();
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
      this.swordHitBox.body.enable = true;
      this.playAttackSound(smashProfile?.sound, 'smashAttack');
    } else {
      this.swordHitBox.body.enable = false;
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

    this.spinHitBox.follow(this, this.flipX ? -7 : 7, 0);

    if (!spinKey) {
      this.spinHitBox.body.enable = false;
      return;
    }

    if (this.anims.currentAnim?.key === spinKey && this.anims.currentFrame?.index === 1) {
      if (!this.spinStepApplied) {
        this.x += this.flipX ? -18 : 18;
        this.spinStepApplied = true;
      }

      this.spinHitBox.body.enable = true;
      this.playAttackSound({ key: 'spinAttack', volume: 1.2, triggerFrames: [1] }, 'spinAttack');
    } else if (this.anims.currentAnim?.key === spinKey && this.anims.currentFrame?.index >= 4) {
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

      if (this.anims.currentAnim?.key === specialAttackKey && this.isFrameWithinActiveWindow(currentFrame, hitboxConfig.activeFrames)) {
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
    this.thrustStepApplied = false;
    this.spinStepApplied = false;
    this.specialAttackTriggered = false;
    this.healApplied = false;
    this.surpriseAttackPrimed = false;
    this.trackedSurpriseEnemy = null;
    this.trackedSpecialEnemy = null;
    this.lastSpecialStrikeFrame = null;
    this.specialAttackAnchorY = null;
    this.specialAttackCastOrigin = null;
    this.specialAttackReturnPosition = null;
    this.isMovementDashing = false;
    this.movementDashDirection = 0;
    this.movementDashEndsAt = 0;
    this.isUntouchable = false;
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
    this.specialAttackHitBox.body.enable = false;
    this.stopSpaceSpikeEffects();
  }
}
