import { registerEnemyAnimations, registerPlayerAnimations } from '../../assets/animations.js';
import { loadMainSceneAssets } from '../../assets/loaders.js';
import {
  ENEMY_ARCHETYPES,
  ENEMY_SETTINGS,
  ENEMY_TYPES,
  PLAYER_ATTACK_CONFIG,
  PLAYER_PROGRESS_SETTINGS,
} from '../../constants/gameConstants.js';
import { getCharacterConfig } from '../../constants/characters.js';
import { getWorldSceneConfig } from '../../constants/worldSceneConfigs.js';
import { SCENE_KEYS } from '../../constants/sceneKeys.js';
import Player from '../../entities/characters/Player.js';
import EnemyManager from '../../systems/EnemyManager.js';
import { gameState } from '../../state/gameState.js';
import PlayerHud from '../../ui/PlayerHud.js';
import PlayerProfilePanel from '../../ui/PlayerProfilePanel.js';

/**
 * Shared gameplay scene shell for world-sized exploration areas.
 * Each concrete world scene supplies only layout/config data and reuses
 * the same player, camera, UI, combat, and transition wiring here.
 */
export default class BaseWorldScene extends Phaser.Scene {
  constructor(sceneKey) {
    super(sceneKey);
    this.sceneConfig = getWorldSceneConfig(sceneKey);
    this.worldAssetId = this.sceneConfig?.assetWorldId ?? null;
    this.isRestarting = false;
    this.cleanupComplete = false;
    this.isTransitioning = false;
    this.staticPlatforms = [];
    this.healerNpc = null;
    this.healerUi = null;
  }

  preload() {
    if (this.textures.exists('ground') && this.cache.audio.exists('grassyBiome')) {
      return;
    }

    loadMainSceneAssets(this, this.sceneConfig?.assetWorldId);
  }

  create() {
    this.isRestarting = false;
    this.cleanupComplete = false;
    this.isTransitioning = false;

    if (!this.sceneConfig) {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECTION);
      return;
    }

    gameState.width = this.sceneConfig.width;
    gameState.height = this.sceneConfig.height;

    const selectedCharacterId = this.registry.get('selectedCharacterId');
    this.selectedPlayerName = this.registry.get('playerName')?.trim() || 'Player';
    this.selectedCharacterConfig = getCharacterConfig(selectedCharacterId);
    if (!this.selectedCharacterConfig) {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECTION);
      return;
    }

    this.playerAnimationKeys = registerPlayerAnimations(this, this.selectedCharacterConfig);
    registerEnemyAnimations(this);

    gameState.platforms = this.physics.add.staticGroup();
    gameState.oneWayPlatforms = this.physics.add.staticGroup();
    gameState.movingPlatform = null;
    gameState.enemyGroup = this.physics.add.group();
    this.movingPlatformPreviousY = null;

    this.events.once('shutdown', this.cleanupSceneState, this);
    this.events.once('destroy', this.cleanupSceneState, this);

    this.createWorld();
    this.createPlayer();
    this.createUi();
    this.createAudio();
    this.createCamera();

    this.enemyManager = new EnemyManager(this, PLAYER_ATTACK_CONFIG, {
      getPlayerAttackDamage: this.getPlayerAttackDamage.bind(this),
      getPlayerDefensePercent: this.getPlayerDefensePercent.bind(this),
      getPlayerDefenseValue: this.getPlayerDefenseValue.bind(this),
    });

    if ((this.sceneConfig.enemySpawnPoints?.length ?? 0) > 0) {
      this.enemyManager.scheduleEnemySpawns(this.sceneConfig.enemySpawnPoints);
    }
  }

  update() {
    if (this.isTransitioning || !gameState.player) {
      return;
    }

    gameState.player?.update();
    this.recordSceneStandingPosition();

    if (gameState.player && gameState.player.currentHp <= 0 && !this.isRestarting) {
      this.handlePlayerDeath(gameState.player);
      return;
    }

    if (gameState.enemyGroup) {
      this.enemyManager?.update();
    }
    this.refreshPlayerUi();
    this.checkSceneTransition();
  }

  recordSceneStandingPosition() {
    const playerBody = gameState.player?.body;
    if (!playerBody) {
      return;
    }

    const isStanding = playerBody.blocked.down || playerBody.touching.down;
    if (!isStanding) {
      return;
    }

    gameState.sceneReturnPositions[this.scene.key] = {
      x: Math.max(32, Math.min(gameState.player.x, gameState.width - 120)),
      y: gameState.player.y,
    };
  }

  createWorld() {
    this.createParallaxBackground();
    this.staticPlatforms = [];

    const portalConfig = this.sceneConfig?.props?.portal;
    if (portalConfig) {
      gameState.portal = this.add.image(portalConfig.x, portalConfig.y, portalConfig.textureKey)
        .setDepth(portalConfig.depth ?? 11);

      if (portalConfig.label) {
        this.add.text(
          portalConfig.x + (portalConfig.labelOffsetX ?? 0),
          portalConfig.y,
          portalConfig.label,
        ).setDepth(portalConfig.labelDepth ?? ((portalConfig.depth ?? 11) + 1));
      }
    } else {
      gameState.portal = null;
    }

    const groundConfig = this.sceneConfig.platforms.ground;
    const ground = gameState.platforms.create(groundConfig.x, groundConfig.y, groundConfig.textureKey)
      .setOrigin(0, 0)
      .setDepth(groundConfig.depth ?? 10);

    if (groundConfig.stretchToWorldWidth) {
      ground.displayWidth = gameState.width;
    }
    ground.refreshBody();
    this.createPlatformMarker(ground, `${this.getScenePlatformPrefix()}-ground`);

    (this.sceneConfig.platforms.staticPlatforms ?? []).forEach((platformConfig, index) => {
      const platform = gameState.platforms.create(platformConfig.x, platformConfig.y, platformConfig.textureKey)
        .setOrigin(0, 0)
        .refreshBody()
        .setDepth(platformConfig.depth ?? 10);
      this.staticPlatforms.push(platform);
      this.createPlatformMarker(platform, `${this.getScenePlatformPrefix()}-static-${index + 1}`);
    });

    (this.sceneConfig.platforms.oneWayPlatforms ?? []).forEach((platformConfig, index) => {
      const platform = gameState.oneWayPlatforms.create(platformConfig.x, platformConfig.y, platformConfig.textureKey)
        .setOrigin(0, 0)
        .refreshBody()
        .setDepth(platformConfig.depth ?? 10);
      this.createPlatformMarker(platform, `${this.getScenePlatformPrefix()}-oneway-${index + 1}`);
    });

    const movingPlatformConfig = this.sceneConfig.platforms.movingPlatform;
    if (movingPlatformConfig) {
      gameState.movingPlatform = this.physics.add.image(
        movingPlatformConfig.x,
        movingPlatformConfig.y,
        movingPlatformConfig.textureKey,
      )
        .setOrigin(0, 0)
        .setImmovable(true)
        .setPushable(false)
        .setDepth(movingPlatformConfig.depth ?? 10);
      gameState.movingPlatform.body.setAllowGravity(false);
      this.movingPlatformPreviousY = gameState.movingPlatform.y;
      this.createPlatformMarker(gameState.movingPlatform, `${this.getScenePlatformPrefix()}-moving-1`);

      this.tweens.add({
        targets: gameState.movingPlatform,
        y: movingPlatformConfig.targetY,
        ease: 'linear',
        duration: movingPlatformConfig.durationMs,
        repeat: -1,
        yoyo: true,
        onUpdate: () => this.updateMovingPlatformBody(),
      });
    }

    this.createHealerNpc();
  }

  getScenePlatformPrefix() {
    return this.scene.key === SCENE_KEYS.GRASSY_BIOME_1 ? 'S1' : 'S2';
  }

  createPlatformMarker(platform, label) {
    if (!platform) {
      return;
    }

    const markerX = platform.x + ((platform.displayWidth ?? platform.width ?? 0) / 2);
    const markerY = platform.y - 18;
    this.add.text(markerX, markerY, label, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#fff7d1',
      fontStyle: 'bold',
      backgroundColor: 'rgba(3,19,29,0.72)',
      padding: { x: 6, y: 3 },
      stroke: '#03131d',
      strokeThickness: 2,
    })
      .setOrigin(0.5, 1)
      .setDepth((platform.depth ?? 10) + 20);
  }

  createHealerNpc() {
    const healerConfig = this.sceneConfig?.props?.healerNpc;
    if (!healerConfig || !this.textures.exists(healerConfig.textureKey)) {
      return;
    }

    const targetPlatform = this.staticPlatforms[healerConfig.staticPlatformIndex ?? -1];
    if (!targetPlatform) {
      return;
    }

    const platformWidth = targetPlatform.displayWidth ?? targetPlatform.width ?? 0;
    const npcX = targetPlatform.x + (platformWidth * (healerConfig.placementPercent ?? 0.2));
    const npcFootOffsetY = healerConfig.footOffsetY ?? -2;
    const npcY = targetPlatform.y + npcFootOffsetY;
    const npc = this.add.sprite(npcX, npcY, healerConfig.textureKey, 0)
      .setOrigin(0.5, 1)
      .setDepth((targetPlatform.depth ?? 10) + 4)
      .setScale(2.5)
      .setInteractive({ useHandCursor: true });
    this.ensureHealerNpcAnimation(healerConfig.textureKey);
    if (this.anims.exists('npc.healer.idle')) {
      npc.play('npc.healer.idle');
    }

    const bubbleWidth = 124;
    const bubbleHeight = 34;
    const bubbleY = npcY - Math.max(116, npc.displayHeight + 18);
    const bubble = this.add.graphics().setDepth(npc.depth + 1);
    bubble.fillStyle(0xf9fbff, 0.96);
    bubble.lineStyle(2, 0x3b5167, 0.9);
    bubble.fillRoundedRect(npcX - (bubbleWidth / 2), bubbleY - (bubbleHeight / 2), bubbleWidth, bubbleHeight, 12);
    bubble.strokeRoundedRect(npcX - (bubbleWidth / 2), bubbleY - (bubbleHeight / 2), bubbleWidth, bubbleHeight, 12);
    bubble.fillTriangle(npcX - 10, bubbleY + (bubbleHeight / 2) - 1, npcX + 10, bubbleY + (bubbleHeight / 2) - 1, npcX, bubbleY + (bubbleHeight / 2) + 14);
    bubble.lineStyle(2, 0x3b5167, 0.9);
    bubble.strokeTriangle(npcX - 10, bubbleY + (bubbleHeight / 2) - 1, npcX + 10, bubbleY + (bubbleHeight / 2) - 1, npcX, bubbleY + (bubbleHeight / 2) + 14);

    const bubbleText = this.add.text(npcX, bubbleY, 'click to heal', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#17324a',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setDepth(npc.depth + 2);
    const bubbleHitArea = this.add.zone(npcX, bubbleY, bubbleWidth, bubbleHeight + 16)
      .setOrigin(0.5)
      .setDepth(npc.depth + 3)
      .setInteractive({ useHandCursor: true });

    this.healerNpc = { npc, bubble, bubbleText, bubbleHitArea };
    this.buildHealerDialog();
    npc.on('pointerdown', () => this.openHealerDialog());
    bubbleHitArea.on('pointerdown', () => this.openHealerDialog());
  }

  ensureHealerNpcAnimation(textureKey) {
    if (this.anims.exists('npc.healer.idle')) {
      return;
    }

    const texture = this.textures.get(textureKey);
    const frameTotal = texture?.frameTotal ?? 0;
    if (frameTotal <= 1) {
      return;
    }

    this.anims.create({
      key: 'npc.healer.idle',
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: frameTotal - 2 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  buildHealerDialog() {
    const panelWidth = 420;
    const panelHeight = 180;
    const panelX = Math.round((this.cameras.main.width - panelWidth) / 2);
    const panelY = Math.round((this.cameras.main.height - panelHeight) / 2);
    const depth = 230;
    const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x02050b, 0.52)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x08111f, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x4bc3ff, 0.62)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);
    const title = this.add.text(panelX + 22, panelY + 18, 'Healer', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#f5fbff',
      fontStyle: 'bold',
    })
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    const message = this.add.text(panelX + 22, panelY + 58, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#d7ecff',
      wordWrap: { width: panelWidth - 44 },
    })
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    const yesButton = this.add.rectangle(panelX + 120, panelY + 138, 96, 38, 0x1d6f42, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    const noButton = this.add.rectangle(panelX + 300, panelY + 138, 96, 38, 0x5e2530, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    const yesLabel = this.add.text(panelX + 120, panelY + 138, 'Yes', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f5fff9',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setVisible(false);
    const noLabel = this.add.text(panelX + 300, panelY + 138, 'No', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fff3f5',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setVisible(false);

    this.healerUi = {
      visible: false,
      bounds: new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight),
      overlay,
      panel,
      title,
      message,
      yesButton,
      noButton,
      yesLabel,
      noLabel,
      elements: [overlay, panel, title, message, yesButton, noButton, yesLabel, noLabel],
    };

    yesButton.on('pointerdown', () => this.confirmHealerRestore());
    noButton.on('pointerdown', () => this.closeHealerDialog());
  }

  playerNeedsHealing() {
    const player = gameState.player;
    if (!player) {
      return false;
    }

    return player.currentHp < player.maxHp || player.currentMana < player.maxMana;
  }

  openHealerDialog() {
    if (!this.healerUi || !gameState.player) {
      return;
    }

    this.playerProfile?.close();
    const needsHealing = this.playerNeedsHealing();
    this.healerUi.message.setText(
      needsHealing
        ? 'Your HP or Mana is not full. Restore both to full now?'
        : 'Your HP and Mana are already full. Restore both again anyway?',
    );
    this.healerUi.visible = true;
    this.healerUi.elements.forEach((element) => element.setVisible(true));
  }

  closeHealerDialog() {
    if (!this.healerUi?.visible) {
      return;
    }

    this.healerUi.visible = false;
    this.healerUi.elements.forEach((element) => element.setVisible(false));
  }

  confirmHealerRestore() {
    const player = gameState.player;
    if (!player) {
      return;
    }

    player.currentHp = player.maxHp;
    player.currentMana = player.maxMana;
    this.sound.play('healing', { volume: 0.95, seek: 1 });
    this.refreshPlayerUi();
    this.closeHealerDialog();
  }

  createPlayer() {
    const playerSpawn = gameState.pendingPlayerSpawn ?? this.sceneConfig.playerSpawn;
    gameState.player = new Player(
      this,
      playerSpawn.x,
      playerSpawn.y,
      this.selectedCharacterConfig.spawnTextureKey,
      this.selectedCharacterConfig,
      this.playerAnimationKeys,
      this.selectedPlayerName,
    );

    const pendingPlayerSnapshot = gameState.pendingPlayerSnapshot;
    if (pendingPlayerSnapshot) {
      this.applyPlayerSnapshot(gameState.player, pendingPlayerSnapshot);
      gameState.pendingPlayerSnapshot = null;
    }
    const pendingPlayerEntry = gameState.pendingPlayerEntry;
    if (pendingPlayerEntry) {
      this.applyPlayerSceneEntryPosition(gameState.player, pendingPlayerEntry);
      gameState.player.flipX = pendingPlayerEntry.direction === 'left';
      gameState.pendingPlayerEntry = null;
    }
    gameState.pendingPlayerSpawn = null;

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

  capturePlayerSnapshot(player) {
    return {
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      currentMana: player.currentMana,
      maxMana: player.maxMana,
      level: player.level,
      currentExp: player.currentExp,
      expToNextLevel: player.expToNextLevel,
      totalEnemyKills: player.totalEnemyKills,
      availableAttackUpgradePoints: player.availableAttackUpgradePoints,
      baseDamageUpgradeLevel: player.baseDamageUpgradeLevel,
      attackUpgradeLevels: { ...(player.attackUpgradeLevels ?? {}) },
      defenseUpgradeLevel: player.defenseUpgradeLevel,
      hpUpgradeLevel: player.hpUpgradeLevel,
      manaUpgradeLevel: player.manaUpgradeLevel,
    };
  }

  applyPlayerSnapshot(player, snapshot) {
    player.currentHp = snapshot.currentHp;
    player.maxHp = snapshot.maxHp;
    player.currentMana = snapshot.currentMana;
    player.maxMana = snapshot.maxMana;
    player.level = snapshot.level;
    player.currentExp = snapshot.currentExp;
    player.expToNextLevel = snapshot.expToNextLevel;
    player.totalEnemyKills = snapshot.totalEnemyKills;
    player.availableAttackUpgradePoints = snapshot.availableAttackUpgradePoints;
    player.baseDamageUpgradeLevel = snapshot.baseDamageUpgradeLevel;
    player.attackUpgradeLevels = { ...(snapshot.attackUpgradeLevels ?? player.attackUpgradeLevels) };
    player.defenseUpgradeLevel = snapshot.defenseUpgradeLevel;
    player.hpUpgradeLevel = snapshot.hpUpgradeLevel;
    player.manaUpgradeLevel = snapshot.manaUpgradeLevel;
    player.updateNameLabelPosition();
  }

  checkSceneTransition() {
    if (this.isTransitioning || this.isRestarting || !gameState.player?.body) {
      return;
    }

    const nextSceneKey = this.sceneConfig?.nextSceneKey;
    const rightTransitionThresholdX = this.sceneConfig?.rightTransitionThresholdX;
    if (
      nextSceneKey
      && rightTransitionThresholdX !== null
      && gameState.player.body.velocity.x > 0
      && gameState.player.body.right >= rightTransitionThresholdX
    ) {
      this.transitionToScene(nextSceneKey, this.sceneConfig?.rightSceneEntrySpawn ?? null, 'right');
      return;
    }

    const previousSceneKey = this.sceneConfig?.previousSceneKey;
    const leftTransitionThresholdX = this.sceneConfig?.leftTransitionThresholdX;
    if (
      previousSceneKey
      && leftTransitionThresholdX !== null
      && gameState.player.body.velocity.x < 0
      && gameState.player.body.left <= leftTransitionThresholdX
    ) {
      const returnSpawn = this.sceneConfig?.leftSceneEntrySpawn ?? gameState.sceneReturnPositions?.[previousSceneKey] ?? null;
      this.transitionToScene(previousSceneKey, returnSpawn, 'left');
    }
  }

  transitionToScene(targetSceneKey, spawnOverride = null, entryDirection = null) {
    this.isTransitioning = true;
    const playerBody = gameState.player?.body;
    const targetSceneConfig = getWorldSceneConfig(targetSceneKey);
    const targetStandingY = targetSceneConfig?.playerSpawn?.y ?? null;
    const isStanding = Boolean(playerBody?.blocked.down || playerBody?.touching.down);
    const entryDistance = Math.max(12, (playerBody?.width ?? 0) * 3);
    const preservedY = gameState.player?.y ?? spawnOverride?.y ?? this.sceneConfig?.playerSpawn?.y ?? 0;
    const resolvedSpawn = spawnOverride
      ? { ...spawnOverride, y: preservedY }
      : { ...(this.sceneConfig?.playerSpawn ?? {}), y: preservedY };
    gameState.pendingPlayerSnapshot = this.capturePlayerSnapshot(gameState.player);
    gameState.pendingPlayerSpawn = resolvedSpawn;
    gameState.pendingPlayerEntry = entryDirection
      ? {
        direction: entryDirection,
        entryDistance,
        targetStandingY,
        bodyBottom: playerBody?.bottom ?? null,
        velocityY: isStanding ? 0 : (playerBody?.velocity?.y ?? 0),
      }
      : null;

    this.cleanupSceneState();
    this.scene.start(SCENE_KEYS.WORLD_LOADING, {
      targetSceneKey,
      targetWorldAssetId: targetSceneConfig?.assetWorldId ?? null,
    });
  }

  applyPlayerSceneEntryPosition(player, entryConfig = {}) {
    if (!player?.body) {
      return;
    }

    const edgeInset = Math.max(12, entryConfig.entryDistance ?? (player.body.width * 3));
    const bodyLeftOffset = player.x - player.body.left;
    const bodyRightOffset = player.body.right - player.x;
    const bodyBottomOffset = player.y - player.body.bottom;
    let nextX = player.x;
    let nextY = player.y;

    if (entryConfig.direction === 'right') {
      nextX = edgeInset + bodyLeftOffset;
    } else if (entryConfig.direction === 'left') {
      nextX = gameState.width - edgeInset - bodyRightOffset;
    }

    if (typeof entryConfig.bodyBottom === 'number') {
      nextY = entryConfig.bodyBottom + bodyBottomOffset;
    }
    if (typeof entryConfig.targetStandingY === 'number') {
      nextY = entryConfig.targetStandingY;
    }

    player.setPosition(nextX, nextY);
    player.body.updateFromGameObject();
    player.setVelocityY(entryConfig.velocityY ?? 0);
  }

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

  createAudio() {
    gameState.backgroundMusic?.stop();
    gameState.backgroundMusic = this.sound.add(this.sceneConfig.musicKey ?? 'grassyBiome', { loop: true, volume: 1 });
    gameState.backgroundMusic.play();
  }

  createCamera() {
    this.cameras.main.setBounds(0, 0, gameState.width, gameState.height);
    this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
    this.cameras.main.setFollowOffset(100, 0.5);
    this.cameras.main.setDeadzone(250, 250);
    this.physics.world.setBounds(0, 0, gameState.width, gameState.height);
  }

  refreshPlayerUi() {
    if (!gameState.player) {
      return;
    }

    this.playerHud?.update(gameState.player, this.game.loop.actualFps);
    this.playerProfile?.update(gameState.player, this.getReferenceEnemyMaxHp());
  }

  togglePlayerProfile() {
    this.playerProfile?.toggle();
    this.refreshPlayerUi();
  }

  handleProfileOutsideClick(pointer) {
    if (this.healerUi?.visible) {
      const clickedNpc = this.healerNpc?.npc?.getBounds?.() && Phaser.Geom.Rectangle.Contains(this.healerNpc.npc.getBounds(), pointer.worldX, pointer.worldY);
      const clickedBubble = this.healerNpc?.bubbleHitArea?.getBounds?.() && Phaser.Geom.Rectangle.Contains(this.healerNpc.bubbleHitArea.getBounds(), pointer.worldX, pointer.worldY);
      if (!this.healerUi.bounds.contains(pointer.x, pointer.y) && !clickedNpc && !clickedBubble) {
        this.closeHealerDialog();
      }
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

  getPlayerAttackDamage(attackType, enemyMaxHp = null) {
    const resolvedEnemyMaxHp = enemyMaxHp ?? this.getReferenceEnemyMaxHp();
    const attackConfig = PLAYER_ATTACK_CONFIG[attackType];
    if (!attackConfig) {
      return 0;
    }

    const damageReferenceHp = attackType === 'specialAttack'
      ? resolvedEnemyMaxHp
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

  getReferenceEnemyMaxHp() {
    const spawnPoints = this.sceneConfig?.enemySpawnPoints ?? [];
    if (!spawnPoints.length) {
      return ENEMY_SETTINGS.maxHp;
    }

    return spawnPoints.reduce((highestHp, spawnPoint) => {
      const enemyType = spawnPoint.enemyType ?? ENEMY_TYPES.MUSHROOM;
      const enemyMaxHp = ENEMY_ARCHETYPES[enemyType]?.maxHp ?? ENEMY_SETTINGS.maxHp;
      return Math.max(highestHp, enemyMaxHp);
    }, ENEMY_SETTINGS.maxHp);
  }

  getPlayerDefensePercent(player = gameState.player) {
    if (!player) {
      return 0;
    }

    const defensePercent = typeof player.getDefensePercent === 'function'
      ? player.getDefensePercent()
      : (player.defenseUpgradeLevel ?? 0) * PLAYER_PROGRESS_SETTINGS.levelUpDefenseBonusPercent;
    return Phaser.Math.Clamp(defensePercent, 0, 1);
  }

  getPlayerDefenseValue(player = gameState.player) {
    if (!player) {
      return 0;
    }

    if (typeof player.getDefenseValue === 'function') {
      return player.getDefenseValue();
    }

    return Math.round(player.maxHp * this.getPlayerDefensePercent(player));
  }

  grantEnemyExp(player, enemy = null) {
    if (!player || player.isDead) {
      return;
    }

    const expGain = ENEMY_ARCHETYPES[enemy?.enemyType ?? ENEMY_TYPES.MUSHROOM]?.expReward ?? ENEMY_SETTINGS.expPerEnemy;
    player.totalEnemyKills = (player.totalEnemyKills ?? 0) + 1;
    player.currentExp += expGain;
    this.showExpGainIndicator(player, expGain);

    while (player.currentExp >= player.expToNextLevel) {
      player.currentExp -= player.expToNextLevel;
      this.handlePlayerLevelUp(player);
    }

    this.refreshPlayerUi();
  }

  handlePlayerLevelUp(player) {
    player.level += 1;
    player.expToNextLevel += Math.max(1, (player.totalEnemyKills ?? 0) * 2);
    player.availableAttackUpgradePoints += 3;
    player.currentMana = player.maxMana;
    this.sound.play('levelUp', { volume: 1, seek: 1 });
    this.playLevelUpEffect(player);
  }

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
        effectObjects.forEach((effectObject) => effectObject.destroy());
      },
    });
  }

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

  upgradePlayerBaseDamage() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.baseDamageUpgradeLevel += 1;
    this.refreshPlayerUi();
  }

  upgradePlayerDefense() {
    if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
      return;
    }

    gameState.player.availableAttackUpgradePoints -= 1;
    gameState.player.defenseUpgradeLevel += 1;
    this.refreshPlayerUi();
  }

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

  createParallaxBackground() {
    const backgroundLayout = this.sceneConfig.backgrounds ?? {};
    const createBackgroundLayer = (textureKey, config, shouldStretch = true) => {
      const layer = this.add.image(config?.x ?? 0, config?.y ?? 0, textureKey)
        .setOrigin(0, 0)
        .setDepth(config?.depth ?? 1)
        .setAlpha(config?.alpha ?? 1);
      const textureFrame = layer.texture.get();
      if (textureFrame) {
        layer.displayWidth = config?.displayWidth ?? (shouldStretch ? gameState.width : textureFrame.width);
        layer.displayHeight = config?.displayHeight ?? textureFrame.height;
      }
      layer.setScrollFactor(config?.scrollFactorX ?? 1, config?.scrollFactorY ?? 1);
      return layer;
    };

    gameState.clouds = createBackgroundLayer('clouds', backgroundLayout.clouds ?? {
      x: 0, y: gameState.height - 1450, depth: 1, scrollFactorX: 0.2, scrollFactorY: 0.1,
    });
    gameState.mountain = createBackgroundLayer('mountain', backgroundLayout.mountain ?? {
      x: 0, y: gameState.height - 970, depth: 2, scrollFactorX: 0.5, scrollFactorY: 0.4,
    });
    gameState.ruins = createBackgroundLayer('ruins', backgroundLayout.ruins ?? {
      x: 0, y: 636, depth: 3, scrollFactorX: 0.5, scrollFactorY: 0.5,
    });
    gameState.trees = createBackgroundLayer('trees', backgroundLayout.trees ?? {
      x: 0, y: gameState.height - 650, depth: 5, scrollFactorX: 0.7, scrollFactorY: 0.7,
    });

    (backgroundLayout.extras ?? []).forEach((extraLayerConfig) => {
      createBackgroundLayer(extraLayerConfig.textureKey, extraLayerConfig, false);
    });
  }

  cleanupSceneState() {
    if (this.cleanupComplete) {
      return;
    }

    this.cleanupComplete = true;
    this.healerNpc?.npc?.removeAllListeners();
    this.healerNpc?.bubbleHitArea?.removeAllListeners();
    this.healerUi?.yesButton?.removeAllListeners();
    this.healerUi?.noButton?.removeAllListeners();
    this.healerUi?.elements?.forEach((element) => element?.destroy?.());
    this.healerNpc?.bubble?.destroy?.();
    this.healerNpc?.bubbleText?.destroy?.();
    this.healerNpc?.bubbleHitArea?.destroy?.();
    this.healerNpc?.npc?.destroy?.();
    this.healerNpc = null;
    this.healerUi = null;
    this.staticPlatforms = [];
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
    gameState.platforms = null;
    gameState.enemyGroup = null;
    gameState.portal = null;
    gameState.player = null;
    this.movingPlatformPreviousY = null;

    this.sound.stopAll();
    this.sound.removeAll();
    this.input.off('pointerdown', this.handleProfileOutsideClick, this);
  }

  getAnimationDuration(animationKey) {
    const animation = this.anims.get(animationKey);
    if (!animation) {
      return 0;
    }

    return Math.ceil((animation.frames.length / animation.frameRate) * 1000);
  }
}
