import Hitbox from '../combat/Hitbox.js';
import Character from './Character.js';

/**
 * Basic patrol enemy used by the current world scene.
 * `EnemyManager` owns this entity's lifecycle, while the class itself owns
 * patrol movement, facing, knockback state, and local helper hitboxes.
 */
export default class Enemy extends Character {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);

    this.setOrigin(0, 0);
    this.setDepth(10);
    this.setScrollFactor(1);

    this.patrolStartX = x;
    this.patrolEndX = x;
    this.patrolMinX = x - 120;
    this.patrolMaxX = x + 120;
    this.patrolSpeed = 55.55;
    this.patrolDirection = 1;
    this.patrolRangeWidth = this.patrolMaxX - this.patrolMinX;
    this.knockbackVelocityX = 0;
    this.knockbackDamping = 0.84;
    this.knockbackFacingLock = null;
    this.knockbackFacingThreshold = 6;
    this.isChasingPlayer = false;
    this.isRepositioning = false;
    this.repositionTween = null;
    this.tweenTargetX = null;
    this.savedTweenOriginX = x;
    this.discardedTweenTargetX = null;
    this.hitChaseTarget = null;
    this.hitChaseEndAt = -Infinity;
    this.lastHitLocation = null;
    this.lastProvokedAt = -Infinity;
    this.lastAttackAt = -Infinity;
    this.lastObstacleTurnAt = -Infinity;
    this.bodyOffsets = { left: 30, right: 0, y: 7 };
    this.animationKeys = { walk: texture, idle: texture, hurt: texture, attack: texture, death: texture };

    this.detectionZone = new Hitbox(scene, this.x, this.y, 120, 100);
    this.enemyHitBox = new Hitbox(scene, this.x, this.y, 65, 30);
  }

  /**
   * Handles patrol movement, knockback decay, and facing updates.
   */
  updateMovement(enemySettings) {
    const currentTime = this.scene.time.now;
    if (this.isChasingPlayer && currentTime >= this.hitChaseEndAt) {
      this.finishHitChase(enemySettings);
    }

    if (this.isRepositioning) {
      this.setVelocityX(0);
      return;
    }

    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    const isUnderHitKnockback = this.isHurting || Math.abs(this.knockbackVelocityX) >= this.knockbackFacingThreshold;
    let desiredVelocityX = this.patrolSpeed * this.patrolDirection;

    if (this.isChasingPlayer) {
      const chaseTargetLocation = this.getHitChaseTargetLocation();
      if (chaseTargetLocation) {
        this.lastHitLocation = chaseTargetLocation;
        if (Math.abs(chaseTargetLocation.x - this.x) > 4) {
          this.patrolDirection = chaseTargetLocation.x >= this.x ? 1 : -1;
        }
      }

      desiredVelocityX = this.isHurting
        ? 0
        : (enemySettings?.chaseSpeed ?? this.patrolSpeed);
    } else {
      if (!isUnderHitKnockback && this.x <= safePatrolBounds.min) {
        this.x = safePatrolBounds.min;
        this.patrolDirection = 1;
      } else if (!isUnderHitKnockback && this.x >= safePatrolBounds.max) {
        this.x = safePatrolBounds.max;
        this.patrolDirection = -1;
      }

      desiredVelocityX = this.patrolSpeed;
    }

    this.setVelocityX((desiredVelocityX * this.patrolDirection) + this.knockbackVelocityX);
    this.handleObstacleAvoidance(enemySettings, isUnderHitKnockback);

    if (Math.abs(this.knockbackVelocityX) < 6) {
      this.knockbackVelocityX = 0;
    } else {
      this.knockbackVelocityX *= this.knockbackDamping;
    }
    this.applyFacing(this.patrolDirection > 0);
  }

  /**
   * Updates sprite orientation and body offset to match facing direction.
   */
  applyFacing(flipX) {
    this.flipX = flipX;
    this.body.setOffset(flipX ? this.bodyOffsets.right : this.bodyOffsets.left, this.bodyOffsets.y);
  }

  /**
   * Applies horizontal and optional vertical knockback.
   */
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
  }

  /**
   * Marks the enemy as aggroed so it chases the player that attacked it.
   */
  provoke(target = null, enemySettings = null) {
    this.lastProvokedAt = this.scene.time.now;
    this.lastAttackAt = this.scene.time.now;
    this.isChasingPlayer = true;
    this.hitChaseTarget = target;
    this.hitChaseEndAt = this.scene.time.now + (enemySettings?.hitChaseDurationMs ?? enemySettings?.disengageDelayMs ?? 0);
    if (this.repositionTween && Number.isFinite(this.tweenTargetX)) {
      this.discardedTweenTargetX = this.tweenTargetX;
    }
    this.stopRepositionTween();

    const chaseTargetLocation = this.getHitChaseTargetLocation();
    if (chaseTargetLocation) {
      this.lastHitLocation = chaseTargetLocation;
    }
  }

  /**
   * Stores the player's most recent hit location as the next chase target.
   */
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

    if (min >= max) {
      return {
        min: this.patrolMinX,
        max: this.patrolMaxX,
      };
    }

    return { min, max };
  }

  reverseDirection(reason, enemySettings) {
    const currentTime = this.scene.time.now;
    const turnCooldownMs = enemySettings?.obstacleTurnCooldownMs ?? 0;
    if ((currentTime - this.lastObstacleTurnAt) < turnCooldownMs) {
      return false;
    }

    this.lastObstacleTurnAt = currentTime;
    this.patrolDirection *= -1;
    this.knockbackVelocityX *= 0.45;

    const nudgeDistance = enemySettings?.obstacleNudgeDistance ?? 0;
    if (reason === 'left-wall') {
      this.x += nudgeDistance;
    } else if (reason === 'right-wall') {
      this.x -= nudgeDistance;
    } else if (reason === 'platform-edge') {
      this.x += this.patrolDirection > 0 ? nudgeDistance : -nudgeDistance;
    }

    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    this.x = Phaser.Math.Clamp(this.x, safePatrolBounds.min, safePatrolBounds.max);
    this.applyFacing(this.patrolDirection > 0);
    this.body?.updateFromGameObject();
    if (this.isRepositioning) {
      this.repositionTween?.stop();
    }
    return true;
  }

  stopRepositionTween() {
    this.isRepositioning = false;
    this.tweenTargetX = null;
    if (this.repositionTween) {
      this.repositionTween.stop();
      return;
    }

    this.repositionTween = null;
  }

  getHitChaseTargetLocation() {
    const targetX = this.hitChaseTarget?.body?.center?.x ?? this.hitChaseTarget?.x ?? this.lastHitLocation?.x;
    const targetY = this.hitChaseTarget?.body?.center?.y ?? this.hitChaseTarget?.y ?? this.lastHitLocation?.y ?? this.y;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      return null;
    }

    return { x: targetX, y: targetY };
  }

  finishHitChase(enemySettings) {
    this.isChasingPlayer = false;
    this.hitChaseTarget = null;
    this.hitChaseEndAt = -Infinity;
    const currentTweenStartX = this.getClampedTweenTargetX(this.x, enemySettings);
    this.reanchorPatrolBounds(currentTweenStartX, enemySettings);
    this.savedTweenOriginX = currentTweenStartX;
    this.tweenTargetX = null;
    this.lastHitLocation = {
      x: currentTweenStartX,
      y: this.y,
    };
    this.beginRepositionFromCurrentLocation(enemySettings, currentTweenStartX);
  }

  handleObstacleAvoidance(enemySettings, isUnderHitKnockback = false) {
    if (!this.body) {
      return;
    }

    if (isUnderHitKnockback) {
      return;
    }

    const blockedLeft = this.body.blocked.left;
    const blockedRight = this.body.blocked.right;
    const isLeavingPlatform = !this.body.blocked.down && this.body.velocity.y >= 0;

    if (blockedLeft) {
      this.reverseDirection('left-wall', enemySettings);
      return;
    }

    if (blockedRight) {
      this.reverseDirection('right-wall', enemySettings);
      return;
    }

    if (isLeavingPlatform) {
      this.reverseDirection('platform-edge', enemySettings);
    }
  }

  /**
   * Tweens the enemy to a fresh random point in its patrol lane after combat ends.
   */
  beginReposition(enemySettings) {
    this.isChasingPlayer = false;
    this.hitChaseTarget = null;
    this.hitChaseEndAt = -Infinity;
    this.savedTweenOriginX = this.getClampedTweenTargetX(this.x, enemySettings);
    this.beginRepositionFromCurrentLocation(enemySettings, this.savedTweenOriginX);
  }

  beginRepositionFromCurrentLocation(enemySettings, startX = this.x) {
    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    const resolvedStartX = this.getClampedTweenTargetX(startX, enemySettings);
    this.savedTweenOriginX = resolvedStartX;
    let targetX = resolvedStartX;
    let attempts = 0;

    while (
      attempts < 10
      && (
        Math.abs(targetX - resolvedStartX) < 24
        || (Number.isFinite(this.discardedTweenTargetX) && Math.abs(targetX - this.discardedTweenTargetX) <= 6)
      )
    ) {
      targetX = Phaser.Math.Between(Math.round(safePatrolBounds.min), Math.round(safePatrolBounds.max));
      attempts += 1;
    }

    if (Number.isFinite(this.discardedTweenTargetX) && Math.abs(targetX - this.discardedTweenTargetX) <= 6) {
      targetX = resolvedStartX;
    }

    this.beginTweenToLocation(targetX, enemySettings, () => {
      this.savedTweenOriginX = this.getClampedTweenTargetX(this.x, enemySettings);
      this.discardedTweenTargetX = null;
      this.patrolDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
      this.applyFacing(this.patrolDirection > 0);
    });
  }

  /**
   * Starts or retargets the current tween movement using a world X destination.
   */
  beginTweenToLocation(targetX, enemySettings, onComplete = null) {
    const resolvedTargetX = this.getClampedTweenTargetX(targetX, enemySettings);
    if (!Number.isFinite(resolvedTargetX)) {
      return;
    }

    if (this.repositionTween && this.tweenTargetX !== null && Math.abs(this.tweenTargetX - resolvedTargetX) <= 2) {
      return;
    }

    this.isRepositioning = true;
    this.tweenTargetX = resolvedTargetX;
    this.setVelocity(0, 0);
    if (Math.abs(resolvedTargetX - this.x) > 1) {
      this.patrolDirection = resolvedTargetX >= this.x ? 1 : -1;
      this.applyFacing(this.patrolDirection > 0);
    }
    const distance = Math.abs(resolvedTargetX - this.x);
    const chaseSpeed = enemySettings?.chaseSpeed ?? 1;
    const tweenDuration = Math.max(
      180,
      Math.round((distance / Math.max(chaseSpeed, 1)) * 1000),
      enemySettings?.repositionDurationMs ?? 0,
    );

    this.stopRepositionTween();
    this.repositionTween = this.scene.tweens.add({
      targets: this,
      x: resolvedTargetX,
      duration: tweenDuration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.body?.updateFromGameObject();
        this.handleObstacleAvoidance(enemySettings);
        if (!this.isRepositioning) {
          this.repositionTween?.stop();
        }
      },
      onComplete: () => {
        this.repositionTween = null;
        this.isRepositioning = false;
        this.tweenTargetX = null;
        onComplete?.();
      },
      onStop: () => {
        this.repositionTween = null;
        this.isRepositioning = false;
        this.tweenTargetX = null;
      },
    });
  }

  /**
   * Returns the safe X destination used by tween-based enemy movement.
   */
  getClampedTweenTargetX(targetX, enemySettings) {
    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    return Phaser.Math.Clamp(targetX, safePatrolBounds.min, safePatrolBounds.max);
  }

  /**
   * Sets the movement lane for an enemy so it stays on its assigned platform.
   */
  setPatrolBounds(minX, maxX) {
    this.patrolMinX = Math.min(minX, maxX);
    this.patrolMaxX = Math.max(minX, maxX);
    this.patrolRangeWidth = Math.max(0, this.patrolMaxX - this.patrolMinX);
    this.patrolStartX = this.patrolMinX;
    this.patrolEndX = this.patrolMaxX;
    const safePatrolBounds = this.getSafePatrolBounds();
    this.x = Phaser.Math.Clamp(this.x, safePatrolBounds.min, safePatrolBounds.max);
    this.patrolDirection = this.x >= safePatrolBounds.max ? -1 : 1;
  }

  reanchorPatrolBounds(centerX, enemySettings) {
    const rangeWidth = Math.max(48, this.patrolRangeWidth || (this.patrolMaxX - this.patrolMinX) || 240);
    const halfRange = rangeWidth / 2;
    const worldBounds = this.scene.physics?.world?.bounds;
    const padding = enemySettings?.patrolEdgePadding ?? 0;
    const minWorldX = Number.isFinite(worldBounds?.x) ? worldBounds.x + padding : -Infinity;
    const maxWorldX = Number.isFinite(worldBounds?.right) ? worldBounds.right - padding : Infinity;

    let nextMinX = centerX - halfRange;
    let nextMaxX = centerX + halfRange;

    if (nextMinX < minWorldX) {
      nextMaxX += minWorldX - nextMinX;
      nextMinX = minWorldX;
    }

    if (nextMaxX > maxWorldX) {
      nextMinX -= nextMaxX - maxWorldX;
      nextMaxX = maxWorldX;
    }

    this.patrolMinX = Math.min(nextMinX, nextMaxX);
    this.patrolMaxX = Math.max(nextMinX, nextMaxX);
    this.patrolStartX = this.patrolMinX;
    this.patrolEndX = this.patrolMaxX;
  }

  /**
   * Keeps detection and attack hitboxes aligned to the enemy.
   */
  updateDetectionZones() {
    if (this.flipX) {
      this.detectionZone.follow(this, 60, 50);
      this.enemyHitBox.follow(this, 90, 90);
    } else {
      this.detectionZone.follow(this, 50, 50);
      this.enemyHitBox.follow(this, 20, 90);
    }

    this.enemyHitBox.setDepth(10);
    this.detectionZone.setDepth(10);
  }

  /**
   * Returns true when the player is inside the detection zone.
   * The manager calls this during its per-frame update loop.
   */
  canDetectPlayer(player) {
    return this.detectionZone.getBounds().contains(player.x, player.y);
  }
}
