import { registerEnemyAnimations, registerPlayerAnimations, registerWorldAnimations } from '../assets/animations.js';
import { loadMainSceneAssets } from '../assets/loaders.js';
import {
  ENEMY_ARCHETYPES,
  ENEMY_SETTINGS,
  ENEMY_SPAWN_POINTS,
  ENEMY_TYPES,
  GAME_DIMENSIONS,
  MAIN_SCENE_DIMENSIONS,
  PLATFORM_LAYOUT,
  PLAYER_ATTACK_CONFIG,
  PLAYER_PROGRESS_SETTINGS,
} from '../constants/gameConstants.js';
import { getCharacterConfig } from '../constants/characters.js';
import { SCENE_KEYS } from '../constants/sceneKeys.js';
import Player from '../entities/characters/Player.js';
import EnemyManager from '../systems/EnemyManager.js';
import { gameState } from '../state/gameState.js';
import PlayerHud from '../ui/PlayerHud.js';
import PlayerProfilePanel from '../ui/PlayerProfilePanel.js';

/**
 * Main gameplay scene for exploration, combat, and UI.
 * This scene is the main wiring layer of the project: it creates the world,
 * instantiates `Player`, connects `EnemyManager`, owns upgrade logic, and
 * feeds live state into the HUD and profile panel.
 */
export default class MainScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MAIN_GAME);
    this.isRestarting = false;
    this.cleanupComplete = false;
  }

  /**
   * Loads all world, player, enemy, and sound assets required by gameplay.
   */
  preload() {
    loadMainSceneAssets(this);
  }

  /**
   * Builds the world, player, systems, camera, UI, and audio for the scene.
   * Read this method first when tracing the runtime object graph.
   */
  create() {
    this.isRestarting = false;
    this.cleanupComplete = false;
    gameState.width = MAIN_SCENE_DIMENSIONS.width;
    gameState.height = MAIN_SCENE_DIMENSIONS.height;
    const selectedCharacterId = this.registry.get('selectedCharacterId');
    this.selectedPlayerName = this.registry.get('playerName')?.trim() || 'Player';
    this.selectedCharacterConfig = getCharacterConfig(selectedCharacterId);
    if (!this.selectedCharacterConfig) {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECTION);
      return;
    }

    this.playerAnimationKeys = registerPlayerAnimations(this, this.selectedCharacterConfig);
    registerEnemyAnimations(this);
    registerWorldAnimations(this);

    gameState.platforms = this.physics.add.staticGroup();
    gameState.oneWayPlatforms = this.physics.add.staticGroup();
    gameState.movingPlatform = null;
    gameState.enemyGroup = this.physics.add.group();
    this.movingPlatformPreviousY = null;

    this.events.once('shutdown', this.cleanupSceneState, this);
    this.events.once('destroy', this.cleanupSceneState, this);

    // The order matters here:
    // 1. world/platforms must exist before collisions are attached
    // 2. player must exist before UI and enemy overlaps can reference it
    // 3. UI reads live player data
    // 4. camera follows the created player
    this.createWorld();
    this.createPlayer();
    this.createUi();
    this.createAudio();
    this.createCamera();

    // `EnemyManager` owns enemy lifecycle, but combat math stays sourced from
    // this scene so the same rules are reused by gameplay and UI.
    this.enemyManager = new EnemyManager(this, PLAYER_ATTACK_CONFIG, {
      getPlayerAttackDamage: this.getPlayerAttackDamage.bind(this),
      getPlayerDefensePercent: this.getPlayerDefensePercent.bind(this),
      getPlayerDefenseValue: this.getPlayerDefenseValue.bind(this),
    });
    this.enemyManager.scheduleEnemySpawns(ENEMY_SPAWN_POINTS);
  }

  /**
   * Updates the player, enemies, and screen-space UI every frame.
   */
  update() {
    gameState.player?.update();

    if (gameState.player && gameState.player.currentHp <= 0 && !this.isRestarting) {
      this.handlePlayerDeath(gameState.player);
      return;
    }

    this.enemyManager?.update();
    this.refreshPlayerUi();
  }

  /**
   * Creates parallax backgrounds, map props, and platforms.
   */
  createWorld() {
    this.createParallaxBackground();

    gameState.portal = this.add.sprite((gameState.width / 2) - 950, gameState.height - 1100, 'portal')
      .setDepth(11);
    if (this.anims.exists('world.portal.spin')) {
      gameState.portal.play('world.portal.spin');
    }
    this.add.text((gameState.width / 2) - 850, gameState.height - 1100, 'COMING SOON....').setDepth(12);

    const ground = gameState.platforms.create(PLATFORM_LAYOUT.ground.x, gameState.height - PLATFORM_LAYOUT.ground.yOffset, 'ground')
      .setOrigin(0, 0)
      .setDepth(10);
    ground.displayWidth = gameState.width;
    ground.refreshBody();

    gameState.platforms.create((gameState.width / 2) + PLATFORM_LAYOUT.upperPlatform.xOffset, PLATFORM_LAYOUT.upperPlatform.y, 'upperPlatform')
      .setOrigin(0, 0)
      .refreshBody()
      .setDepth(10);

    gameState.platforms.create(gameState.width + PLATFORM_LAYOUT.mediumPlatform.xOffset, gameState.height - PLATFORM_LAYOUT.mediumPlatform.yOffset, 'mediumPlatform')
      .setOrigin(0, 0)
      .refreshBody()
      .setDepth(10);

    PLATFORM_LAYOUT.singlePlatforms.forEach((platform, index) => {
      // Build each single platform from the central layout table.
      const x = platform.x ?? ((gameState.width / 2) + platform.xOffset);
      const y = platform.y ?? (gameState.height - platform.yOffset);
      const platformGroupIndex = index + 3;

      if (platformGroupIndex === PLATFORM_LAYOUT.movingPlatformIndex) {
        gameState.movingPlatform = this.physics.add.image(x, y, 'singlePlatform')
          .setOrigin(0, 0)
          .setImmovable(true)
          .setPushable(false)
          .setDepth(10);
        gameState.movingPlatform.body.setAllowGravity(false);
        this.movingPlatformPreviousY = gameState.movingPlatform.y;
        return;
      }

      gameState.oneWayPlatforms.create(x, y, 'singlePlatform')
        .setOrigin(0, 0)
        .refreshBody()
        .setDepth(10);
    });

    if (gameState.movingPlatform?.body) {
      this.tweens.add({
        targets: gameState.movingPlatform,
        y: gameState.height - PLATFORM_LAYOUT.movingPlatformTargetYOffset,
        ease: 'linear',
        duration: PLATFORM_LAYOUT.movingPlatformDurationMs,
        repeat: -1,
        yoyo: true,
        onUpdate: () => this.updateMovingPlatformBody(),
      });
    }
  }

  /**
   * Creates the player instance and attaches world collisions and profile interaction.
   * The created player is also stored in `gameState` because `EnemyManager`,
   * profile toggling, and UI refresh logic all need the same live reference.
   */
  createPlayer() {
    gameState.player = new Player(
      this,
      250,
      1250,
      this.selectedCharacterConfig.spawnTextureKey,
      this.selectedCharacterConfig,
      this.playerAnimationKeys,
      this.selectedPlayerName,
    );
    gameState.player.enableProfileInteraction();
    gameState.player.input.cursor = 'pointer';
    gameState.player.on('pointerdown', () => this.togglePlayerProfile());

    this.physics.add.collider(gameState.player, gameState.platforms);
    this.physics.add.collider(
      gameState.player,
      gameState.movingPlatform,
      undefined,
      this.shouldCollideWithMovingPlatform,
      this,
    );
    this.physics.add.collider(
      gameState.player,
      gameState.oneWayPlatforms,
      undefined,
      this.shouldCollideWithOneWayPlatform,
      this,
    );
  }

  /**
   * Allows jumping upward through small platforms and landing when falling onto them.
   */
  shouldCollideWithOneWayPlatform(player, platform) {
    if (!player?.body || !platform?.body) {
      return false;
    }

    if (player.body.velocity.y < 0) {
      return false;
    }

    const platformTop = platform.body.top;
    const playerBottom = player.body.bottom;
    const previousPlayerBottom = player.body.prev.y + player.body.height;
    const landingTolerance = 14;

    return previousPlayerBottom <= (platformTop + landingTolerance)
      && playerBottom >= (platformTop - 2)
      && player.body.center.x >= platform.body.left
      && player.body.center.x <= platform.body.right;
  }

  /**
   * Keeps the moving platform body synchronized with tween motion for stable Y-axis collisions.
   */
  updateMovingPlatformBody() {
    if (!gameState.movingPlatform?.body) {
      return;
    }

    const previousY = this.movingPlatformPreviousY ?? gameState.movingPlatform.y;
    const deltaY = gameState.movingPlatform.y - previousY;
    const deltaSeconds = Math.max(this.game.loop.delta / 1000, 0.001);

    gameState.movingPlatform.body.setVelocity(0, deltaY / deltaSeconds);
    gameState.movingPlatform.body.updateFromGameObject();
    this.movingPlatformPreviousY = gameState.movingPlatform.y;
  }

  /**
   * Keeps the moving platform solid while still allowing reliable landing from above.
   */
  shouldCollideWithMovingPlatform(player, platform) {
    if (!player?.body || !platform?.body) {
      return false;
    }

    const playerBottom = player.body.bottom;
    const previousPlayerBottom = player.body.prev.y + player.body.height;
    const platformTop = platform.body.top;
    const platformBottom = platform.body.bottom;
    const horizontalOverlap = player.body.right > platform.body.left && player.body.left < platform.body.right;

    if (!horizontalOverlap) {
      return false;
    }

    const landingFromAbove = previousPlayerBottom <= (platformTop + 16) && player.body.velocity.y >= 0;
    const alreadyOnPlatform = playerBottom <= (platformTop + 18) && player.body.velocity.y >= platform.body.velocity.y;
    const hitFromBelow = player.body.top < platformBottom && player.body.velocity.y < 0;

    return landingFromAbove || alreadyOnPlatform || hitFromBelow;
  }

  /**
   * Creates the HUD and upgrade profile panel.
   * The UI does not mutate player state by itself. Instead, this scene injects
   * upgrade callbacks so gameplay rules stay centralized in `MainScene`.
   */
  createUi() {
    this.playerHud = new PlayerHud(this);
    this.playerHud.bindEvents(() => this.togglePlayerProfile());
    this.playerProfile = new PlayerProfilePanel(
      this,
      this.getPlayerAttackDamage.bind(this),
      this.getPlayerDefensePercent.bind(this),
      this.getPlayerDefenseValue.bind(this),
      PLAYER_ATTACK_CONFIG,
    );
    this.playerProfile.bindEvents(
      () => this.upgradePlayerHp(),
      () => this.upgradePlayerMana(),
      () => this.upgradePlayerBaseDamage(),
      () => this.upgradePlayerDefense(),
    );
    this.input.on('pointerdown', this.handleProfileOutsideClick, this);
    this.refreshPlayerUi();
  }

  /**
   * Starts the main scene background music.
   */
  createAudio() {
    gameState.backgroundMusic?.stop();
    gameState.backgroundMusic = this.sound.add('grassyBiome', { loop: true, volume: 1 });
    gameState.backgroundMusic.play();
  }

  /**
   * Configures world bounds and camera follow behavior.
   */
  createCamera() {
    this.cameras.main.setBounds(0, 0, gameState.width, gameState.height);
    this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
    this.cameras.main.setFollowOffset(100, 0.5);
    this.cameras.main.setDeadzone(250, 250);
    this.physics.world.setBounds(0, 0, gameState.width, gameState.height);
  }

  /**
   * Refreshes both player UI components using live data.
   * `update()` calls this every frame so HUD text and the profile panel stay
   * synchronized with combat, EXP gain, and upgrades.
   */
  refreshPlayerUi() {
    if (!gameState.player) {
      return;
    }

    this.playerHud?.update(gameState.player, this.game.loop.actualFps);
    this.playerProfile?.update(gameState.player, ENEMY_SETTINGS.maxHp);
  }

  /**
   * Shows or hides the player profile panel.
   */
  togglePlayerProfile() {
    this.playerProfile?.toggle();
    this.refreshPlayerUi();
  }

  /**
   * Closes the profile when the player clicks anywhere outside the panel.
   */
  handleProfileOutsideClick(pointer) {
    if (this.playerHud?.handlePointerDown(pointer)) {
      return;
    }

    if (!this.playerProfile?.visible) {
      return;
    }

    if (this.playerProfile.containsPoint(pointer.x, pointer.y)) {
      return;
    }

    if (gameState.player?.getBounds && Phaser.Geom.Rectangle.Contains(gameState.player.getBounds(), pointer.worldX, pointer.worldY)) {
      return;
    }

    this.playerProfile.close();
  }

  /**
   * Returns calculated damage for a specific player attack.
   */
  getPlayerAttackDamage(attackType, enemyMaxHp = ENEMY_SETTINGS.maxHp) {
    const attackConfig = PLAYER_ATTACK_CONFIG[attackType];
    if (!attackConfig) {
      return 0;
    }

    const damageReferenceHp = attackType === 'specialAttack'
      ? enemyMaxHp
      : ENEMY_SETTINGS.maxHp;

    if (gameState.player?.getAttackDamagePercentRange) {
      const percentRange = gameState.player.getAttackDamagePercentRange(attackType, attackConfig);
      const levelBonusDamage = (gameState.player.attackUpgradeLevels[attackType] ?? 0) * PLAYER_PROGRESS_SETTINGS.levelUpDamageBonus;
      const usesDamageRange = ['smash', 'thrust', 'spinAttack'].includes(attackType)
        || attackConfig.damagePercentMin !== undefined
        || attackConfig.damagePercentMax !== undefined;

      if (usesDamageRange) {
        return {
          min: Math.max(1, Math.round(damageReferenceHp * percentRange.min) + levelBonusDamage),
          max: Math.max(1, Math.round(damageReferenceHp * percentRange.max) + levelBonusDamage),
        };
      }

      return Math.max(1, Math.round(damageReferenceHp * percentRange.max) + levelBonusDamage);
    }

    if (['smash', 'thrust', 'spinAttack'].includes(attackType)) {
      const percentRange = gameState.player.getAttackDamagePercentRange(attackType, attackConfig);
      return {
        min: Math.max(1, Math.round(damageReferenceHp * percentRange.min)),
        max: Math.max(1, Math.round(damageReferenceHp * percentRange.max)),
      };
    }

    const damagePercent = attackConfig.damagePercentMax ?? attackConfig.damagePercent;
    const baseDamage = Math.round(damageReferenceHp * damagePercent);
    const levelBonusDamage = (gameState.player.attackUpgradeLevels[attackType] ?? 0) * PLAYER_PROGRESS_SETTINGS.levelUpDamageBonus;
    return Math.max(1, baseDamage + levelBonusDamage);
  }

  /**
   * Returns the current defense percentage for the player.
   */
  getPlayerDefensePercent(player = gameState.player) {
    if (!player) {
      return 0;
    }

    const defensePercent = typeof player.getDefensePercent === 'function'
      ? player.getDefensePercent()
      : (player.defenseUpgradeLevel ?? 0) * PLAYER_PROGRESS_SETTINGS.levelUpDefenseBonusPercent;
    return Phaser.Math.Clamp(defensePercent, 0, 1);
  }

  /**
   * Returns the current flat defense value for the player.
   */
  getPlayerDefenseValue(player = gameState.player) {
    if (!player) {
      return 0;
    }

    if (typeof player.getDefenseValue === 'function') {
      return player.getDefenseValue();
    }

    return Math.round(player.maxHp * this.getPlayerDefensePercent(player));
  }

  /**
   * Grants enemy experience and triggers level up behavior when needed.
   */
  grantEnemyExp(player, enemy = null) {
    if (!player || player.isDead) {
      return;
    }

    const enemyType = enemy?.enemyType ?? ENEMY_TYPES.MUSHROOM;
    const expGain = ENEMY_ARCHETYPES[enemyType]?.expReward ?? ENEMY_SETTINGS.expPerEnemy;
    player.totalEnemyKills = (player.totalEnemyKills ?? 0) + 1;
    player.currentExp += expGain;
    this.showExpGainIndicator(player, expGain);

    while (player.currentExp >= player.expToNextLevel) {
      // Process multiple level-ups if a large EXP gain crosses more than one threshold.
      player.currentExp -= player.expToNextLevel;
      this.handlePlayerLevelUp(player);
    }

    this.refreshPlayerUi();
  }

  /**
   * Applies level-up rewards and resets core resources.
   */
  handlePlayerLevelUp(player) {
    player.level += 1;
    player.expToNextLevel += Math.max(1, (player.totalEnemyKills ?? 0) * 2);
    player.availableAttackUpgradePoints += 3;
    player.currentMana = player.maxMana;
    this.sound.play('levelUp', { volume: 1, seek: 1 });
    this.playLevelUpEffect(player);
  }

  /**
   * Creates the temporary level-up visual effect.
   */
  playLevelUpEffect(player) {
    const effectDepth = 250;
    const effectX = player.x;
    const effectY = player.y - 32;
    const lightBeam = this.add.rectangle(effectX, effectY + 6, 34, 148, 0x7de7ff, 0.18).setDepth(effectDepth);
    const auraCore = this.add.ellipse(effectX, effectY - 10, 46, 46, 0xf8f4c4, 0.72).setDepth(effectDepth + 1);
    const auraGlow = this.add.ellipse(effectX, effectY - 10, 86, 86, 0x74dfff, 0.18).setDepth(effectDepth);
    const ringOuter = this.add.ellipse(effectX, effectY - 10, 118, 46).setDepth(effectDepth + 1);
    ringOuter.setStrokeStyle(3, 0x8df0ff, 0.82);
    const ringInner = this.add.ellipse(effectX, effectY - 10, 82, 26).setDepth(effectDepth + 1);
    ringInner.setStrokeStyle(2, 0xffef9b, 0.74);
    const wingLeft = this.add.triangle(effectX - 56, effectY - 8, 0, 18, 0, -18, -42, 0, 0x7bdfff, 0.32).setDepth(effectDepth);
    const wingRight = this.add.triangle(effectX + 56, effectY - 8, 0, -18, 0, 18, 42, 0, 0x7bdfff, 0.32).setDepth(effectDepth);
    const levelUpShadow = this.add.text(effectX + 2, effectY - 82, 'LEVEL UP', { fontFamily: 'Arial', fontSize: '28px', color: '#03131d', fontStyle: 'bold' }).setOrigin(0.5).setDepth(effectDepth + 2);
    const levelUpText = this.add.text(effectX, effectY - 86, 'LEVEL UP', { fontFamily: 'Arial', fontSize: '28px', color: '#fff4c5', fontStyle: 'bold', stroke: '#61dfff', strokeThickness: 3 }).setOrigin(0.5).setDepth(effectDepth + 3);
    const levelText = this.add.text(effectX, effectY - 56, `Lv ${player.level}`, { fontFamily: 'Arial', fontSize: '18px', color: '#dffbff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(effectDepth + 3);

    const effectObjects = [lightBeam, auraCore, auraGlow, ringOuter, ringInner, wingLeft, wingRight, levelUpShadow, levelUpText, levelText];

    this.tweens.add({ targets: [ringOuter, ringInner], angle: 360, duration: 2200, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [wingLeft, wingRight], scaleX: 1.16, scaleY: 1.08, alpha: 0.52, duration: 520, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [auraCore, auraGlow, lightBeam], scaleY: 1.18, alpha: { from: 0.18, to: 0.84 }, duration: 340, yoyo: true, repeat: 1, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: [levelUpShadow, levelUpText, levelText], y: '-=28', alpha: 0, duration: 1650, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: [ringOuter, ringInner, auraCore, auraGlow, wingLeft, wingRight, lightBeam],
      alpha: 0,
      duration: 1650,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Clean up the temporary effect objects after the animation completes.
        effectObjects.forEach((effectObject) => effectObject.destroy());
      },
    });
  }

  /**
   * Spends one upgrade point on the chosen attack path.
   */
  upgradePlayerAttack(attackType) {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    if (!(attackType in gameState.player.attackUpgradeLevels)) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.attackUpgradeLevels[attackType] += 1;
    this.refreshPlayerUi();
  }

  /**
   * Spends one upgrade point to raise all attack paths together.
   */
  upgradePlayerBaseDamage() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.baseDamageUpgradeLevel += 1;
    this.refreshPlayerUi();
  }

  /**
   * Spends one upgrade point on defense.
   */
  upgradePlayerDefense() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.defenseUpgradeLevel += 1;
    this.refreshPlayerUi();
  }

  /**
   * Spends one upgrade point on maximum HP.
   */
  upgradePlayerHp() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.hpUpgradeLevel += 1;
    gameState.player.maxHp += 10;
    gameState.player.currentHp = Math.min(gameState.player.maxHp, gameState.player.currentHp + 10);
    this.refreshPlayerUi();
  }

  /**
   * Spends one upgrade point on maximum Mana.
   */
  upgradePlayerMana() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.manaUpgradeLevel += 1;
    gameState.player.maxMana += 10;
    gameState.player.currentMana = Math.min(gameState.player.maxMana, gameState.player.currentMana + 10);
    this.refreshPlayerUi();
  }

  /**
   * Displays floating experience text above the player.
   */
  showExpGainIndicator(player, expGain) {
    const expText = this.add.text(player.x, player.y - 110, `+${expGain} EXP`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#fde68a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(240);

    this.tweens.add({
      targets: expText,
      y: expText.y - 50,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => expText.destroy(),
    });
  }

  /**
   * Handles player death and safely restarts the scene.
   */
  handlePlayerDeath(player) {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;
    player.beginDeathState();
    player.currentHp = 0;
    player.anims.play(player.getAnimationKey('death'), true);

    const restartDelay = this.getAnimationDuration(player.getAnimationKey('death')) + 1500;
    this.time.delayedCall(restartDelay, () => {
      this.cleanupSceneState();
      this.scene.restart();
    });
  }

  /**
   * Creates layered background images with parallax scroll factors.
   */
  createParallaxBackground() {
    gameState.clouds = this.add.image(0, gameState.height - 1450, 'clouds').setOrigin(0, 0).setDepth(1);
    gameState.mountain = this.add.image(0, gameState.height - 970, 'mountain').setOrigin(0, 0).setDepth(2);
    gameState.ruins = this.add.image(0, GAME_DIMENSIONS.height, 'ruins').setOrigin(0, 0).setDepth(3);
    gameState.trees = this.add.image(0, gameState.height - 650, 'trees').setOrigin(0, 0).setDepth(5);

    [gameState.clouds, gameState.mountain, gameState.ruins, gameState.trees].forEach((layer) => {
      const textureFrame = layer.texture.get();
      if (!textureFrame) {
        return;
      }

      layer.displayWidth = gameState.width;
      layer.displayHeight = textureFrame.height;
    });

    gameState.clouds.setScrollFactor(0.2, 0.1);
    gameState.mountain.setScrollFactor(0.5, 0.4);
    gameState.ruins.setScrollFactor(0.5, 0.5);
    gameState.trees.setScrollFactor(0.7, 0.7);
  }

  /**
   * Stops transient systems so the scene can restart cleanly.
   * This is the shutdown counterpart to `create()`: anything created there and
   * shared through `gameState` should be considered for cleanup here.
   */
  cleanupSceneState() {
    if (this.cleanupComplete) {
      return;
    }

    this.cleanupComplete = true;
    gameState.player?.nameLabel?.destroy();
    gameState.player?.anims?.stop();
    this.enemyManager?.cleanup();
    this.tweens.killAll();
    this.time.removeAllEvents();

    gameState.backgroundMusic?.stop();
    gameState.backgroundMusic?.destroy();
    gameState.backgroundMusic = null;
    gameState.movingPlatform = null;
    gameState.oneWayPlatforms = null;
    this.movingPlatformPreviousY = null;

    this.sound.stopAll();
    this.sound.removeAll();
    this.input.off('pointerdown', this.handleProfileOutsideClick, this);
  }

  /**
   * Returns the playback duration for a registered animation.
   */
  getAnimationDuration(animationKey) {
    const animation = this.anims.get(animationKey);
    if (!animation) {
      return 0;
    }

    return Math.ceil((animation.frames.length / animation.frameRate) * 1000);
  }
}
