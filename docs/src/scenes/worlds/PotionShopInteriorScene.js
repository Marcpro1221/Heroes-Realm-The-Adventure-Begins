import { SCENE_KEYS } from '../../constants/sceneKeys.js';
import BaseWorldScene from './BaseWorldScene.js';
import { gameState } from '../../state/gameState.js';

export default class PotionShopInteriorScene extends BaseWorldScene {
  constructor() {
    super(SCENE_KEYS.POTION_SHOP_INTERIOR);
    this.exitBounds = null;
    this.ladderClimbBounds = null;
    this.miroAlchemistNpc = null;
    this.miroAlchemistBubble = null;
    this.exitDialog = null;
    this.exitDialogDismissed = false;
    this.exitAwaitingReentry = true;
  }

  createWorld() {
    const floorY = 590;
    const upperFloorY = 214;
    const exitX = 234;
    const exitY = 464;
    const ladderX = 724;

    this.cameras.main.setBackgroundColor(0x120f14);
    this.add.rectangle(gameState.width / 2, gameState.height / 2, gameState.width, gameState.height, 0x120f14, 1)
      .setDepth(0);

    const interiorBackground = this.add.image(gameState.width / 2, gameState.height / 2, 'potionShopInterior')
      .setOrigin(0.5)
      .setDepth(1)
      .setScrollFactor(0);
    const backgroundFrame = interiorBackground.texture.get();
    if (backgroundFrame) {
      const scale = Math.max(gameState.width / backgroundFrame.width, gameState.height / backgroundFrame.height);
      interiorBackground.displayWidth = backgroundFrame.width * scale;
      interiorBackground.displayHeight = gameState.height;
    }

    const sideShadeWidth = Math.max(0, (gameState.width - (interiorBackground.displayWidth ?? 0)) / 2);
    if (sideShadeWidth > 0) {
      this.add.rectangle(sideShadeWidth / 2, gameState.height / 2, sideShadeWidth, gameState.height, 0x000000, 1).setDepth(0.5).setScrollFactor(0);
      this.add.rectangle(gameState.width - (sideShadeWidth / 2), gameState.height / 2, sideShadeWidth, gameState.height, 0x000000, 1).setDepth(0.5).setScrollFactor(0);
    }

    this.exitBounds = new Phaser.Geom.Rectangle(150, 358, 160, 208);
    this.ladderClimbBounds = new Phaser.Geom.Rectangle(ladderX - 36, upperFloorY, 72, floorY - upperFloorY);

    this.add.rectangle(exitX, exitY, this.exitBounds.width, this.exitBounds.height, 0xc49c66, 0.08)
      .setDepth(2)
      .setStrokeStyle(2, 0xf2d28c, 0.24)
      .setScrollFactor(0);
    this.add.text(exitX, 344, 'Exit Shop', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#f8e7bf',
      fontStyle: 'bold',
      stroke: '#120f14',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3).setScrollFactor(0);

    this.createMiroAlchemistNpc((exitX + ladderX) / 2, floorY);

    this.createCollisionZone(gameState.platforms, 0, floorY, gameState.width, 76);
    this.createCollisionZone(gameState.platforms, 10, 0, 36, gameState.height);
    this.createCollisionZone(gameState.platforms, gameState.width - 50, 0, 26, gameState.height);

    this.createCollisionZone(gameState.oneWayPlatforms, 0, upperFloorY - 5, 680, 24);
    this.createCollisionZone(gameState.oneWayPlatforms, 768, upperFloorY + 8, 360, 24);
    this.createExitDialog();
  }

  createMiroAlchemistNpc(x, footY) {
    if (!this.textures.exists('miroAlchemistNpc')) {
      return;
    }

    const footOriginY = 170 / 192;
    this.miroAlchemistNpc = this.add.sprite(x, footY, 'miroAlchemistNpc', 0)
      .setOrigin(0.5, footOriginY)
      .setDepth(5)
      .setScale(1.08)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    if (this.anims.exists('npc.miroAlchemist.idle')) {
      this.miroAlchemistNpc.play('npc.miroAlchemist.idle');
    }

    const visibleHeight = (170 - 18) * this.miroAlchemistNpc.scaleY;
    this.createMiroAlchemistBubble(x, footY - visibleHeight - 50);
    this.miroAlchemistNpc.on('pointerdown', () => this.openMiroAlchemistBubble());
  }

  createMiroAlchemistBubble(x, y) {
    const bubbleWidth = 386;
    const bubbleHeight = 112;
    const bubbleY = Math.max(82, y);
    const depth = 32;
    const panel = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);

    panel.fillStyle(0xfffbef, 0.97);
    panel.lineStyle(2, 0x6d4a87, 0.92);
    panel.fillRoundedRect(x - (bubbleWidth / 2), bubbleY - (bubbleHeight / 2), bubbleWidth, bubbleHeight, 16);
    panel.strokeRoundedRect(x - (bubbleWidth / 2), bubbleY - (bubbleHeight / 2), bubbleWidth, bubbleHeight, 16);
    panel.fillCircle(x - 74, bubbleY + (bubbleHeight / 2) + 10, 10);
    panel.fillCircle(x - 54, bubbleY + (bubbleHeight / 2) + 25, 6);
    panel.lineStyle(2, 0x6d4a87, 0.7);
    panel.strokeCircle(x - 74, bubbleY + (bubbleHeight / 2) + 10, 10);
    panel.strokeCircle(x - 54, bubbleY + (bubbleHeight / 2) + 25, 6);

    const message = this.add.text(x, bubbleY - 30, 'Can I help you with potions you need?', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#2e2040',
      fontStyle: 'bold',
      align: 'center',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);

    const buyButton = this.add.rectangle(x - 58, bubbleY + 28, 94, 34, 0x248a45, 0.96)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    const sellButton = this.add.rectangle(x + 58, bubbleY + 28, 94, 34, 0xa33434, 0.96)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    const buyLabel = this.add.text(x - 58, bubbleY + 28, 'Buy', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#f3fff5',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    const sellLabel = this.add.text(x + 58, bubbleY + 28, 'Sell', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fff5f5',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);

    this.miroAlchemistBubble = {
      visible: false,
      elements: [panel, message, buyButton, sellButton, buyLabel, sellLabel],
    };
  }

  openMiroAlchemistBubble() {
    if (!this.miroAlchemistBubble || this.miroAlchemistBubble.visible) {
      return;
    }

    this.miroAlchemistBubble.visible = true;
    this.miroAlchemistBubble.elements.forEach((element) => element.setVisible(true));
  }

  update() {
    super.update();
    this.updateLadderClimb();
  }

  createCollisionZone(group, x, y, width, height) {
    const zone = this.add.zone(x, y, width, height)
      .setOrigin(0, 0)
      .setDepth(4);
    this.physics.add.existing(zone, true);
    zone.body.setSize(width, height);
    zone.body.updateFromGameObject();
    group.add(zone);
    return zone;
  }

  createExitDialog() {
    const panelWidth = 360;
    const panelHeight = 160;
    const panelX = Math.round((this.cameras.main.width - panelWidth) / 2);
    const panelY = Math.round((this.cameras.main.height - panelHeight) / 2);
    const depth = 245;
    const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x02050b, 0.52)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x120f14, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd1b06f, 0.78)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);
    const title = this.add.text(panelX + (panelWidth / 2), panelY + 44, 'Exit Potion Shop?', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#faefd6',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    const yesButton = this.add.rectangle(panelX + 105, panelY + 112, 96, 38, 0x1d6f42, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    const noButton = this.add.rectangle(panelX + 255, panelY + 112, 96, 38, 0x5e2530, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    const yesLabel = this.add.text(panelX + 105, panelY + 112, 'Yes', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f5fff9',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setVisible(false);
    const noLabel = this.add.text(panelX + 255, panelY + 112, 'No', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fff3f5',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setVisible(false);

    this.exitDialog = {
      visible: false,
      elements: [overlay, panel, title, yesButton, noButton, yesLabel, noLabel],
      yesButton,
      noButton,
    };

    yesButton.on('pointerdown', () => this.confirmExitShop());
    noButton.on('pointerdown', () => this.closeExitDialog(true));
  }

  openExitDialog() {
    if (!this.exitDialog || this.exitDialog.visible) {
      return;
    }

    this.playerProfile?.close();
    this.exitDialog.visible = true;
    this.exitDialog.elements.forEach((element) => element.setVisible(true));
  }

  closeExitDialog(dismissUntilExit = false) {
    if (dismissUntilExit) {
      this.exitDialogDismissed = true;
    }

    if (!this.exitDialog?.visible) {
      return;
    }

    this.exitDialog.visible = false;
    this.exitDialog.elements.forEach((element) => element.setVisible(false));
  }

  confirmExitShop() {
    const roomReturnTarget = gameState.roomReturnTarget;
    if (!roomReturnTarget?.sceneKey || !roomReturnTarget?.spawn) {
      this.closeExitDialog(true);
      return;
    }

    this.closeExitDialog(false);
    gameState.roomReturnTarget = null;
    this.transitionToScene(roomReturnTarget.sceneKey, roomReturnTarget.spawn, null);
  }

  updateLadderClimb() {
    const player = gameState.player;
    if (!player?.body || !this.ladderClimbBounds) {
      return;
    }

    const playerBodyRect = new Phaser.Geom.Rectangle(
      player.body.left,
      player.body.top,
      player.body.width,
      player.body.height,
    );
    const isInLadderZone = Phaser.Geom.Intersects.RectangleToRectangle(playerBodyRect, this.ladderClimbBounds);
    if (!isInLadderZone) {
      player.body.setAllowGravity(true);
      return;
    }

    const wantsUp = player.cursors?.up?.isDown || player.keyW?.isDown;
    const wantsDown = player.cursors?.down?.isDown;
    if (!wantsUp && !wantsDown) {
      player.body.setAllowGravity(true);
      return;
    }

    player.body.setAllowGravity(false);
    player.setVelocityY(wantsUp ? -170 : 170);
    player.setVelocityX(Phaser.Math.Clamp(player.body.velocity.x, -140, 140));
  }

  checkSceneTransition() {
    if (this.isTransitioning || this.isRestarting || !gameState.player?.body) {
      return;
    }

    const roomReturnTarget = gameState.roomReturnTarget;
    const playerBodyRect = new Phaser.Geom.Rectangle(
      gameState.player.body.left,
      gameState.player.body.top,
      gameState.player.body.width,
      gameState.player.body.height,
    );
    const isInExitArea = this.exitBounds
      && Phaser.Geom.Intersects.RectangleToRectangle(playerBodyRect, this.exitBounds);

    if (!isInExitArea) {
      this.exitDialogDismissed = false;
      this.exitAwaitingReentry = false;
      this.closeExitDialog(false);
      return;
    }

    if (this.exitAwaitingReentry) {
      return;
    }

    if (roomReturnTarget?.sceneKey && roomReturnTarget?.spawn && !this.exitDialogDismissed) {
      this.openExitDialog();
    }
  }
}
