import {
  PLAYER_ABILITY_SETTINGS,
  PLAYER_ACTION_KEYS,
  PLAYER_ATTACK_CONFIG,
} from '../constants/gameConstants.js';

/**
 * Fixed-screen player HUD for health, experience, mana, and combat hotkeys.
 * `MainScene` owns this UI object and pushes the live player reference into
 * `update(...)` every frame from `refreshPlayerUi()`.
 */
export default class PlayerHud {
  constructor(scene) {
    this.scene = scene;
    this.controlsOpen = false;
    this.controlsTween = null;
    this.controlRows = {};
    this.controlsOverlayElements = [];
    this.inventoryOpen = false;
    this.inventoryOverlayElements = [];
    this.draggableInventoryElements = [];
    this.inventorySlotElements = [];
    this.inventoryItems = [];
    this.selectedInventorySlotElement = null;
    this.inventoryPanelBounds = null;
    this.inventoryPanelOrigin = null;
    this.inventoryDragState = null;
    this.build();
  }

  /**
   * Creates the HUD game objects and pins them to the camera.
   */
  build() {
    const viewportWidth = this.scene.cameras.main.width;
    const viewportHeight = this.scene.cameras.main.height;
    const hudX = 24;
    const hudY = 18;
    const barWidth = 150;
    const barHeight = 14;
    const overlayWidth = 438;
    const overlayHeight = 280;
    const overlayX = 24;
    const overlayOpenY = this.scene.scale.height - overlayHeight - 86;
    const overlayOffsetY = 30;
    const toggleY = this.scene.scale.height - 56;
    const inventoryButtonWidth = 52;
    const inventoryButtonHeight = 52;
    const inventoryButtonX = viewportWidth - inventoryButtonWidth - 24;
    const inventoryButtonY = 18;
    const inventoryTotalSlots = 20;
    const inventoryColumns = 3;
    const inventoryRows = Math.ceil(inventoryTotalSlots / inventoryColumns);
    const inventorySlotGap = 6;
    const inventoryPaddingX = 20;
    const inventoryPaddingY = 18;
    const inventoryHeaderHeight = 42;
    const inventoryDetailGap = 18;
    const inventoryDetailWidth = 160;
    const inventoryPanelHeight = Math.round(viewportHeight * 0.6);
    const inventoryGridHeight = inventoryPanelHeight - inventoryHeaderHeight - (inventoryPaddingY * 2);
    const inventorySlotSize = Math.max(1, Math.floor(
      (inventoryGridHeight - ((inventoryRows - 1) * inventorySlotGap)) / inventoryRows,
    ));
    const inventoryPanelWidth = (inventoryColumns * inventorySlotSize)
      + ((inventoryColumns - 1) * inventorySlotGap)
      + inventoryDetailGap
      + inventoryDetailWidth
      + (inventoryPaddingX * 2);
    const inventoryPanelX = Math.round((viewportWidth - inventoryPanelWidth) / 2);
    const inventoryPanelY = Math.round((viewportHeight - inventoryPanelHeight) / 2);
    const abyssBlue = 0x08111f;
    const abyssBlueRaised = 0x10233c;
    const abyssLine = 0x1f4f75;
    const abyssGlow = 0x4bc3ff;
    const labelStyle = {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#b7d8f3',
    };
    const coinHudY = hudY + 144;

    this.elements = {
      panelShadow: this.scene.add.rectangle(hudX + 4, hudY + 6, 238, 132, 0x02050b, 0.45).setOrigin(0, 0),
      panel: this.scene.add.rectangle(hudX, hudY, 238, 132, abyssBlue, 0.94).setOrigin(0, 0),
      panelBorder: this.scene.add.rectangle(hudX, hudY, 238, 132).setOrigin(0, 0).setStrokeStyle(2, abyssLine, 0.85),
      headerButton: this.scene.add.rectangle(hudX, hudY, 238, 32, abyssBlueRaised, 0.92).setOrigin(0, 0),
      headerGlow: this.scene.add.rectangle(hudX + 1, hudY + 1, 236, 4, abyssGlow, 0.18).setOrigin(0, 0),
      dividerOne: this.scene.add.rectangle(hudX + 12, hudY + 59, 214, 1, abyssLine, 0.55).setOrigin(0, 0.5),
      dividerTwo: this.scene.add.rectangle(hudX + 12, hudY + 87, 214, 1, abyssLine, 0.55).setOrigin(0, 0.5),
      nameText: this.scene.add.text(hudX + 16, hudY + 10, '', { fontFamily: 'Arial', fontSize: '20px', color: '#e7f6ff', fontStyle: 'bold' }),
      profileHintText: this.scene.add.text(hudX + 220, hudY + 9, 'Show Profile', { fontFamily: 'Arial', fontSize: '12px', color: '#77b7d9', fontStyle: 'bold' }).setOrigin(1, 0),
      levelBadge: this.scene.add.rectangle(hudX + 206, hudY + 16, 24, 24, 0x153d68, 1).setOrigin(0.5),
      levelText: this.scene.add.text(hudX + 206, hudY + 9, '', { fontFamily: 'Arial', fontSize: '12px', color: '#f4fbff', fontStyle: 'bold' }).setOrigin(0.5, 0),
      hpLabel: this.scene.add.text(hudX + 16, hudY + 42, 'HP', labelStyle),
      expLabel: this.scene.add.text(hudX + 16, hudY + 70, 'EXP', labelStyle),
      manaLabel: this.scene.add.text(hudX + 16, hudY + 98, 'Mana', labelStyle),
      hpBarBg: this.scene.add.rectangle(hudX + 72, hudY + 50, barWidth, barHeight, 0x071522).setOrigin(0, 0.5),
      hpBarFill: this.scene.add.rectangle(hudX + 72, hudY + 50, barWidth, barHeight, 0x22c55e).setOrigin(0, 0.5),
      hpValueText: this.scene.add.text(hudX + 72 + barWidth - 8, hudY + 39, '', { fontFamily: 'Arial', fontSize: '13px', color: '#e8f3fb' }).setOrigin(1, 0),
      expBarBg: this.scene.add.rectangle(hudX + 72, hudY + 78, barWidth, barHeight, 0x071522).setOrigin(0, 0.5),
      expBarFill: this.scene.add.rectangle(hudX + 72, hudY + 78, 0, barHeight, 0xf59e0b).setOrigin(0, 0.5),
      expValueText: this.scene.add.text(hudX + 72 + barWidth - 8, hudY + 67, '', { fontFamily: 'Arial', fontSize: '13px', color: '#e8f3fb' }).setOrigin(1, 0),
      manaBarBg: this.scene.add.rectangle(hudX + 72, hudY + 106, barWidth, barHeight, 0x071522).setOrigin(0, 0.5),
      manaBarFill: this.scene.add.rectangle(hudX + 72, hudY + 106, barWidth, barHeight, 0x3b82f6).setOrigin(0, 0.5),
      manaValueText: this.scene.add.text(hudX + 72 + barWidth - 8, hudY + 95, '', { fontFamily: 'Arial', fontSize: '13px', color: '#e8f3fb' }).setOrigin(1, 0),
      fpsText: this.scene.add.text(hudX, coinHudY, 'FPS: 0', { fontFamily: 'Arial', fontSize: '13px', color: '#ffffff' }),
      coinIcon: this.scene.add.image(hudX + 76, coinHudY + 10, 'coinDrop').setOrigin(0, 0.5).setDisplaySize(20, 20),
      coinText: this.scene.add.text(hudX + 102, coinHudY, 'Coins: 0', { fontFamily: 'Arial', fontSize: '13px', color: '#ffd85a', fontStyle: 'bold' }),
      inventoryButtonShadow: this.scene.add.rectangle(inventoryButtonX + 3, inventoryButtonY + 4, inventoryButtonWidth, inventoryButtonHeight, 0x02050b, 0.42).setOrigin(0, 0),
      inventoryButton: this.scene.add.rectangle(inventoryButtonX, inventoryButtonY, inventoryButtonWidth, inventoryButtonHeight, abyssBlueRaised, 0.92).setOrigin(0, 0),
      inventoryButtonBorder: this.scene.add.rectangle(inventoryButtonX, inventoryButtonY, inventoryButtonWidth, inventoryButtonHeight).setOrigin(0, 0).setStrokeStyle(1.5, abyssGlow, 0.52),
      inventoryButtonLabel: this.scene.add.image(inventoryButtonX + (inventoryButtonWidth / 2), inventoryButtonY + (inventoryButtonHeight / 2), 'inventoryButtonIcon')
        .setDisplaySize(32, 32)
        .setOrigin(0.5),
      controlsToggleShadow: this.scene.add.rectangle(overlayX + 3, toggleY + 4, 146, 34, 0x02050b, 0.42).setOrigin(0, 0),
      controlsToggleButton: this.scene.add.rectangle(overlayX, toggleY, 146, 34, abyssBlueRaised, 0.82).setOrigin(0, 0),
      controlsToggleBorder: this.scene.add.rectangle(overlayX, toggleY, 146, 34).setOrigin(0, 0).setStrokeStyle(1.5, abyssGlow, 0.52),
      controlsToggleLabel: this.scene.add.text(overlayX + 73, toggleY + 8, 'Show Hotkeys', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#e7f6ff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0),
      controlsPanelShadow: this.scene.add.rectangle(overlayX + 8, overlayOpenY + 10, overlayWidth, overlayHeight, 0x010308, 0.34).setOrigin(0, 0),
      controlsPanel: this.scene.add.rectangle(overlayX, overlayOpenY, overlayWidth, overlayHeight, 0x071522, 0.48).setOrigin(0, 0),
      controlsPanelBorder: this.scene.add.rectangle(overlayX, overlayOpenY, overlayWidth, overlayHeight).setOrigin(0, 0).setStrokeStyle(1.5, abyssGlow, 0.52),
      controlsPanelTitle: this.scene.add.text(overlayX + 18, overlayOpenY + 14, 'Combat Hotkeys', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#f2fbff',
        fontStyle: 'bold',
      }),
      controlsPanelHint: this.scene.add.text(overlayX + 18, overlayOpenY + 38, 'Press E to pick up nearby drops. Click the label or screen to close.', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#9fdcf8',
      }),
      controlsDivider: this.scene.add.rectangle(overlayX + 18, overlayOpenY + 64, overlayWidth - 36, 1, abyssLine, 0.7).setOrigin(0, 0.5),
      controlsHeaderType: this.scene.add.text(overlayX + 18, overlayOpenY + 76, 'Type', this.getOverlayHeaderStyle()),
      controlsHeaderKey: this.scene.add.text(overlayX + 104, overlayOpenY + 76, 'Key', this.getOverlayHeaderStyle()),
      controlsHeaderAction: this.scene.add.text(overlayX + 156, overlayOpenY + 76, 'Action', this.getOverlayHeaderStyle()),
      controlsHeaderCost: this.scene.add.text(overlayX + 320, overlayOpenY + 76, 'Details', this.getOverlayHeaderStyle()),
      inventoryOverlay: this.scene.add.rectangle(0, 0, viewportWidth, viewportHeight, 0x02050b, 0.32).setOrigin(0, 0),
      inventoryPanelShadow: this.scene.add.rectangle(inventoryPanelX + 8, inventoryPanelY + 10, inventoryPanelWidth, inventoryPanelHeight, 0x010308, 0.4).setOrigin(0, 0),
      inventoryPanel: this.scene.add.rectangle(inventoryPanelX, inventoryPanelY, inventoryPanelWidth, inventoryPanelHeight, abyssBlue, 0.96).setOrigin(0, 0),
      inventoryPanelBorder: this.scene.add.rectangle(inventoryPanelX, inventoryPanelY, inventoryPanelWidth, inventoryPanelHeight).setOrigin(0, 0).setStrokeStyle(2, abyssLine, 0.85),
      inventoryHeader: this.scene.add.rectangle(inventoryPanelX, inventoryPanelY, inventoryPanelWidth, inventoryHeaderHeight, abyssBlueRaised, 0.94).setOrigin(0, 0),
      inventoryHeaderGlow: this.scene.add.rectangle(inventoryPanelX + 1, inventoryPanelY + 1, inventoryPanelWidth - 2, 4, abyssGlow, 0.18).setOrigin(0, 0),
      inventoryTitle: this.scene.add.text(inventoryPanelX + 20, inventoryPanelY + 10, 'Inventory', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#e7f6ff',
        fontStyle: 'bold',
      }),
      inventoryCloseButton: this.scene.add.rectangle(inventoryPanelX + inventoryPanelWidth - 34, inventoryPanelY + 21, 28, 28, 0x48181d, 0.94).setOrigin(0.5),
      inventoryCloseLabel: this.scene.add.text(inventoryPanelX + inventoryPanelWidth - 34, inventoryPanelY + 21, 'X', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#f8fbff',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    };

    this.createControlRow('move', overlayX, overlayOpenY + 104, '#d7f1ff');
    this.createControlRow('jump', overlayX, overlayOpenY + 126, '#d7f1ff');
    this.createControlRow('smash', overlayX, overlayOpenY + 152, '#8af5ff');
    this.createControlRow('thrust', overlayX, overlayOpenY + 174, '#8af5ff');
    this.createControlRow('spinAttack', overlayX, overlayOpenY + 196, '#8af5ff');
    this.createControlRow('heal', overlayX, overlayOpenY + 218, '#d7f1ff');
    this.createControlRow('specialAttack', overlayX, overlayOpenY + 240, '#f7f0b0', '12px');

    Object.values(this.elements).forEach((element) => {
      this.pinHudElement(element, 200);
    });

    [
      this.elements.controlsPanelShadow,
      this.elements.controlsPanel,
      this.elements.controlsPanelBorder,
      this.elements.controlsPanelTitle,
      this.elements.controlsPanelHint,
      this.elements.controlsDivider,
      this.elements.controlsHeaderType,
      this.elements.controlsHeaderKey,
      this.elements.controlsHeaderAction,
      this.elements.controlsHeaderCost,
      ...Object.values(this.controlRows).flatMap((row) => Object.values(row)),
    ].forEach((element) => {
      this.pinHudElement(element, 210);
      this.registerOverlayElement(element, overlayOffsetY);
    });

    [
      this.elements.inventoryButton,
      this.elements.inventoryButtonBorder,
      this.elements.inventoryButtonLabel,
      this.elements.controlsToggleButton,
      this.elements.controlsToggleBorder,
      this.elements.controlsToggleLabel,
    ].forEach((element) => {
      element.setInteractive({ useHandCursor: true });
    });
    [
      this.elements.inventoryButton,
      this.elements.inventoryButtonBorder,
      this.elements.inventoryButtonLabel,
    ].forEach((element) => {
      element.on('pointerdown', () => this.toggleInventory());
    });
    [
      this.elements.controlsToggleButton,
      this.elements.controlsToggleBorder,
      this.elements.controlsToggleLabel,
    ].forEach((element) => {
      element.on('pointerdown', () => this.toggleControls());
    });

    this.buildInventoryGrid(inventoryPanelX, inventoryPanelY, inventoryPanelWidth, inventoryPanelHeight, inventoryHeaderHeight);
    this.cacheInventoryLayout(inventoryPanelX, inventoryPanelY, inventoryPanelWidth, inventoryPanelHeight);
    this.enableInventoryDragging();

    this.elements.headerButton.setInteractive({ useHandCursor: true });
    this.elements.profileHintText.setInteractive({ useHandCursor: true });
    [
      this.elements.inventoryCloseButton,
      this.elements.inventoryCloseLabel,
    ].forEach((element) => {
      element.setInteractive({ useHandCursor: true });
      element.on('pointerdown', () => this.closeInventory());
    });
    this.setControlsOpen(false, true);
    this.setInventoryOpen(false);
  }

  /**
   * Returns the shared table-header text style for the hotkeys panel.
   */
  getOverlayHeaderStyle() {
    return {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#8fd4f8',
      fontStyle: 'bold',
    };
  }

  /**
   * Returns the shared table-row text style for one hotkeys row.
   */
  getOverlayRowStyle(color, fontSize = '13px') {
    return {
      fontFamily: 'Courier New',
      fontSize,
      color,
      stroke: '#03131d',
      strokeThickness: 2,
    };
  }

  /**
   * Creates one aligned row inside the combat hotkeys overlay.
   */
  createControlRow(id, panelX, y, color, fontSize = '13px') {
    const rowStyle = this.getOverlayRowStyle(color, fontSize);
    this.controlRows[id] = {
      type: this.scene.add.text(panelX + 18, y, '', rowStyle),
      key: this.scene.add.text(panelX + 104, y, '', rowStyle),
      action: this.scene.add.text(panelX + 156, y, '', rowStyle),
      details: this.scene.add.text(panelX + 320, y, '', rowStyle),
    };
  }

  /**
   * Pins one HUD element to the camera and gives it a stable depth.
   */
  pinHudElement(element, depth) {
    if (element?.setScrollFactor) {
      element.setScrollFactor(0);
    }

    if (element?.setDepth) {
      element.setDepth(depth);
    }
  }

  /**
   * Stores the open position for one overlay element and hides it initially.
   */
  registerOverlayElement(element, closedOffsetY) {
    const openY = element.y;
    const baseAlpha = element.alpha ?? 1;
    element.setData('overlayOpenY', openY);
    element.setData('overlayBaseAlpha', baseAlpha);
    element.setY(openY + closedOffsetY);
    element.setAlpha(0);
    this.controlsOverlayElements.push(element);
  }

  /**
   * Pins and hides one inventory element until the panel opens.
   */
  registerInventoryElement(element, depth = 220) {
    this.pinHudElement(element, depth);
    element.setVisible(false);
    this.inventoryOverlayElements.push(element);
    if (element !== this.elements.inventoryOverlay) {
      this.draggableInventoryElements.push(element);
    }
  }

  cacheInventoryLayout(originX, originY, panelWidth, panelHeight) {
    this.inventoryPanelOrigin = { x: originX, y: originY };
    this.inventoryPanelBounds = new Phaser.Geom.Rectangle(originX, originY, panelWidth, panelHeight);
    this.draggableInventoryElements.forEach((element) => {
      if (typeof element.x === 'number') {
        element.setData('inventoryOffsetX', element.x - originX);
      }
      if (typeof element.y === 'number') {
        element.setData('inventoryOffsetY', element.y - originY);
      }
    });
  }

  enableInventoryDragging() {
    [
      this.elements.inventoryHeader,
      this.elements.inventoryHeaderGlow,
      this.elements.inventoryTitle,
    ].forEach((element) => {
      element.setInteractive({ useHandCursor: true, draggable: false });
      element.on('pointerdown', (pointer) => this.beginInventoryDrag(pointer));
    });

    this.scene.input.on('pointermove', this.handleInventoryDragMove, this);
    this.scene.input.on('pointerup', this.endInventoryDrag, this);
  }

  beginInventoryDrag(pointer) {
    if (!this.inventoryOpen || !this.inventoryPanelBounds) {
      return;
    }

    this.inventoryDragState = {
      pointerId: pointer.id,
      offsetX: pointer.x - this.inventoryPanelBounds.x,
      offsetY: pointer.y - this.inventoryPanelBounds.y,
    };
  }

  handleInventoryDragMove(pointer) {
    if (!this.inventoryDragState || pointer.id !== this.inventoryDragState.pointerId) {
      return;
    }

    const maxX = Math.max(0, this.scene.scale.width - this.inventoryPanelBounds.width);
    const maxY = Math.max(0, this.scene.scale.height - this.inventoryPanelBounds.height);
    const nextX = Phaser.Math.Clamp(pointer.x - this.inventoryDragState.offsetX, 0, maxX);
    const nextY = Phaser.Math.Clamp(pointer.y - this.inventoryDragState.offsetY, 0, maxY);
    this.setInventoryPosition(nextX, nextY);
  }

  endInventoryDrag(pointer) {
    if (!this.inventoryDragState) {
      return;
    }

    if (!pointer || pointer.id === this.inventoryDragState.pointerId) {
      this.inventoryDragState = null;
    }
  }

  setInventoryPosition(panelX, panelY) {
    if (!this.inventoryPanelBounds) {
      return;
    }

    this.inventoryPanelBounds.x = panelX;
    this.inventoryPanelBounds.y = panelY;
    this.draggableInventoryElements.forEach((element) => {
      const offsetX = element.getData('inventoryOffsetX');
      const offsetY = element.getData('inventoryOffsetY');
      if (typeof offsetX === 'number' && typeof offsetY === 'number' && element.setPosition) {
        element.setPosition(panelX + offsetX, panelY + offsetY);
      }
    });
  }

  /**
   * Creates the inventory grid inside the camera-pinned panel.
   */
  buildInventoryGrid(panelX, panelY, panelWidth, panelHeight, headerHeight) {
    const totalSlots = 20;
    const columns = 3;
    const rows = Math.ceil(totalSlots / columns);
    const paddingX = 20;
    const paddingY = 18;
    const slotGap = 6;
    const detailGap = 18;
    const detailWidth = 160;
    const detailX = panelX + panelWidth - paddingX - detailWidth;
    const detailY = panelY + headerHeight + paddingY;
    const gridWidth = Math.max(1, panelWidth - (paddingX * 2) - detailGap - detailWidth);
    const gridHeight = Math.max(1, panelHeight - headerHeight - (paddingY * 2));
    const columnGap = columns > 1
      ? Math.min(slotGap, Math.max(0, Math.floor((gridWidth - columns) / (columns - 1))))
      : 0;
    const rowGap = rows > 1
      ? Math.min(slotGap, Math.max(0, Math.floor((gridHeight - rows) / (rows - 1))))
      : 0;
    const maxSlotWidth = Math.floor((gridWidth - (columnGap * (columns - 1))) / columns);
    const maxSlotHeight = Math.floor((gridHeight - (rowGap * (rows - 1))) / rows);
    const slotSize = Math.max(1, Math.min(maxSlotWidth, maxSlotHeight));
    const usedGridWidth = (columns * slotSize) + ((columns - 1) * columnGap);
    const usedGridHeight = (rows * slotSize) + ((rows - 1) * rowGap);
    const gridX = panelX + paddingX + Math.floor((gridWidth - usedGridWidth) / 2);
    const gridY = panelY + headerHeight + paddingY + Math.floor((gridHeight - usedGridHeight) / 2);
    const detailPanelHeight = Math.min(250, gridHeight);

    this.elements.inventoryDetailPanel = this.scene.add.rectangle(detailX, detailY, detailWidth, detailPanelHeight, 0x06101c, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(1.2, 0x4bc3ff, 0.28);
    this.elements.inventoryDetailTitle = this.scene.add.text(detailX + 12, detailY + 10, 'Selected Item', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#9fdcf8',
      fontStyle: 'bold',
    });
    this.elements.inventoryItemImageBg = this.scene.add.rectangle(detailX + (detailWidth / 2), detailY + 76, 78, 78, 0x071522, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(1.2, 0x4bc3ff, 0.34);
    this.elements.inventoryItemImage = this.scene.add.image(detailX + (detailWidth / 2), detailY + 76, '__MISSING')
      .setOrigin(0.5)
      .setDisplaySize(64, 64)
      .setAlpha(0);
    this.elements.inventoryItemFallbackLabel = this.scene.add.text(detailX + (detailWidth / 2), detailY + 60, '?', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#4bc3ff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.elements.inventoryItemNameLabel = this.scene.add.text(detailX + (detailWidth / 2), detailY + 124, 'Click a slot', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#e7f6ff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: detailWidth - 24 },
    }).setOrigin(0.5, 0);
    this.elements.inventoryItemDescriptionLabel = this.scene.add.text(detailX + 12, detailY + 154, 'Select an item to view its description.', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#9fdcf8',
      lineSpacing: 3,
      wordWrap: { width: detailWidth - 24 },
    });

    [
      this.elements.inventoryOverlay,
      this.elements.inventoryPanelShadow,
      this.elements.inventoryPanel,
      this.elements.inventoryPanelBorder,
      this.elements.inventoryHeader,
      this.elements.inventoryHeaderGlow,
      this.elements.inventoryTitle,
      this.elements.inventoryCloseButton,
      this.elements.inventoryCloseLabel,
      this.elements.inventoryDetailPanel,
      this.elements.inventoryDetailTitle,
      this.elements.inventoryItemImageBg,
      this.elements.inventoryItemImage,
      this.elements.inventoryItemFallbackLabel,
      this.elements.inventoryItemNameLabel,
      this.elements.inventoryItemDescriptionLabel,
    ].forEach((element, index) => {
      this.registerInventoryElement(element, 220 + index);
    });

    for (let slotIndex = 0; slotIndex < totalSlots; slotIndex += 1) {
      const row = Math.floor(slotIndex / columns);
      const column = slotIndex % columns;
      const x = gridX + (column * (slotSize + columnGap));
      const y = gridY + (row * (slotSize + rowGap));
      const slot = this.scene.add.rectangle(x, y, slotSize, slotSize, 0x071522, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1.2, 0x4bc3ff, 0.3)
        .setInteractive({ useHandCursor: true });

      slot.on('pointerover', () => {
        slot.setFillStyle(0x12314f, 0.98);
        slot.setStrokeStyle(1.2, 0x84dcff, 0.72);
      });
      slot.on('pointerout', () => {
        if (slot !== this.selectedInventorySlotElement) {
          slot.setFillStyle(0x071522, 0.95);
          slot.setStrokeStyle(1.2, 0x4bc3ff, 0.3);
        }
      });
      slot.on('pointerdown', () => this.selectInventorySlot(slotIndex));

      this.inventorySlotElements.push(slot);
      this.registerInventoryElement(slot, 229);
    }
  }

  /**
   * Shows the clicked inventory slot's item preview on the right side panel.
   */
  selectInventorySlot(slotIndex) {
    const selectedSlot = this.inventorySlotElements[slotIndex];
    const item = this.inventoryItems[slotIndex] ?? null;

    if (this.selectedInventorySlotElement && this.selectedInventorySlotElement !== selectedSlot) {
      this.selectedInventorySlotElement.setFillStyle(0x071522, 0.95);
      this.selectedInventorySlotElement.setStrokeStyle(1.2, 0x4bc3ff, 0.3);
    }

    this.selectedInventorySlotElement = selectedSlot ?? null;

    if (selectedSlot) {
      selectedSlot.setFillStyle(0x173a5c, 0.98);
      selectedSlot.setStrokeStyle(1.4, 0x9fe8ff, 0.86);
    }

    const itemName = item?.name ?? `Empty Slot ${slotIndex + 1}`;
    const itemDescription = item?.description ?? 'No item description available.';
    const textureKey = item?.textureKey ?? null;
    const hasTexture = Boolean(textureKey && this.scene.textures.exists(textureKey));

    this.elements.inventoryItemNameLabel.setText(itemName);
    this.elements.inventoryItemDescriptionLabel.setText(itemDescription);
    this.elements.inventoryDetailTitle.setText(item ? 'Selected Item' : 'Empty Slot');
    this.elements.inventoryItemImage.setAlpha(hasTexture ? 1 : 0);
    this.elements.inventoryItemFallbackLabel.setAlpha(hasTexture ? 0 : 1);

    if (hasTexture) {
      this.elements.inventoryItemImage.setTexture(textureKey);
      this.elements.inventoryItemImage.setDisplaySize(64, 64);
    }
  }

  /**
   * Hooks HUD interactions to scene callbacks.
   */
  bindEvents(onToggleProfile) {
    this.elements.headerButton.on('pointerdown', onToggleProfile);
    this.elements.profileHintText.on('pointerdown', onToggleProfile);
  }

  /**
   * Handles screen clicks for the hotkeys toggle and outside-close behavior.
   */
  handlePointerDown(pointer) {
    if (this.containsPoint(this.elements.controlsToggleButton, pointer.x, pointer.y)
      || this.containsPoint(this.elements.controlsToggleLabel, pointer.x, pointer.y)) {
      return true;
    }

    if (this.containsPoint(this.elements.inventoryButton, pointer.x, pointer.y)
      || this.containsPoint(this.elements.inventoryButtonLabel, pointer.x, pointer.y)
      || this.containsPoint(this.elements.inventoryCloseButton, pointer.x, pointer.y)
      || this.containsPoint(this.elements.inventoryCloseLabel, pointer.x, pointer.y)) {
      return true;
    }

    if (this.inventoryOpen) {
      if (this.inventoryPanelBounds?.contains(pointer.x, pointer.y)) {
        return true;
      }

      this.closeInventory();
      return true;
    }

    if (this.controlsOpen) {
      this.closeControls();
      return true;
    }

    return false;
  }

  /**
   * Toggles the hotkeys overlay.
   */
  toggleControls() {
    this.setControlsOpen(!this.controlsOpen);
  }

  /**
   * Closes the hotkeys overlay.
   */
  closeControls() {
    this.setControlsOpen(false);
  }

  /**
   * Toggles the inventory panel.
   */
  toggleInventory() {
    this.setInventoryOpen(!this.inventoryOpen);
  }

  /**
   * Closes the inventory panel.
   */
  closeInventory() {
    this.setInventoryOpen(false);
  }

  /**
   * Shows or hides the camera-pinned inventory panel.
   */
  setInventoryOpen(open) {
    this.inventoryOpen = open;
    this.inventoryOverlayElements.forEach((element) => {
      element.setVisible(open);
    });
  }

  /**
   * Opens or closes the hotkeys overlay with a fade-and-slide transition.
   */
  setControlsOpen(open, immediate = false) {
    this.controlsOpen = open;
    this.elements.controlsToggleLabel.setText(open ? 'Hide Hotkeys' : 'Show Hotkeys');
    this.controlsTween?.remove();

    this.controlsOverlayElements.forEach((element) => {
      const openY = element.getData('overlayOpenY');
      const baseAlpha = element.getData('overlayBaseAlpha');
      const closedY = openY + 30;

      if (immediate) {
        element.setY(open ? openY : closedY);
        element.setAlpha(open ? baseAlpha : 0);
      }
    });

    if (immediate) {
      return;
    }

    this.controlsTween = this.scene.tweens.add({
      targets: this.controlsOverlayElements,
      y: (target) => (open ? target.getData('overlayOpenY') : target.getData('overlayOpenY') + 30),
      alpha: (target) => (open ? target.getData('overlayBaseAlpha') : 0),
      duration: 220,
      ease: open ? 'Cubic.easeOut' : 'Cubic.easeIn',
    });
  }

  /**
   * Returns true when the screen-space pointer is inside one HUD element.
   */
  containsPoint(element, x, y) {
    const bounds = element?.getBounds?.();
    return Boolean(bounds) && Phaser.Geom.Rectangle.Contains(bounds, x, y);
  }

  /**
   * Refreshes HUD values using the current player state.
   */
  update(player, fps) {
    const hpRatio = Phaser.Math.Clamp(player.currentHp / player.maxHp, 0, 1);
    const expRatio = Phaser.Math.Clamp(player.currentExp / player.expToNextLevel, 0, 1);
    const manaRatio = Phaser.Math.Clamp(player.currentMana / player.maxMana, 0, 1);
    const attackLabels = {
      smash: player.characterConfig?.attackLabels?.smash ?? PLAYER_ATTACK_CONFIG.smash.label,
      spinAttack: player.characterConfig?.attackLabels?.spinAttack ?? PLAYER_ATTACK_CONFIG.spinAttack.label,
      thrust: player.characterConfig?.attackLabels?.thrust ?? PLAYER_ATTACK_CONFIG.thrust.label,
      specialAttack: player.characterConfig?.attackLabels?.specialAttack ?? PLAYER_ATTACK_CONFIG.specialAttack.label,
    };
    const specialAttackProfile = player.getCombatProfile?.('specialAttack') ?? null;
    const specialUiLabels = specialAttackProfile?.uiLabels ?? null;
    const healManaPercent = Math.round(PLAYER_ABILITY_SETTINGS.healManaCostPercent * 100);
    const specialManaLabel = specialUiLabels?.manaCost ?? `${player.getManaCost?.('specialAttack') ?? PLAYER_ABILITY_SETTINGS.specialAttackManaCost} MP`;
    const specialRangeLabel = specialUiLabels?.range ?? '600 Range';
    const specialDamageLabel = specialUiLabels?.damage ?? '100% HP';

    this.elements.nameText.setText(player.playerName);
    this.elements.levelText.setText(`Lv ${player.level}`);
    this.elements.hpBarFill.width = 150 * hpRatio;
    this.elements.expBarFill.width = 150 * expRatio;
    this.elements.manaBarFill.width = 150 * manaRatio;
    this.elements.hpValueText.setText(`${Math.round(player.currentHp)} / ${player.maxHp}`);
    this.elements.expValueText.setText(`${Math.round(player.currentExp)} / ${player.expToNextLevel}`);
    this.elements.manaValueText.setText(`${Math.round(player.currentMana)} / ${player.maxMana}`);
    this.elements.fpsText.setText(`FPS: ${Math.floor(fps)}`);
    this.elements.coinText.setText(`Coins: ${Math.max(0, Math.floor(player.coins ?? 0))}`);

    this.updateControlRow('move', 'Move', 'A / D', 'Left / Right', '');
    this.updateControlRow('jump', 'Jump', 'W / Space', 'Hop / Double Jump', '');
    this.updateControlRow('smash', 'Attack', PLAYER_ACTION_KEYS.smash, attackLabels.smash, 'Free');
    this.updateControlRow('thrust', 'Skill', PLAYER_ACTION_KEYS.thrust, attackLabels.thrust, 'Free');
    this.updateControlRow('spinAttack', 'Skill', PLAYER_ACTION_KEYS.spinAttack, attackLabels.spinAttack, 'Free');
    this.updateControlRow('heal', 'Support', PLAYER_ACTION_KEYS.heal, 'Heal', `20% HP / ${healManaPercent}% MP`);
    this.updateControlRow('specialAttack', 'Ultimate', PLAYER_ACTION_KEYS.specialAttack, attackLabels.specialAttack, `${specialManaLabel} / ${specialRangeLabel} / ${specialDamageLabel}`);
  }

  /**
   * Refreshes one aligned row in the hotkeys table.
   */
  updateControlRow(id, type, key, action, details) {
    const row = this.controlRows[id];
    if (!row) {
      return;
    }

    row.type.setText(type);
    row.key.setText(key);
    row.action.setText(action);
    row.details.setText(details);
  }
}
