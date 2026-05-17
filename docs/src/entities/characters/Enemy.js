import Hitbox from '../combat/Hitbox.js';
import Character from './Character.js';

export const ENEMY_STATES = Object.freeze({
  IDLE: 'idle',
  CHASE: 'chase',
  ATTACK: 'attack',
  COOLDOWN: 'cooldown',
  RETURN: 'return',
});

/**
 * Smart enemy AI driven by one update loop.
 * Body collision, detection, attack range, and attack hitbox stay separate.
 */
export default class Enemy extends Character {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);

    this.setOrigin(0, 0);
    this.setDepth(10);
    this.setScrollFactor(1);

    this.spawnX = x;
    this.spawnY = y;
    this.homeX = x;
    this.homeY = y;
    this.patrolMinX = x - 120;
    this.patrolMaxX = x + 120;
    this.patrolDirection = 1;
    this.patrolSpeed = 55.55;
    this.moveSpeed = this.patrolSpeed;
    this.returnSpeed = this.patrolSpeed;
    this.enemyDamage = 10;
    this.detectionRange = 250;
    this.attackRange = 50;
    this.attackCooldown = 1200;
    this.detectionLoseSightGraceMs = 900;
    this.currentState = ENEMY_STATES.IDLE;
    this.canAttack = true;
    this.isPlayerDetected = false;
    this.isPlayerInAttackRange = false;
    this.isAttacking = false;
    this.attackHasDealtDamage = false;
    this.attackCooldownEndsAt = -Infinity;
    this.lastDetectedPlayerAt = -Infinity;
    this.lastAttackStartedAt = -Infinity;
    this.lastObstacleTurnAt = -Infinity;
    this.lastHitLocation = { x, y };
    this.attackPattern = ['attack', 'attack2', 'attack3'];
    this.attackPatternIndex = 0;
    this.activeAttackAnimationKey = null;
    this.activeProjectile = null;
    this.patrolTween = null;
    this.patrolTweenTargetX = null;
    this.patrolTweenMode = null;
    this.lastPatrolTweenX = x;
    this.knockbackVelocityX = 0;
    this.knockbackDamping = 0.84;
    this.bodyOffsets = { left: 30, right: 0, y: 7 };
    this.animationKeys = { walk: texture, idle: texture, hurt: texture, attack: texture, death: texture };
    this.debugEnabled = false;
    this.isMovingHorizontally = false;
    this.lastFrameX = x;
    this.combatProfile = {
      detectionZone: { width: 250, height: 100 },
      attackDetectionZone: { width: 50, height: 80 },
      attackRange: { horizontal: 50, vertical: 40 },
      attackHitbox: {
        width: 65,
        height: 30,
        offsetX: 20,
        offsetY: 90,
        activeFrames: [{ start: 1, end: 2 }],
      },
      attackCooldownMs: 1200,
      chaseSpeed: null,
    };

    this.detectionZone = new Hitbox(scene, this.x, this.y, 250, 100, 0x59d9ff, 0.12);
    this.attackDetectionZone = new Hitbox(scene, this.x, this.y, 50, 80, 0xffc857, 0.12);
    this.attackHitBox = new Hitbox(scene, this.x, this.y, 65, 30, 0xff5d73, 0.18);
    this.projectileHitBox = new Hitbox(scene, this.x, this.y, 12, 12, 0xffa94d, 0.18);
    this.enemyHitBox = this.attackHitBox;
    this.stateLabel = scene.add.text(this.x, this.y - 18, this.currentState.toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#fef3c7',
      stroke: '#111827',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(18).setVisible(false);

    this.detectionZone.body.enable = true;
    this.attackDetectionZone.body.enable = true;
    this.attackHitBox.body.enable = false;
    this.projectileHitBox.body.enable = false;
    this.on('animationcomplete', this.handleAnimationComplete, this);
  }

  configureCombatProfile(combatProfile = {}) {
    this.combatProfile = {
      ...this.combatProfile,
      ...combatProfile,
      detectionZone: {
        ...this.combatProfile.detectionZone,
        ...(combatProfile?.detectionZone ?? {}),
      },
      attackDetectionZone: {
        ...this.combatProfile.attackDetectionZone,
        ...(combatProfile?.attackDetectionZone ?? {}),
      },
      attackRange: {
        ...this.combatProfile.attackRange,
        ...(combatProfile?.attackRange ?? {}),
      },
      attackHitbox: {
        ...this.combatProfile.attackHitbox,
        ...(combatProfile?.attackHitbox ?? {}),
      },
      attackPattern: combatProfile?.attackPattern ?? this.attackPattern,
    };

    const detectionZoneConfig = this.combatProfile.detectionZone;
    const attackDetectionZoneConfig = this.combatProfile.attackDetectionZone;
    const attackHitboxConfig = this.combatProfile.attackHitbox;

    this.detectionZone.width = detectionZoneConfig.width;
    this.detectionZone.height = detectionZoneConfig.height;
    this.detectionZone.body.setSize(detectionZoneConfig.width, detectionZoneConfig.height, true);

    this.attackDetectionZone.width = attackDetectionZoneConfig.width;
    this.attackDetectionZone.height = attackDetectionZoneConfig.height;
    this.attackDetectionZone.body.setSize(attackDetectionZoneConfig.width, attackDetectionZoneConfig.height, true);

    this.attackHitBox.width = attackHitboxConfig.width;
    this.attackHitBox.height = attackHitboxConfig.height;
    this.attackHitBox.body.setSize(attackHitboxConfig.width, attackHitboxConfig.height, true);

    this.detectionRange = detectionZoneConfig.width;
    this.attackRange = attackDetectionZoneConfig.width;
    this.moveSpeed = this.combatProfile.chaseSpeed ?? this.patrolSpeed;
    this.returnSpeed = Math.max(this.patrolSpeed, this.moveSpeed * 0.8);
    this.attackCooldown = this.combatProfile.attackCooldownMs ?? this.attackCooldown;
    this.attackPattern = Array.isArray(this.combatProfile.attackPattern) && this.combatProfile.attackPattern.length
      ? [...this.combatProfile.attackPattern]
      : ['attack', 'attack2', 'attack3'];
    this.attackPatternIndex = 0;
  }

  updateMovement(enemySettings, player = null) {
    const currentTime = this.scene.time.now;
    this.debugEnabled = Boolean(enemySettings?.debugEnemyAi);
    this.detectionLoseSightGraceMs = enemySettings?.detectionLoseSightGraceMs ?? this.detectionLoseSightGraceMs;
    this.canAttack = currentTime >= this.attackCooldownEndsAt;
    this.updateDetectionZones();
    this.refreshPlayerAwareness(player, currentTime);

    if (this.isHurting) {
      this.stopPatrolTween();
      this.setVelocityX(this.knockbackVelocityX);
      this.updateKnockback();
      this.updateMovementMetrics();
      this.updateAttackHitbox();
      this.updateDebugVisuals();
      return;
    }

    if (this.isAttacking) {
      this.stopPatrolTween();
      this.setCurrentState(ENEMY_STATES.ATTACK);
      this.setVelocityX(0);
      this.updateMovementMetrics();
      this.updateAttackHitbox();
      this.updateDebugVisuals();
      return;
    }

    const isWithinDetectionGrace = this.isWithinDetectionGrace(currentTime);

    if (this.isPlayerDetected && this.isPlayerInAttackRange && this.canAttack) {
      this.startAttack(player, currentTime);
    } else if (this.isPlayerDetected && this.isPlayerInAttackRange) {
      this.updateCooldownState(player);
    } else if (this.isPlayerDetected) {
      this.updateChaseState(player, enemySettings);
    } else if (isWithinDetectionGrace) {
      this.updateChaseSearchState(enemySettings);
    } else if (this.currentState === ENEMY_STATES.RETURN || !this.isAtHomePosition()) {
      this.updateReturnState(enemySettings);
    } else {
      this.updateIdleState(enemySettings);
    }

    this.updateKnockback();
    this.updateMovementMetrics();
    this.updateAttackHitbox();
    this.updateDebugVisuals();
  }

  refreshPlayerAwareness(player, currentTime) {
    const inDetectionZone = this.canDetectPlayerInChaseZone(player);
    const inAttackZone = this.canDetectPlayerInAttackZone(player);
    const inAttackReach = inAttackZone && this.isPlayerWithinAttackReach(player);

    this.isPlayerDetected = inDetectionZone;
    this.isPlayerInAttackRange = inAttackReach;

    if (inDetectionZone) {
      this.lastDetectedPlayerAt = currentTime;
      this.lastHitLocation = this.getTargetLocation(player) ?? this.lastHitLocation;
    }
  }

  updateIdleState(enemySettings) {
    this.setCurrentState(ENEMY_STATES.IDLE);
    this.setVelocityX(0);
    this.startPatrolTween(enemySettings, { mode: 'patrol' });
  }

  updateChaseState(player, enemySettings) {
    this.stopPatrolTween();
    this.setCurrentState(ENEMY_STATES.CHASE);
    const targetLocation = this.getTargetLocation(player);
    if (!targetLocation) {
      this.setVelocityX(0);
      return;
    }

    const currentX = this.body?.center?.x ?? this.x;
    const deltaX = targetLocation.x - currentX;
    const direction = Math.abs(deltaX) <= 4 ? 0 : Math.sign(deltaX);
    if (direction !== 0) {
      this.patrolDirection = direction;
    }
    this.applyFacing(this.patrolDirection > 0);
    this.setVelocityX((this.moveSpeed * this.patrolDirection) + this.knockbackVelocityX);
    this.handleObstacleAvoidance(enemySettings);
  }

  updateChaseSearchState(enemySettings) {
    this.stopPatrolTween();
    this.setCurrentState(ENEMY_STATES.CHASE);
    const targetLocation = this.lastHitLocation;
    if (!targetLocation || !Number.isFinite(targetLocation.x)) {
      this.setVelocityX(0);
      return;
    }

    const currentX = this.body?.center?.x ?? this.x;
    const deltaX = targetLocation.x - currentX;
    if (Math.abs(deltaX) <= 6) {
      this.setVelocityX(0);
      return;
    }

    this.patrolDirection = Math.sign(deltaX);
    this.applyFacing(this.patrolDirection > 0);
    this.setVelocityX((this.moveSpeed * this.patrolDirection) + this.knockbackVelocityX);
    this.handleObstacleAvoidance(enemySettings);
  }

  updateCooldownState(player) {
    this.stopPatrolTween();
    this.setCurrentState(ENEMY_STATES.COOLDOWN);
    this.setVelocityX(0);
    const targetLocation = this.getTargetLocation(player);
    if (targetLocation) {
      this.patrolDirection = targetLocation.x >= (this.body?.center?.x ?? this.x) ? 1 : -1;
      this.applyFacing(this.patrolDirection > 0);
    }
  }

  updateReturnState(enemySettings) {
    this.setCurrentState(ENEMY_STATES.RETURN);
    this.setVelocityX(0);
    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    const isOutsidePatrolBounds = this.x < safePatrolBounds.min || this.x > safePatrolBounds.max;
    this.startPatrolTween(enemySettings, { mode: isOutsidePatrolBounds ? 'returnToBounds' : 'patrol' });
  }

  getTargetLocation(target) {
    const targetX = target?.body?.center?.x ?? target?.x ?? this.lastHitLocation?.x;
    const targetY = target?.body?.center?.y ?? target?.y ?? this.lastHitLocation?.y ?? this.y;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      return null;
    }

    return { x: targetX, y: targetY };
  }

  applyFacing(flipX) {
    this.flipX = flipX;
    this.body.setOffset(flipX ? this.bodyOffsets.right : this.bodyOffsets.left, this.bodyOffsets.y);
  }

  applyKnockback(knockbackVelocityX, knockbackVelocityY, knockbackVelocityClampX = 420) {
    const sameDirection = Math.sign(this.knockbackVelocityX) === Math.sign(knockbackVelocityX);
    const nextKnockbackVelocityX = sameDirection
      ? this.knockbackVelocityX + knockbackVelocityX
      : knockbackVelocityX;
    this.knockbackVelocityX = Phaser.Math.Clamp(nextKnockbackVelocityX, -knockbackVelocityClampX, knockbackVelocityClampX);

    if (typeof knockbackVelocityY === 'number') {
      const nextKnockbackVelocityY = Math.min(this.body?.velocity?.y ?? 0, knockbackVelocityY);
      this.setVelocityY(nextKnockbackVelocityY);
    }

    if (this.isAttacking) {
      this.cancelAttack();
    }
  }

  provoke(target = null) {
    const currentTime = this.scene.time.now;
    this.lastDetectedPlayerAt = currentTime;
    this.lastHitLocation = this.getTargetLocation(target) ?? this.lastHitLocation;
    this.isPlayerDetected = Boolean(target?.active && !target?.isDead);
  }

  handleChaseZoneOverlap() {}

  handleAttackZoneOverlap() {}

  setLastHitLocation(location) {
    if (!location || !Number.isFinite(location.x) || !Number.isFinite(location.y)) {
      return;
    }

    this.lastHitLocation = { x: location.x, y: location.y };
  }

  getSafePatrolBounds(enemySettings) {
    const padding = enemySettings?.patrolEdgePadding ?? 0;
    const min = this.patrolMinX + padding;
    const max = this.patrolMaxX - padding;
    return min >= max ? { min: this.patrolMinX, max: this.patrolMaxX } : { min, max };
  }

  reverseDirection(reason, enemySettings) {
    const currentTime = this.scene.time.now;
    const turnCooldownMs = enemySettings?.obstacleTurnCooldownMs ?? 0;
    if ((currentTime - this.lastObstacleTurnAt) < turnCooldownMs) {
      return false;
    }

    this.lastObstacleTurnAt = currentTime;
    this.patrolDirection *= -1;

    const nudgeDistance = enemySettings?.obstacleNudgeDistance ?? 0;
    if (reason === 'left-wall') {
      this.x += nudgeDistance;
    } else if (reason === 'right-wall') {
      this.x -= nudgeDistance;
    }

    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    this.x = Phaser.Math.Clamp(this.x, safePatrolBounds.min, safePatrolBounds.max);
    this.applyFacing(this.patrolDirection > 0);
    this.body?.updateFromGameObject();
    return true;
  }

  isPlayerWithinAttackReach(player) {
    if (!player?.body || !this.body) {
      return false;
    }

    const horizontalDistance = Math.abs(player.body.center.x - this.body.center.x);
    const verticalDistance = Math.abs(player.body.center.y - this.body.center.y);
    return horizontalDistance <= (this.combatProfile.attackRange?.horizontal ?? 0)
      && verticalDistance <= (this.combatProfile.attackRange?.vertical ?? Infinity);
  }

  startAttack(player, currentTime = this.scene.time.now) {
    if (!player?.active || player?.isDead) {
      return;
    }

    this.stopPatrolTween();
    this.isAttacking = true;
    this.attackHasDealtDamage = false;
    this.activeProjectile = null;
    this.lastAttackStartedAt = currentTime;
    this.attackCooldownEndsAt = currentTime + this.attackCooldown;
    this.setCurrentState(ENEMY_STATES.ATTACK);
    this.setVelocityX(0);
    this.activeAttackAnimationKey = this.getNextAttackAnimationKey();

    const targetX = player.body?.center?.x ?? player.x ?? this.x;
    this.patrolDirection = targetX >= (this.body?.center?.x ?? this.x) ? 1 : -1;
    this.applyFacing(this.patrolDirection > 0);
    this.attackHitBox.body.enable = false;
    this.projectileHitBox.body.enable = false;
    this.anims.play(this.activeAttackAnimationKey, true);
  }

  cancelAttack() {
    this.isAttacking = false;
    this.attackHasDealtDamage = false;
    if (!this.activeProjectile) {
      this.attackHitBox.body.enable = false;
      this.projectileHitBox.body.enable = false;
    }
    this.activeAttackAnimationKey = null;
  }

  handleAnimationComplete(animation) {
    if (!this.isAttackAnimationKey(animation?.key)) {
      return;
    }

    this.cancelAttack();
    this.advanceAttackPattern();
    if (this.isPlayerDetected && this.isPlayerInAttackRange) {
      this.setCurrentState(ENEMY_STATES.COOLDOWN);
      return;
    }

    if (this.isPlayerDetected) {
      this.setCurrentState(ENEMY_STATES.CHASE);
      return;
    }

    this.setCurrentState(ENEMY_STATES.RETURN);
  }

  resumeMovementState() {
    if (this.isDead || this.isHurting || this.isAttacking) {
      return;
    }

    if (this.isPlayerDetected) {
      this.setCurrentState(this.isPlayerInAttackRange ? ENEMY_STATES.COOLDOWN : ENEMY_STATES.CHASE);
      return;
    }

    if (this.isWithinDetectionGrace()) {
      this.setCurrentState(ENEMY_STATES.CHASE);
      return;
    }

    this.setCurrentState(ENEMY_STATES.RETURN);
  }

  getPreferredAnimationKey() {
    if (this.isHurting) {
      return this.animationKeys.hurt;
    }

    if ((this.currentState === ENEMY_STATES.ATTACK || this.isAttacking) && this.activeAttackAnimationKey) {
      return this.activeAttackAnimationKey;
    }

    if ((this.currentState === ENEMY_STATES.IDLE || this.currentState === ENEMY_STATES.COOLDOWN) && !this.isMovingHorizontally) {
      return this.animationKeys.idle;
    }

    return this.animationKeys.walk;
  }

  getCurrentAttackHitboxConfig() {
    const attackHitboxConfig = this.combatProfile.attackHitbox ?? {};
    const currentAnimationKey = this.activeProjectile?.animationKey
      ?? this.activeAttackAnimationKey
      ?? this.anims.currentAnim?.key
      ?? null;
    const animationConfig = currentAnimationKey
      ? attackHitboxConfig.animationConfigs?.[currentAnimationKey] ?? null
      : null;
    const frameIndex = this.anims.currentFrame?.index ?? -1;
    const resolvedHitboxConfig = {
      ...attackHitboxConfig,
      ...(animationConfig ?? {}),
    };
    const frameConfig = Array.isArray(resolvedHitboxConfig.frameHitboxes)
      ? resolvedHitboxConfig.frameHitboxes.find(({ start, end }) => frameIndex >= start && frameIndex <= end)
      : null;

    return {
      ...resolvedHitboxConfig,
      ...(frameConfig ?? {}),
    };
  }

  isCurrentAttackFrameActive(activeFrames = []) {
    const frameIndex = this.anims.currentFrame?.index ?? -1;
    return activeFrames.some(({ start, end }) => frameIndex >= start && frameIndex <= end);
  }

  updateAttackHitbox() {
    if (!this.attackHitBox?.body || !this.projectileHitBox?.body) {
      return;
    }

    const hitboxConfig = this.getCurrentAttackHitboxConfig();
    if (hitboxConfig.projectile) {
      this.attackHitBox.body.enable = false;
      this.attackHitBox.setVisible(false);
      this.updateProjectileAttackHitbox(hitboxConfig);
      return;
    }

    this.projectileHitBox.body.enable = false;
    this.projectileHitBox.setVisible(false);

    const directionalOffsetX = this.getDirectionalAttackOffsetX(hitboxConfig.offsetX ?? 0);
    this.attackHitBox.follow(
      this,
      directionalOffsetX,
      hitboxConfig.offsetY,
    );

    if (
      this.attackHitBox.width !== hitboxConfig.width
      || this.attackHitBox.height !== hitboxConfig.height
    ) {
      this.attackHitBox.width = hitboxConfig.width;
      this.attackHitBox.height = hitboxConfig.height;
      this.attackHitBox.body.setSize(hitboxConfig.width, hitboxConfig.height, true);
    }

    this.attackHitBox.body.enable = this.isAttacking
      && !this.attackHasDealtDamage
      && this.isCurrentAttackFrameActive(hitboxConfig.activeFrames ?? []);
    this.attackHitBox.setVisible(this.debugEnabled && Boolean(this.attackHitBox.body.enable));
  }

  canDealAttackDamage() {
    return (this.isAttacking || Boolean(this.activeProjectile))
      && !this.attackHasDealtDamage
      && (
        Boolean(this.attackHitBox?.body?.enable)
        || Boolean(this.projectileHitBox?.body?.enable)
      );
  }

  markAttackDamageDealt() {
    this.attackHasDealtDamage = true;
    this.attackHitBox.body.enable = false;
    this.projectileHitBox.body.enable = false;
    this.activeProjectile = null;
  }

  handleObstacleAvoidance(enemySettings) {
    if (!this.body || this.isAttacking || this.patrolTween) {
      return;
    }

    if (this.body.blocked.left) {
      this.reverseDirection('left-wall', enemySettings);
      return;
    }

    if (this.body.blocked.right) {
      this.reverseDirection('right-wall', enemySettings);
      return;
    }
  }

  setPatrolBounds(minX, maxX) {
    this.patrolMinX = Math.min(minX, maxX);
    this.patrolMaxX = Math.max(minX, maxX);
    this.homeX = Phaser.Math.Clamp(this.homeX, this.patrolMinX, this.patrolMaxX);
    this.x = Phaser.Math.Clamp(this.x, this.patrolMinX, this.patrolMaxX);
    this.patrolDirection = this.x >= this.patrolMaxX ? -1 : 1;
    this.lastPatrolTweenX = this.x;
  }

  updateDetectionZones() {
    const centerX = this.body?.center?.x ?? (this.x + (this.width / 2));
    const centerY = this.body?.center?.y ?? (this.y + (this.height / 2));
    this.detectionZone.setPosition(centerX, centerY);
    this.detectionZone.body?.updateFromGameObject();
    this.attackDetectionZone.setPosition(centerX, centerY);
    this.attackDetectionZone.body?.updateFromGameObject();
    this.attackHitBox.body?.updateFromGameObject();
    this.projectileHitBox.body?.updateFromGameObject();
  }

  updateProjectileAttackHitbox(hitboxConfig) {
    const frameIsActive = this.isCurrentAttackFrameActive(hitboxConfig.activeFrames ?? []);
    const launchOffsetX = this.getDirectionalAttackOffsetX(hitboxConfig.offsetX ?? 0);
    const launchX = (this.x ?? 0) + launchOffsetX;
    const launchY = (this.y ?? 0) + hitboxConfig.offsetY;

    if (!this.activeProjectile && this.isAttacking && frameIsActive && !this.attackHasDealtDamage) {
      const targetLocation = this.lastHitLocation ?? { x: launchX, y: launchY };
      const deltaX = targetLocation.x - launchX;
      const deltaY = targetLocation.y - launchY;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const projectileSpeed = hitboxConfig.projectileSpeed ?? 240;
      this.activeProjectile = {
        animationKey: this.activeAttackAnimationKey,
        x: launchX,
        y: launchY,
        velocityX: (deltaX / distance) * projectileSpeed,
        velocityY: (deltaY / distance) * projectileSpeed,
        maxDistance: hitboxConfig.projectileMaxDistance ?? 220,
        traveledDistance: 0,
      };
    }

    if (!this.activeProjectile) {
      this.projectileHitBox.body.enable = false;
      this.projectileHitBox.setVisible(false);
      return;
    }

    const deltaSeconds = Math.max(0.001, (this.scene.game.loop.delta ?? 16.67) / 1000);
    this.activeProjectile.x += this.activeProjectile.velocityX * deltaSeconds;
    this.activeProjectile.y += this.activeProjectile.velocityY * deltaSeconds;
    this.activeProjectile.traveledDistance += Math.hypot(
      this.activeProjectile.velocityX * deltaSeconds,
      this.activeProjectile.velocityY * deltaSeconds,
    );

    if (this.activeProjectile.traveledDistance >= this.activeProjectile.maxDistance) {
      this.activeProjectile = null;
      this.projectileHitBox.body.enable = false;
      this.projectileHitBox.setVisible(false);
      return;
    }

    if (
      this.projectileHitBox.width !== hitboxConfig.width
      || this.projectileHitBox.height !== hitboxConfig.height
    ) {
      this.projectileHitBox.width = hitboxConfig.width;
      this.projectileHitBox.height = hitboxConfig.height;
      this.projectileHitBox.body.setSize(hitboxConfig.width, hitboxConfig.height, true);
    }

    this.projectileHitBox.setPosition(this.activeProjectile.x, this.activeProjectile.y);
    this.projectileHitBox.body.updateFromGameObject();
    this.projectileHitBox.body.enable = !this.attackHasDealtDamage;
    this.projectileHitBox.setVisible(this.debugEnabled && Boolean(this.projectileHitBox.body.enable));
  }

  canDetectPlayerInChaseZone(player) {
    if (!player?.playerHurtBox || !this.detectionZone) {
      return false;
    }

    return Phaser.Geom.Intersects.RectangleToRectangle(this.detectionZone.getBounds(), player.playerHurtBox.getBounds());
  }

  canDetectPlayerInAttackZone(player) {
    if (!player?.playerHurtBox || !this.attackDetectionZone) {
      return false;
    }

    return Phaser.Geom.Intersects.RectangleToRectangle(this.attackDetectionZone.getBounds(), player.playerHurtBox.getBounds());
  }

  isWithinDetectionGrace(currentTime = this.scene.time.now) {
    return (currentTime - this.lastDetectedPlayerAt) <= this.detectionLoseSightGraceMs;
  }

  isAtHomePosition() {
    return Math.abs((this.body?.center?.x ?? this.x) - this.homeX) <= 6;
  }

  setCurrentState(nextState) {
    this.currentState = nextState;
  }

  getDirectionalAttackOffsetX(offsetX = 0) {
    if (!this.flipX) {
      return offsetX;
    }

    const spriteWidth = this.displayWidth || this.width || 0;
    return spriteWidth - offsetX;
  }

  getNextAttackAnimationKey() {
    const attackSlot = this.attackPattern[this.attackPatternIndex] ?? 'attack';
    return this.animationKeys[attackSlot] ?? this.animationKeys.attack;
  }

  advanceAttackPattern() {
    this.attackPatternIndex = (this.attackPatternIndex + 1) % this.attackPattern.length;
  }

  isAttackAnimationKey(animationKey) {
    return animationKey === this.animationKeys.attack
      || animationKey === this.animationKeys.attack2
      || animationKey === this.animationKeys.attack3;
  }

  startPatrolTween(enemySettings, options = {}) {
    if (this.isPlayerDetected || this.isAttacking || this.isHurting) {
      return;
    }

    const tweenMode = options.mode ?? 'patrol';
    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    let targetX;
    if (tweenMode === 'returnToBounds' && this.x < safePatrolBounds.min) {
      this.patrolDirection = 1;
      targetX = safePatrolBounds.min;
    } else if (tweenMode === 'returnToBounds' && this.x > safePatrolBounds.max) {
      this.patrolDirection = -1;
      targetX = safePatrolBounds.max;
    } else {
      targetX = this.patrolDirection > 0 ? safePatrolBounds.max : safePatrolBounds.min;
    }

    if (Math.abs(targetX - this.x) <= 2) {
      this.patrolDirection *= -1;
      targetX = this.patrolDirection > 0 ? safePatrolBounds.max : safePatrolBounds.min;
    }

    if (
      this.patrolTween
      && this.patrolTweenMode === tweenMode
      && this.patrolTweenTargetX !== null
      && Math.abs(this.patrolTweenTargetX - targetX) <= 2
    ) {
      return;
    }

    this.stopPatrolTween();
    this.patrolTweenMode = tweenMode;
    this.patrolTweenTargetX = targetX;
    this.lastPatrolTweenX = this.x;
    this.applyFacing(this.patrolDirection > 0);

    const distance = Math.abs(targetX - this.x);
    const tweenSpeed = tweenMode === 'returnToBounds'
      ? Math.max(this.returnSpeed, 1)
      : Math.max(this.patrolSpeed, 1);
    const tweenDuration = Math.max(
      200,
      Math.round((distance / tweenSpeed) * 1000),
      enemySettings?.repositionDurationMs ?? 0,
    );

    this.patrolTween = this.scene.tweens.add({
      targets: this,
      x: targetX,
      duration: tweenDuration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const deltaX = this.x - this.lastPatrolTweenX;
        if (Math.abs(deltaX) > 0.05) {
          this.patrolDirection = deltaX > 0 ? 1 : -1;
          this.applyFacing(this.patrolDirection > 0);
        }
        this.lastPatrolTweenX = this.x;
        this.body?.updateFromGameObject();

        if (this.isPlayerDetected || this.isAttacking || this.isHurting) {
          this.stopPatrolTween();
        }
      },
      onComplete: () => {
        const completedMode = this.patrolTweenMode;
        this.patrolTween = null;
        this.patrolTweenTargetX = null;
        this.patrolTweenMode = null;
        if (completedMode === 'returnToBounds') {
          if (!this.isPlayerDetected && !this.isAttacking && !this.isHurting) {
            this.setCurrentState(ENEMY_STATES.IDLE);
            this.startPatrolTween(enemySettings, { mode: 'patrol' });
          }
          return;
        }

        this.patrolDirection *= -1;
        if (!this.isPlayerDetected && !this.isAttacking && !this.isHurting) {
          this.startPatrolTween(enemySettings, { mode: 'patrol' });
        }
      },
      onStop: () => {
        this.patrolTween = null;
        this.patrolTweenTargetX = null;
        this.patrolTweenMode = null;
      },
    });
  }

  stopPatrolTween() {
    if (!this.patrolTween) {
      return;
    }

    this.patrolTween.stop();
    this.patrolTween = null;
    this.patrolTweenTargetX = null;
    this.patrolTweenMode = null;
    this.body?.updateFromGameObject();
  }

  updateKnockback() {
    if (Math.abs(this.knockbackVelocityX) < 6) {
      this.knockbackVelocityX = 0;
      return;
    }

    this.knockbackVelocityX *= this.knockbackDamping;
  }

  updateMovementMetrics() {
    const velocityX = Math.abs(this.body?.velocity?.x ?? 0);
    const deltaX = Math.abs(this.x - this.lastFrameX);
    this.isMovingHorizontally = velocityX > 8 || deltaX > 0.35;
    this.lastFrameX = this.x;
  }

  updateDebugVisuals() {
    this.detectionZone.setVisible(this.debugEnabled);
    this.attackDetectionZone.setVisible(this.debugEnabled);
    this.attackHitBox.setVisible(this.debugEnabled && Boolean(this.attackHitBox.body?.enable));
    this.projectileHitBox.setVisible(this.debugEnabled && Boolean(this.projectileHitBox.body?.enable));

    if (!this.stateLabel) {
      return;
    }

    const centerX = this.body?.center?.x ?? this.x;
    const topY = this.body?.top ?? this.y;
    this.stateLabel.setPosition(centerX, topY - 12);
    this.stateLabel.setText(this.currentState.toUpperCase());
    this.stateLabel.setVisible(this.debugEnabled);
  }
}
