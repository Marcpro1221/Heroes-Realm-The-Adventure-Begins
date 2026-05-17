import {
  ENEMY_ARCHETYPES,
  ENEMY_SETTINGS,
  ENEMY_TYPES,
  PLAYER_PROGRESS_SETTINGS,
} from '../constants/gameConstants.js';
import { gameState } from '../state/gameState.js';
import Enemy from '../entities/characters/Enemy.js';

/**
 * Owns enemy spawning, combat hooks, respawns, and enemy HUD elements.
 * `MainScene` creates one manager instance and then delegates all enemy
 * lifecycle work here so scene code can stay focused on orchestration.
 */
export default class EnemyManager {
  constructor(scene, playerAttackConfig, helpers) {
    this.scene = scene;
    this.playerAttackConfig = playerAttackConfig;
    this.helpers = helpers;
    this.activeEnemyCount = 0;
    this.enemyRespawnCounts = {};
  }

  /**
   * Queues the initial enemy spawns up to the configured cap.
   */
  scheduleEnemySpawns(enemyPositions) {
    enemyPositions.slice(0, ENEMY_SETTINGS.maxSpawns).forEach((enemyPos, index) => {
      // Startup is staggered so not every spawn location activates at the same moment.
      const startupDelay = ENEMY_SETTINGS.initialSpawnBaseDelayMs + (index * ENEMY_SETTINGS.initialSpawnStepMs);
      this.scene.time.delayedCall(startupDelay, () => {
        this.trySpawnEnemy({ ...enemyPos, spawnOrder: index });
      });
    });
  }

  /**
   * Spawns an enemy only when the active cap has not been reached.
   */
  trySpawnEnemy(enemyPos) {
    if (this.activeEnemyCount >= ENEMY_SETTINGS.maxSpawns) {
      return false;
    }

    return this.spawnEnemy(enemyPos);
  }

  /**
   * Creates one enemy instance and wires it into physics and combat.
   * This is where the enemy becomes connected to:
   * - world collisions from `MainScene`
   * - player attack hitboxes from `Player`
   * - shared groups stored in `gameState`
   */
  spawnEnemy(enemyPos) {
    const enemyType = enemyPos.enemyType ?? ENEMY_TYPES.MUSHROOM;
    const enemyConfig = ENEMY_ARCHETYPES[enemyType] ?? ENEMY_ARCHETYPES[ENEMY_TYPES.MUSHROOM];
    const spawnX = this.getSpawnX(enemyPos);
    if (spawnX === null) {
      return false;
    }
    const enemy = new Enemy(this.scene, spawnX, enemyPos.y, enemyConfig.textureKey);
    enemy.body.setSize(enemyConfig.bodySize.width, enemyConfig.bodySize.height, true);
    enemy.setScale(enemyConfig.scale);
    enemy.spawnPoint = { ...enemyPos };
    enemy.spawnPointKey = this.getSpawnPointKey(enemyPos);
    enemy.lockToPlatform = Boolean(enemyPos.lockToPlatform);
    enemy.enemyType = enemyType;
    enemy.enemyConfig = enemyConfig;
    enemy.animationKeys = enemyConfig.animationKeys;
    enemy.bodyOffsets = enemyConfig.bodyOffsets;
    enemy.patrolSpeed = enemyConfig.patrolSpeed ?? enemy.patrolSpeed;
    enemy.configureCombatProfile(enemyConfig.combatProfile);
    enemy.setPatrolBounds(
      enemyPos.patrolMinX ?? (enemyPos.x - 120),
      enemyPos.patrolMaxX ?? (enemyPos.x + 120),
    );
    enemy.x = spawnX;
    enemy.maxHp = enemyConfig.maxHp ?? ENEMY_SETTINGS.maxHp;
    enemy.currentHp = enemy.maxHp;
    enemy.defense = enemyConfig.defense ?? 0;
    enemy.enemyDamage = enemyConfig.contactDamageFixedMax ?? 10;
    enemy.isHurting = false;
    enemy.isDead = false;
    enemy.lastDamageByAttack = {};
    enemy.lastTintAt = 0;
    enemy.lastHitLocation = { x: enemy.x, y: enemy.y };
    enemy.hpBarWidth = 60;
    enemy.hpBarHeight = 8;
    enemy.hpBarOffsetY = enemyConfig.hpBarOffsetY ?? 18;
    enemy.hpBar = this.scene.add.graphics().setDepth(20);
    enemy.applyFacing(false);

    gameState.enemyGroup.add(enemy);
    this.activeEnemyCount += 1;

    this.scene.physics.add.collider(enemy, gameState.platforms);
    this.scene.physics.add.collider(enemy, gameState.movingPlatform);
    this.scene.physics.add.overlap(gameState.player.playerHurtBox, enemy.enemyHitBox, () => this.handleEnemyAttackHit(gameState.player, enemy), null, this);
    this.scene.physics.add.overlap(gameState.player.playerHurtBox, enemy.projectileHitBox, () => this.handleEnemyAttackHit(gameState.player, enemy), null, this);
    this.scene.physics.add.overlap(enemy, gameState.player.swordHitBox, () => this.damageEnemy(enemy, 'smash'), null, this);
    this.scene.physics.add.overlap(enemy, gameState.player.spinHitBox, () => this.damageEnemy(enemy, 'spinAttack'), null, this);
    this.scene.physics.add.overlap(enemy, gameState.player.thrustAttackHitBox, () => this.damageEnemy(enemy, 'thrust'), null, this);
    this.scene.physics.add.overlap(enemy, gameState.player.specialAttackHitBox, () => this.damageEnemy(enemy, 'specialAttack'), null, this);
    this.updateEnemyHpBar(enemy);
    return true;
  }

  /**
   * Updates every active enemy once per frame.
   */
  update() {
    const enemies = gameState.enemyGroup?.getChildren?.();
    if (!enemies?.length) {
      return;
    }

    enemies.forEach((enemy) => {
      // Skip removed or inactive enemies so the loop only touches valid objects.
      if (!enemy.active || enemy.isDead || !enemy.body || !enemy.detectionZone || !enemy.attackDetectionZone || !enemy.enemyHitBox) {
        return;
      }

      enemy.updateMovement(ENEMY_SETTINGS, gameState.player);
      enemy.updateDetectionZones();
      const nextAnimationKey = enemy.getPreferredAnimationKey?.() ?? enemy.animationKeys.walk;
      if (!enemy.isHurting || nextAnimationKey === enemy.animationKeys.hurt) {
        if (enemy.anims.currentAnim?.key !== nextAnimationKey) {
          enemy.anims.play(nextAnimationKey, true);
        }
      }
      this.updateEnemyHpBar(enemy);
    });
  }

  /**
   * Applies one enemy attack hit to the player through the enemy attack hitbox.
   */
  handleEnemyAttackHit(player, enemy) {
    if (!player?.body || !player?.playerHurtBox?.body || !enemy?.body) {
      return;
    }

    if (!enemy.canDealAttackDamage()) {
      return;
    }

    if (!enemy.active || enemy.isDead || player.isDead || player.isUntouchable || this.scene.isRestarting) {
      return;
    }

    const currentTime = this.scene.time.now;
    const lastContactDamageAt = player.lastContactDamageAt ?? -Infinity;
    const canApplyDamage = !player.isHurting
      && !player.isEnemyDamageInvincible?.(currentTime)
      && (currentTime - lastContactDamageAt) >= ENEMY_SETTINGS.contactDamageIntervalMs;
    const knockbackDirection = this.getEnemyAttackKnockbackDirection(player, enemy);

    enemy.markAttackDamageDealt();
    this.applyPlayerKnockback(player, enemy, knockbackDirection);

    if (!canApplyDamage) {
      return;
    }

    const fixedDamageMin = enemy.enemyConfig?.contactDamageFixedMin;
    const fixedDamageMax = enemy.enemyConfig?.contactDamageFixedMax;
    const enemyDamage = Number.isFinite(fixedDamageMin) && Number.isFinite(fixedDamageMax)
      ? Phaser.Math.Between(Math.round(fixedDamageMin), Math.round(fixedDamageMax))
      : Math.max(
        1,
        Math.round(
          player.maxHp * Phaser.Math.FloatBetween(
            enemy.enemyConfig?.contactDamageMinPercent ?? ENEMY_SETTINGS.contactDamageMinPercent,
            enemy.enemyConfig?.contactDamageMaxPercent ?? ENEMY_SETTINGS.contactDamageMaxPercent,
          ),
        ),
      );
    const defenseValue = this.helpers.getPlayerDefenseValue(player);
    const damage = Math.max(0, enemyDamage - defenseValue);

    player.lastContactDamageAt = currentTime;
    player.grantEnemyDamageInvincibility?.(ENEMY_SETTINGS.playerDamageInvincibleMs);

    if (damage <= 0) {
      player.showDamagePopup(player.x, player.y, 'Blocked', '#8af5ff', 700, 50);
      return;
    }

    player.isHurting = true;
    player.currentHp = Math.max(0, player.currentHp - damage);
    player.showDamagePopup(player.x, player.y, damage);
    this.scene.sound.play('playerDamageHurt', { loop: false, volume: 0.85 });
    this.scene.refreshPlayerUi();

    if (player.currentHp <= 0) {
      this.scene.handlePlayerDeath(player);
      return;
    }

    this.scene.time.delayedCall(ENEMY_SETTINGS.contactDamageIntervalMs, () => {
      if (!player.active || player.isDead) {
        return;
      }

      player.isHurting = false;
    });
  }

  getEnemyAttackKnockbackDirection(player, enemy) {
    const projectileVelocityX = enemy.activeProjectile?.velocityX ?? 0;
    if (Math.abs(projectileVelocityX) > 0.001) {
      return projectileVelocityX > 0 ? 1 : -1;
    }

    if (Math.abs(enemy.patrolDirection ?? 0) > 0) {
      return enemy.patrolDirection > 0 ? 1 : -1;
    }

    if (typeof enemy.flipX === 'boolean') {
      return enemy.flipX ? 1 : -1;
    }

    return enemy.body.center.x <= player.body.center.x ? 1 : -1;
  }

  applyPlayerKnockback(player, enemy, knockbackDirection = this.getEnemyAttackKnockbackDirection(player, enemy)) {
    if (!player?.body || !enemy?.body) {
      return;
    }

    const knockbackDistance = ENEMY_SETTINGS.playerKnockbackDistance ?? 6;
    const bodyLeftOffset = player.x - player.body.left;
    const bodyRightOffset = player.body.right - player.x;
    const minX = bodyLeftOffset;
    const maxX = gameState.width - bodyRightOffset;
    const startX = player.x;
    const nextX = Phaser.Math.Clamp(
      player.x + (knockbackDirection * knockbackDistance),
      minX,
      maxX,
    );

    player.enemyKnockbackTween?.stop();
    player.enemyKnockbackTween = this.scene.tweens.add({
      targets: player,
      x: nextX,
      duration: 95,
      ease: 'Cubic.easeOut',
      onStart: () => {
        player.setVelocityX(0);
      },
      onUpdate: () => {
        if (!player.active || !player.body) {
          return;
        }

        player.body.updateFromGameObject();
        player.updatePlayerHurtBox?.();
      },
      onComplete: () => {
        if (!player.active || !player.body) {
          return;
        }

        player.setPosition(nextX, player.y);
        player.body.updateFromGameObject();
        player.updatePlayerHurtBox?.();
        player.enemyKnockbackTween = null;
      },
    });

    if (nextX === startX) {
      player.enemyKnockbackTween?.complete?.();
    }
  }

  /**
   * Applies weapon damage to an enemy based on the active player attack.
   * The hitbox overlaps come from `Player`, and the damage rules come from
   * helpers passed down by `MainScene`, so combat stays consistent everywhere.
   */
  damageEnemy(enemy, attackType) {
    if (!enemy.active || enemy.isDead) {
      return;
    }

    if (attackType === 'specialAttack' && !gameState.player?.canSpecialAttackHitEnemy?.(enemy)) {
      return;
    }

    const attackProfile = gameState.player?.getCombatProfile?.(attackType) ?? null;
    const attackConfig = {
      ...this.playerAttackConfig[attackType],
      ...(attackProfile ?? {}),
    };
    if (!attackConfig) {
      return;
    }

    const currentTime = this.scene.time.now;
    const lastHitTime = enemy.lastDamageByAttack[attackType] ?? -Infinity;
    if ((currentTime - lastHitTime) < attackConfig.hitCooldownMs) {
      return;
    }

    const fixedDamage = attackProfile?.fixedDamage;
    let damage = fixedDamage ?? this.helpers.getPlayerAttackDamage(attackType, enemy.maxHp);
    if (fixedDamage === undefined && typeof damage === 'object') {
      damage = Math.max(1, Phaser.Math.Between(damage.min, damage.max));
    }
    const damageMultiplier = gameState.player?.getAttackDamageMultiplier?.(attackType) ?? 1;
    damage = Math.max(1, Math.round(damage * damageMultiplier));
    if (attackType !== 'specialAttack') {
      const enemyDefense = Math.max(0, enemy.defense ?? enemy.enemyConfig?.defense ?? 0);
      damage = Math.max(1, Math.round(damage * (100 / (100 + enemyDefense))));
    }
    enemy.lastDamageByAttack[attackType] = currentTime;
    enemy.isHurting = true;
    enemy.currentHp = Math.max(0, enemy.currentHp - damage);
    enemy.setLastHitLocation({
      x: gameState.player?.body?.center.x ?? gameState.player?.x ?? enemy.x,
      y: gameState.player?.body?.center.y ?? gameState.player?.y ?? enemy.y,
    });
    enemy.provoke(gameState.player, ENEMY_SETTINGS);
    this.applyEnemyKnockback(enemy, gameState.player, attackType, damage);
    enemy.anims.play(enemy.animationKeys.hurt, true);
    enemy.showDamagePopup(enemy.x + 40, enemy.y + 40, damage);
    this.updateEnemyHpBar(enemy);
    this.scene.sound.play('hitAttack', { loop: false, volume: 0.7 });
    this.spawnPlayerHitEffect(enemy, attackType);
    if (attackType === 'specialAttack') {
      gameState.player?.playSpecialAttackImpactShake?.();
      gameState.player?.applySpecialAttackHitBenefits?.(enemy);
    }

    if (enemy.currentHp <= 0) {
      this.destroyEnemy(enemy);
      return;
    }

    this.scene.time.delayedCall(attackConfig.tintDurationMs, () => {
      if (!enemy.active || enemy.isDead) {
        return;
      }

      enemy.isHurting = false;
      enemy.resumeMovementState(ENEMY_SETTINGS);
    });
  }

  /**
   * Spawns one configured player hit effect on top of the struck enemy.
   */
  spawnPlayerHitEffect(enemy, attackType) {
    const player = gameState.player;
    if (!player?.playConfirmedAttackHitEffect) {
      return;
    }

    player.playConfirmedAttackHitEffect(enemy, attackType);
  }

  /**
   * Pushes the enemy away from the player after a successful hit.
   */
  applyEnemyKnockback(enemy, player, attackType, damage = 0) {
    if (!enemy.body || !player) {
      return;
    }

    const attackProfile = player.getCombatProfile?.(attackType) ?? null;
    const attackConfig = {
      ...this.playerAttackConfig[attackType],
      ...(attackProfile ?? {}),
    };
    const highDamageKnockbackBonus = damage >= (enemy.maxHp * 0.10) ? 0.005 : 0;
    const attackKnockbackPercent = (attackConfig?.knockbackPercent ?? 0) + highDamageKnockbackBonus;
    const knockbackDistanceMultiplier = Math.max(0, attackConfig?.knockbackDistanceMultiplier ?? 1);

    let knockbackDirection = player.flipX ? 1 : -1;
    if (player.body?.center.x !== enemy.body?.center.x) {
      knockbackDirection = player.body.center.x < enemy.body.center.x ? 1 : -1;
    }

    const playerReferenceX = player.body ? player.body.center.x : player.x;
    const distanceFromPlayer = Math.abs(enemy.x - playerReferenceX);
    const baseKnockbackDistance = Math.max(
      enemy.lockToPlatform ? ENEMY_SETTINGS.knockbackDistance * 0.55 : ENEMY_SETTINGS.knockbackDistance,
      distanceFromPlayer * (ENEMY_SETTINGS.knockbackMinPercent + attackKnockbackPercent),
    );
    const knockbackDistance = baseKnockbackDistance * knockbackDistanceMultiplier;
    const knockbackVelocityX = knockbackDistance * knockbackDirection * 5;
    const knockbackVelocityClampX = 420 * Math.max(1, knockbackDistanceMultiplier);

    enemy.applyKnockback(
      knockbackVelocityX,
      enemy.lockToPlatform ? 0 : ENEMY_SETTINGS.knockbackJumpVelocity,
      knockbackVelocityClampX,
    );
  }

  /**
   * Redraws the enemy HP bar so it follows the current body position.
   */
  updateEnemyHpBar(enemy) {
    if (!enemy.hpBar || !enemy.active) {
      return;
    }

    const bodyCenterX = enemy.body.x + (enemy.body.width / 2);
    const barX = bodyCenterX - (enemy.hpBarWidth / 2);
    const barY = enemy.body.y - enemy.hpBarOffsetY;
    const healthRatio = Phaser.Math.Clamp(enemy.currentHp / enemy.maxHp, 0, 1);

    enemy.hpBar.clear();
    enemy.hpBar.fillStyle(0x000000, 0.8);
    enemy.hpBar.fillRect(barX, barY, enemy.hpBarWidth, enemy.hpBarHeight);
    enemy.hpBar.fillStyle(0xff3b30, 1);
    enemy.hpBar.fillRect(barX + 1, barY + 1, (enemy.hpBarWidth - 2) * healthRatio, enemy.hpBarHeight - 2);
  }

  /**
   * Removes an enemy, grants experience, and schedules its respawn.
   */
  destroyEnemy(enemy) {
    enemy.isDead = true;
    this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);
    const respawnPoint = enemy.spawnPoint ? { ...enemy.spawnPoint } : null;
    const deathDuration = this.getAnimationDuration(enemy.animationKeys.death);

    enemy.setVelocity(0, 0);
    enemy.body.enable = false;
    enemy.detectionZone?.destroy();
    enemy.attackDetectionZone?.destroy();
    enemy.enemyHitBox?.destroy();
    enemy.projectileHitBox?.destroy();
    enemy.stateLabel?.destroy();
    enemy.anims.play(enemy.animationKeys.death, true);

    this.scene.grantEnemyExp(gameState.player, enemy);
    this.scene.spawnEnemyCoinDrop(enemy);

    this.scene.time.delayedCall(deathDuration, () => {
      enemy.hpBar?.destroy();
      enemy.destroy();

      if (respawnPoint) {
        this.scheduleRespawn(respawnPoint);
      }
    });
  }

  /**
   * Clears transient enemy visuals during scene shutdown.
   */
  cleanup() {
    gameState.enemyGroup?.getChildren().forEach((enemy) => {
      enemy.hpBar?.destroy();
      enemy.detectionZone?.destroy();
      enemy.attackDetectionZone?.destroy();
      enemy.enemyHitBox?.destroy();
      enemy.projectileHitBox?.destroy();
      enemy.stateLabel?.destroy();
      enemy.anims?.stop();
    });
  }

  /**
   * Converts a spawn position into a stable object key.
   */
  getSpawnPointKey(enemyPos) {
    return `${enemyPos.x}:${enemyPos.y}`;
  }

  /**
   * Returns the next respawn delay for a specific spawn point.
   */
  getEnemyRespawnDelay(enemyPos) {
    const spawnPointKey = this.getSpawnPointKey(enemyPos);
    const destroyedCount = (this.enemyRespawnCounts[spawnPointKey] ?? 0) + 1;
    this.enemyRespawnCounts[spawnPointKey] = destroyedCount;

    const extraDelaySteps = Math.floor(
      Math.max(0, destroyedCount - 1) / ENEMY_SETTINGS.respawnDelayIncreaseEveryDeaths,
    );
    const respawnBaseDelayMs = enemyPos.respawnBaseDelayMs ?? ENEMY_SETTINGS.respawnBaseDelayMs;
    const respawnJitterMs = enemyPos.respawnJitterMs ?? ENEMY_SETTINGS.respawnJitterMs;
    const respawnLocationDelayMs = (enemyPos.spawnOrder ?? 0) * ENEMY_SETTINGS.respawnLocationStepMs;
    const respawnDelay = respawnBaseDelayMs
      + respawnLocationDelayMs
      + (extraDelaySteps * ENEMY_SETTINGS.respawnDelayStepMs)
      + Phaser.Math.Between(0, respawnJitterMs);

    return Math.min(respawnDelay, ENEMY_SETTINGS.respawnMaxDelayMs);
  }

  /**
   * Chooses a spawn X position inside the lane so enemies do not always appear on the exact same pixel.
   */
  getSpawnX(enemyPos) {
    const patrolMinX = enemyPos.patrolMinX ?? (enemyPos.x - 120);
    const patrolMaxX = enemyPos.patrolMaxX ?? (enemyPos.x + 120);
    const roundedMinX = Math.round(patrolMinX);
    const roundedMaxX = Math.round(patrolMaxX);
    const exclusionZones = Array.isArray(enemyPos.spawnExclusionZones)
      ? enemyPos.spawnExclusionZones
        .map((zone) => ({
          minX: Math.max(roundedMinX, Math.round(zone.minX ?? roundedMinX)),
          maxX: Math.min(roundedMaxX, Math.round(zone.maxX ?? roundedMaxX)),
        }))
        .filter((zone) => zone.maxX >= zone.minX)
      : [];

    if (!exclusionZones.length) {
      return Phaser.Math.Between(roundedMinX, roundedMaxX);
    }

    const allowedRanges = [];
    let cursor = roundedMinX;
    exclusionZones
      .sort((zoneA, zoneB) => zoneA.minX - zoneB.minX)
      .forEach((zone) => {
        if (cursor < zone.minX) {
          allowedRanges.push({ minX: cursor, maxX: zone.minX - 1 });
        }
        cursor = Math.max(cursor, zone.maxX + 1);
      });

    if (cursor <= roundedMaxX) {
      allowedRanges.push({ minX: cursor, maxX: roundedMaxX });
    }

    if (!allowedRanges.length) {
      return null;
    }

    const selectedRange = Phaser.Utils.Array.GetRandom(allowedRanges);
    return Phaser.Math.Between(selectedRange.minX, selectedRange.maxX);
  }

  /**
   * Requeues a respawn until there is room for the enemy to return.
   */
  scheduleRespawn(enemyPos, delayMs = this.getEnemyRespawnDelay(enemyPos)) {
    if (!ENEMY_SETTINGS.respawnEnabled) {
      return;
    }

    this.scene.time.delayedCall(delayMs, () => {
      if (this.trySpawnEnemy(enemyPos)) {
        return;
      }

      this.scheduleRespawn(enemyPos, ENEMY_SETTINGS.respawnRetryDelayMs);
    });
  }

  /**
   * Returns the playback duration for a registered animation.
   */
  getAnimationDuration(animationKey) {
    const animation = this.scene.anims.get(animationKey);
    if (!animation) {
      return 0;
    }

    return Math.ceil((animation.frames.length / animation.frameRate) * 1000);
  }
}
