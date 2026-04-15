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
    this.knockbackVelocityX = 0;
    this.knockbackDamping = 0.84;
    this.knockbackFacingLock = null;
    this.knockbackFacingThreshold = 6;
    this.isChasingPlayer = false;
    this.isRepositioning = false;
    this.repositionTween = null;
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
    if (this.isRepositioning) {
      this.setVelocityX(0);
      return;
    }

    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    const isUnderHitKnockback = this.isHurting || Math.abs(this.knockbackVelocityX) >= this.knockbackFacingThreshold;

    if (!isUnderHitKnockback && this.x <= safePatrolBounds.min) {
      this.x = safePatrolBounds.min;
      this.patrolDirection = 1;
    } else if (!isUnderHitKnockback && this.x >= safePatrolBounds.max) {
      this.x = safePatrolBounds.max;
      this.patrolDirection = -1;
    }

    const patrolVelocityX = this.patrolSpeed * this.patrolDirection;
    this.setVelocityX(patrolVelocityX + this.knockbackVelocityX);
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
  applyKnockback(knockbackVelocityX, knockbackVelocityY) {
    const sameDirection = Math.sign(this.knockbackVelocityX) === Math.sign(knockbackVelocityX);
    const nextKnockbackVelocityX = sameDirection
      ? this.knockbackVelocityX + knockbackVelocityX
      : knockbackVelocityX;
    this.knockbackVelocityX = Phaser.Math.Clamp(nextKnockbackVelocityX, -420, 420);

    if (typeof knockbackVelocityY === 'number') {
      const nextKnockbackVelocityY = Math.min(this.body?.velocity?.y ?? 0, knockbackVelocityY);
      this.setVelocityY(nextKnockbackVelocityY);
    }
  }

  /**
   * Marks the enemy as aggroed so it chases the player that attacked it.
   */
  provoke() {
    this.lastProvokedAt = this.scene.time.now;
    this.lastAttackAt = this.scene.time.now;
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
    if (this.isRepositioning) {
      return;
    }

    this.isChasingPlayer = false;
    this.isRepositioning = true;
    this.setVelocity(0, 0);
    const safePatrolBounds = this.getSafePatrolBounds(enemySettings);
    const targetX = Phaser.Math.Between(Math.round(safePatrolBounds.min), Math.round(safePatrolBounds.max));

    this.repositionTween?.stop();
    this.repositionTween = this.scene.tweens.add({
      targets: this,
      x: targetX,
      duration: enemySettings.repositionDurationMs,
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
        this.patrolDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        this.applyFacing(this.patrolDirection > 0);
      },
      onStop: () => {
        this.repositionTween = null;
        this.isRepositioning = false;
      },
    });
  }

  /**
   * Sets the movement lane for an enemy so it stays on its assigned platform.
   */
  setPatrolBounds(minX, maxX) {
    this.patrolMinX = Math.min(minX, maxX);
    this.patrolMaxX = Math.max(minX, maxX);
    this.patrolStartX = this.patrolMinX;
    this.patrolEndX = this.patrolMaxX;
    const safePatrolBounds = this.getSafePatrolBounds();
    this.x = Phaser.Math.Clamp(this.x, safePatrolBounds.min, safePatrolBounds.max);
    this.patrolDirection = this.x >= safePatrolBounds.max ? -1 : 1;
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
