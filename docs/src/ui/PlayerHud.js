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
    this.build();
  }

  /**
   * Creates the HUD game objects and pins them to the camera.
   */
  build() {
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
    const abyssBlue = 0x08111f;
    const abyssBlueRaised = 0x10233c;
    const abyssLine = 0x1f4f75;
    const abyssGlow = 0x4bc3ff;
    const labelStyle = {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#b7d8f3',
    };

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
      fpsText: this.scene.add.text(hudX, hudY + 144, 'FPS: 0', { fontFamily: 'Arial', fontSize: '13px', color: '#ffffff' }),
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
      controlsPanelHint: this.scene.add.text(overlayX + 18, overlayOpenY + 38, 'Click the label or anywhere on the screen to close.', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#9fdcf8',
      }),
      controlsDivider: this.scene.add.rectangle(overlayX + 18, overlayOpenY + 64, overlayWidth - 36, 1, abyssLine, 0.7).setOrigin(0, 0.5),
      controlsHeaderType: this.scene.add.text(overlayX + 18, overlayOpenY + 76, 'Type', this.getOverlayHeaderStyle()),
      controlsHeaderKey: this.scene.add.text(overlayX + 104, overlayOpenY + 76, 'Key', this.getOverlayHeaderStyle()),
      controlsHeaderAction: this.scene.add.text(overlayX + 156, overlayOpenY + 76, 'Action', this.getOverlayHeaderStyle()),
      controlsHeaderCost: this.scene.add.text(overlayX + 320, overlayOpenY + 76, 'Details', this.getOverlayHeaderStyle()),
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
      this.elements.controlsToggleButton,
      this.elements.controlsToggleBorder,
      this.elements.controlsToggleLabel,
    ].forEach((element) => {
      element.setInteractive({ useHandCursor: true });
      element.on('pointerdown', () => this.toggleControls());
    });

    this.elements.headerButton.setInteractive({ useHandCursor: true });
    this.elements.profileHintText.setInteractive({ useHandCursor: true });
    this.setControlsOpen(false, true);
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

    this.updateControlRow('move', 'Move', 'A / D', 'Left / Right', '');
    this.updateControlRow('jump', 'Jump', 'W / Space', 'Hop / Climb', '');
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
