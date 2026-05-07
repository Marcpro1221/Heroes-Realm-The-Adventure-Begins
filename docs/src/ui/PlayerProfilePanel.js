/**
 * Expandable profile and upgrade panel for the player.
 * This class renders stats and emits button interactions, but `MainScene`
 * remains the owner of the actual upgrade logic and player mutations.
 */
export default class PlayerProfilePanel {
  constructor(scene, getPlayerAttackDamage, getPlayerDefensePercent, getPlayerDefenseValue, playerAttackConfig) {
    this.scene = scene;
    this.getPlayerAttackDamage = getPlayerAttackDamage;
    this.getPlayerDefensePercent = getPlayerDefensePercent;
    this.getPlayerDefenseValue = getPlayerDefenseValue;
    this.playerAttackConfig = playerAttackConfig;
    this.visible = false;
    this.draggableElements = [];
    this.dragState = null;
    this.previewCharacterId = null;
    this.build();
  }

  /**
   * Creates the profile panel objects and interaction buttons.
   */
  build() {
    const viewportWidth = this.scene.cameras.main.width;
    const viewportHeight = this.scene.cameras.main.height;
    const panelMarginX = 24;
    const panelMarginY = 20;
    const panelWidth = Phaser.Math.Clamp(
      Math.round(viewportWidth * 0.74),
      620,
      Math.max(620, viewportWidth - (panelMarginX * 2)),
    );
    const panelHeight = Math.max(540, viewportHeight - (panelMarginY * 2));
    const panelX = Math.round((viewportWidth - panelWidth) / 2);
    const panelY = Math.round((viewportHeight - panelHeight) / 2);
    const innerX = panelX + 22;
    const innerY = panelY + 16;
    const innerWidth = panelWidth - 44;
    const summaryWidth = Math.round(innerWidth * 0.66);
    const previewGap = 14;
    const previewAreaWidth = innerWidth - summaryWidth - previewGap;
    const previewAreaX = innerX + summaryWidth + previewGap;
    const cardGap = 10;
    const statCardWidth = Math.floor((summaryWidth - cardGap) / 2);
    const statCardHeight = 60;
    const statCardsTop = innerY + 74;
    const statBarWidth = statCardWidth - 28;
    const statBarHeight = 10;
    const growthSectionY = innerY + 208;
    const growthRowHeight = 34;
    const growthRowGap = 6;
    const growthLabelWidth = 138;
    const growthValueWidth = innerWidth - growthLabelWidth - 108;
    const growthButtonX = panelX + panelWidth - 56;
    const skillSectionY = innerY + 396;
    const skillHeaderHeight = 24;
    const skillRowHeight = 32;
    const skillRowGap = 6;
    const skillNameX = innerX + 16;
    const skillDamageX = innerX + Math.round(innerWidth * 0.58);
    const skillPercentX = innerX + Math.round(innerWidth * 0.84);
    const skillNameWidth = Math.max(140, Math.round(innerWidth * 0.42));
    const abyssBlue = 0x08111f;
    const abyssBlueSoft = 0x0d1a2b;
    const abyssLine = 0x1f4f75;
    const abyssRow = 0x10233c;
    const abyssCard = 0x0d2237;
    const goldTint = 0xf9d976;
    const hpTint = 0xff7f7f;
    const manaTint = 0x74dfff;
    const expTint = 0xffe48f;
    const pointTint = 0x98ffb1;

    this.elements = {
      panel: this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, abyssBlue, 0.96).setOrigin(0, 0),
      panelBorder: this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight).setOrigin(0, 0).setStrokeStyle(2, abyssLine, 0.8),
      headerGlow: this.scene.add.rectangle(panelX + 12, panelY + 12, panelWidth - 24, 54, abyssBlueSoft, 0.86).setOrigin(0, 0),
      title: this.scene.add.text(innerX, innerY, 'CHARACTER PROFILE', { fontFamily: 'Arial', fontSize: '26px', color: '#f5fbff', fontStyle: 'bold' }),
      subtitle: this.scene.add.text(innerX, innerY + 30, '', { fontFamily: 'Arial', fontSize: '15px', color: '#9fd7f0', wordWrap: { width: innerWidth - 20 } }),

      statsTitle: this.scene.add.text(innerX, innerY + 58, 'Combat Overview', { fontFamily: 'Arial', fontSize: '17px', color: '#effbff', fontStyle: 'bold' }),
      statsDivider: this.scene.add.rectangle(innerX, innerY + 72, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),

      hpCard: this.scene.add.rectangle(innerX, statCardsTop, statCardWidth, statCardHeight, abyssCard, 0.9).setOrigin(0, 0),
      hpCardBorder: this.scene.add.rectangle(innerX, statCardsTop, statCardWidth, statCardHeight).setOrigin(0, 0).setStrokeStyle(1, hpTint, 0.42),
      hpLabel: this.scene.add.text(innerX + 14, statCardsTop + 8, 'HP', { fontFamily: 'Arial', fontSize: '13px', color: '#ffb8b8', fontStyle: 'bold' }),
      hpStat: this.scene.add.text(innerX + 14, statCardsTop + 24, '', { fontFamily: 'Arial', fontSize: '22px', color: '#fff5f5', fontStyle: 'bold' }),
      hpBarBg: this.scene.add.rectangle(innerX + 14, statCardsTop + 48, statBarWidth, statBarHeight, 0x09131f, 1).setOrigin(0, 0.5),
      hpBarFill: this.scene.add.rectangle(innerX + 14, statCardsTop + 48, statBarWidth, statBarHeight, 0xff6b6b, 1).setOrigin(0, 0.5),

      manaCard: this.scene.add.rectangle(innerX + statCardWidth + cardGap, statCardsTop, statCardWidth, statCardHeight, abyssCard, 0.9).setOrigin(0, 0),
      manaCardBorder: this.scene.add.rectangle(innerX + statCardWidth + cardGap, statCardsTop, statCardWidth, statCardHeight).setOrigin(0, 0).setStrokeStyle(1, manaTint, 0.42),
      manaLabel: this.scene.add.text(innerX + statCardWidth + cardGap + 14, statCardsTop + 8, 'MP', { fontFamily: 'Arial', fontSize: '13px', color: '#9feaff', fontStyle: 'bold' }),
      manaStat: this.scene.add.text(innerX + statCardWidth + cardGap + 14, statCardsTop + 24, '', { fontFamily: 'Arial', fontSize: '22px', color: '#eefcff', fontStyle: 'bold' }),
      manaBarBg: this.scene.add.rectangle(innerX + statCardWidth + cardGap + 14, statCardsTop + 48, statBarWidth, statBarHeight, 0x09131f, 1).setOrigin(0, 0.5),
      manaBarFill: this.scene.add.rectangle(innerX + statCardWidth + cardGap + 14, statCardsTop + 48, statBarWidth, statBarHeight, 0x49b7ff, 1).setOrigin(0, 0.5),

      expCard: this.scene.add.rectangle(innerX, statCardsTop + statCardHeight + cardGap, statCardWidth, statCardHeight, abyssCard, 0.9).setOrigin(0, 0),
      expCardBorder: this.scene.add.rectangle(innerX, statCardsTop + statCardHeight + cardGap, statCardWidth, statCardHeight).setOrigin(0, 0).setStrokeStyle(1, expTint, 0.42),
      expLabel: this.scene.add.text(innerX + 14, statCardsTop + statCardHeight + cardGap + 8, 'EXP', { fontFamily: 'Arial', fontSize: '13px', color: '#fff0a6', fontStyle: 'bold' }),
      expStat: this.scene.add.text(innerX + 14, statCardsTop + statCardHeight + cardGap + 24, '', { fontFamily: 'Arial', fontSize: '21px', color: '#fffdf2', fontStyle: 'bold' }),
      expBarBg: this.scene.add.rectangle(innerX + 14, statCardsTop + statCardHeight + cardGap + 48, statBarWidth, statBarHeight, 0x09131f, 1).setOrigin(0, 0.5),
      expBarFill: this.scene.add.rectangle(innerX + 14, statCardsTop + statCardHeight + cardGap + 48, statBarWidth, statBarHeight, 0xf6b73c, 1).setOrigin(0, 0.5),

      pointsCard: this.scene.add.rectangle(innerX + statCardWidth + cardGap, statCardsTop + statCardHeight + cardGap, statCardWidth, statCardHeight, abyssCard, 0.9).setOrigin(0, 0),
      pointsCardBorder: this.scene.add.rectangle(innerX + statCardWidth + cardGap, statCardsTop + statCardHeight + cardGap, statCardWidth, statCardHeight).setOrigin(0, 0).setStrokeStyle(1, pointTint, 0.42),
      pointsLabel: this.scene.add.text(innerX + statCardWidth + cardGap + 14, statCardsTop + statCardHeight + cardGap + 8, 'SKILL POINTS', { fontFamily: 'Arial', fontSize: '12px', color: '#bfffd1', fontStyle: 'bold' }),
      pointsStat: this.scene.add.text(innerX + statCardWidth + cardGap + 14, statCardsTop + statCardHeight + cardGap + 24, '', { fontFamily: 'Arial', fontSize: '21px', color: '#f4fff7', fontStyle: 'bold' }),
      pointsBarBg: this.scene.add.rectangle(innerX + statCardWidth + cardGap + 14, statCardsTop + statCardHeight + cardGap + 48, statBarWidth, statBarHeight, 0x09131f, 1).setOrigin(0, 0.5),
      pointsBarFill: this.scene.add.rectangle(innerX + statCardWidth + cardGap + 14, statCardsTop + statCardHeight + cardGap + 48, statBarWidth, statBarHeight, 0x7dffb1, 1).setOrigin(0, 0.5),

      previewFrame: this.scene.add.rectangle(previewAreaX, statCardsTop, previewAreaWidth, 132, abyssRow, 0.72).setOrigin(0, 0),
      previewFrameBorder: this.scene.add.rectangle(previewAreaX, statCardsTop, previewAreaWidth, 132).setOrigin(0, 0).setStrokeStyle(1, abyssLine, 0.72),
      previewTitle: this.scene.add.text(previewAreaX + 12, statCardsTop + 8, 'Character Preview', { fontFamily: 'Arial', fontSize: '13px', color: '#9cd8f6', fontStyle: 'bold' }),
      previewBadge: this.scene.add.text(previewAreaX + 12, statCardsTop + 26, 'Live Model', { fontFamily: 'Arial', fontSize: '11px', color: '#d8f5ff', backgroundColor: '#153854', padding: { x: 7, y: 2 } }),
      previewSprite: this.scene.add.sprite(previewAreaX + (previewAreaWidth / 2), statCardsTop + 92, '__MISSING'),

      growthDivider: this.scene.add.rectangle(innerX, growthSectionY + 8, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),
      growthHeaderBg: this.scene.add.rectangle(innerX, growthSectionY + 18, innerWidth, 26, abyssBlueSoft, 0.88).setOrigin(0, 0),
      growthHeaderLabel: this.scene.add.text(innerX + 14, growthSectionY + 24, 'ATTRIBUTE', { fontFamily: 'Arial', fontSize: '12px', color: '#93d3ef', fontStyle: 'bold' }),
      growthHeaderValue: this.scene.add.text(innerX + growthLabelWidth + 18, growthSectionY + 24, 'CURRENT EFFECT', { fontFamily: 'Arial', fontSize: '12px', color: '#93d3ef', fontStyle: 'bold' }),
      growthHeaderAction: this.scene.add.text(growthButtonX - 8, growthSectionY + 24, 'UPGRADE', { fontFamily: 'Arial', fontSize: '12px', color: '#93d3ef', fontStyle: 'bold' }).setOrigin(1, 0),

      hpRowBg: this.scene.add.rectangle(innerX, growthSectionY + 54, innerWidth, growthRowHeight, abyssRow, 0.76).setOrigin(0, 0),
      hpLabelRow: this.scene.add.text(innerX + 14, growthSectionY + 63, 'Vitality', { fontFamily: 'Arial', fontSize: '15px', color: '#fff5f5', fontStyle: 'bold' }),
      hpUpgradeStat: this.scene.add.text(innerX + growthLabelWidth + 8, growthSectionY + 64, '', { fontFamily: 'Arial', fontSize: '14px', color: '#dcefff', wordWrap: { width: growthValueWidth } }),
      hpUpgradeButton: this.scene.add.text(growthButtonX, growthSectionY + 55, '+', { fontFamily: 'Arial', fontSize: '21px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 8, y: 0 } }),

      manaRowBg: this.scene.add.rectangle(innerX, growthSectionY + 54 + (growthRowHeight + growthRowGap), innerWidth, growthRowHeight, abyssRow, 0.62).setOrigin(0, 0),
      manaLabelRow: this.scene.add.text(innerX + 14, growthSectionY + 63 + (growthRowHeight + growthRowGap), 'Mana Pool', { fontFamily: 'Arial', fontSize: '15px', color: '#eefcff', fontStyle: 'bold' }),
      manaUpgradeStat: this.scene.add.text(innerX + growthLabelWidth + 8, growthSectionY + 64 + (growthRowHeight + growthRowGap), '', { fontFamily: 'Arial', fontSize: '14px', color: '#dcefff', wordWrap: { width: growthValueWidth } }),
      manaUpgradeButton: this.scene.add.text(growthButtonX, growthSectionY + 55 + (growthRowHeight + growthRowGap), '+', { fontFamily: 'Arial', fontSize: '21px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 8, y: 0 } }),

      baseDamageRowBg: this.scene.add.rectangle(innerX, growthSectionY + 54 + ((growthRowHeight + growthRowGap) * 2), innerWidth, growthRowHeight, abyssRow, 0.76).setOrigin(0, 0),
      baseDamageLabelRow: this.scene.add.text(innerX + 14, growthSectionY + 63 + ((growthRowHeight + growthRowGap) * 2), 'Base Damage', { fontFamily: 'Arial', fontSize: '15px', color: '#fff6e4', fontStyle: 'bold' }),
      baseDamageStat: this.scene.add.text(innerX + growthLabelWidth + 8, growthSectionY + 64 + ((growthRowHeight + growthRowGap) * 2), '', { fontFamily: 'Arial', fontSize: '14px', color: '#dcefff', wordWrap: { width: growthValueWidth } }),
      baseDamageUpgradeButton: this.scene.add.text(growthButtonX, growthSectionY + 55 + ((growthRowHeight + growthRowGap) * 2), '+', { fontFamily: 'Arial', fontSize: '21px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 8, y: 0 } }),

      defenseRowBg: this.scene.add.rectangle(innerX, growthSectionY + 54 + ((growthRowHeight + growthRowGap) * 3), innerWidth, growthRowHeight, abyssRow, 0.62).setOrigin(0, 0),
      defenseLabelRow: this.scene.add.text(innerX + 14, growthSectionY + 63 + ((growthRowHeight + growthRowGap) * 3), 'Defense', { fontFamily: 'Arial', fontSize: '15px', color: '#f2fff5', fontStyle: 'bold' }),
      defenseStat: this.scene.add.text(innerX + growthLabelWidth + 8, growthSectionY + 64 + ((growthRowHeight + growthRowGap) * 3), '', { fontFamily: 'Arial', fontSize: '14px', color: '#dcefff', wordWrap: { width: growthValueWidth } }),
      defenseUpgradeButton: this.scene.add.text(growthButtonX, growthSectionY + 55 + ((growthRowHeight + growthRowGap) * 3), '+', { fontFamily: 'Arial', fontSize: '21px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 8, y: 0 } }),

      skillsDivider: this.scene.add.rectangle(innerX, skillSectionY + 8, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),
      skillsHeaderBg: this.scene.add.rectangle(innerX, skillSectionY + 18, innerWidth, skillHeaderHeight, abyssBlueSoft, 0.88).setOrigin(0, 0),
      skillsHeaderName: this.scene.add.text(skillNameX, skillSectionY + 23, 'SKILL', { fontFamily: 'Arial', fontSize: '11px', color: '#93d3ef', fontStyle: 'bold' }),
      skillsHeaderDamage: this.scene.add.text(skillDamageX, skillSectionY + 23, 'DAMAGE', { fontFamily: 'Arial', fontSize: '11px', color: '#93d3ef', fontStyle: 'bold' }).setOrigin(0.5, 0),
      skillsHeaderPercent: this.scene.add.text(skillPercentX, skillSectionY + 23, 'TOTAL %', { fontFamily: 'Arial', fontSize: '11px', color: '#93d3ef', fontStyle: 'bold' }).setOrigin(0.5, 0),

      smashRowBg: this.scene.add.rectangle(innerX, skillSectionY + 48, innerWidth, skillRowHeight, abyssRow, 0.74).setOrigin(0, 0),
      smashDamage: this.scene.add.text(skillNameX, skillSectionY + 56, '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff', fontStyle: 'bold', wordWrap: { width: skillNameWidth, useAdvancedWrap: true } }),
      smashDamageValue: this.scene.add.text(skillDamageX, skillSectionY + 56, '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),
      smashDamagePercent: this.scene.add.text(skillPercentX, skillSectionY + 56, '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),

      spinRowBg: this.scene.add.rectangle(innerX, skillSectionY + 48 + (skillRowHeight + skillRowGap), innerWidth, skillRowHeight, abyssRow, 0.62).setOrigin(0, 0),
      spinDamage: this.scene.add.text(skillNameX, skillSectionY + 56 + (skillRowHeight + skillRowGap), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff', fontStyle: 'bold', wordWrap: { width: skillNameWidth, useAdvancedWrap: true } }),
      spinDamageValue: this.scene.add.text(skillDamageX, skillSectionY + 56 + (skillRowHeight + skillRowGap), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),
      spinDamagePercent: this.scene.add.text(skillPercentX, skillSectionY + 56 + (skillRowHeight + skillRowGap), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),

      thrustRowBg: this.scene.add.rectangle(innerX, skillSectionY + 48 + ((skillRowHeight + skillRowGap) * 2), innerWidth, skillRowHeight, abyssRow, 0.74).setOrigin(0, 0),
      thrustDamage: this.scene.add.text(skillNameX, skillSectionY + 56 + ((skillRowHeight + skillRowGap) * 2), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff', fontStyle: 'bold', wordWrap: { width: skillNameWidth, useAdvancedWrap: true } }),
      thrustDamageValue: this.scene.add.text(skillDamageX, skillSectionY + 56 + ((skillRowHeight + skillRowGap) * 2), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),
      thrustDamagePercent: this.scene.add.text(skillPercentX, skillSectionY + 56 + ((skillRowHeight + skillRowGap) * 2), '', { fontFamily: 'Arial', fontSize: '13px', color: '#f6fbff' }).setOrigin(0.5, 0),
    };

    this.bounds = new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight);
    this.elements.previewSprite.setScale(1.75).setDepth(206);

    Object.values(this.elements).forEach((element) => {
      if (element?.setScrollFactor) {
        element.setScrollFactor(0);
      }
      if (element?.setDepth) {
        element.setDepth(205);
      }
      if (element?.setVisible) {
        element.setVisible(false);
      }
    });

    this.draggableElements = Object.values(this.elements);
    this.draggableElements.forEach((element) => {
      if (typeof element.x === 'number') {
        element.setData('profileOffsetX', element.x - panelX);
      }
      if (typeof element.y === 'number') {
        element.setData('profileOffsetY', element.y - panelY);
      }
    });

    [
      this.elements.hpUpgradeButton,
      this.elements.manaUpgradeButton,
      this.elements.baseDamageUpgradeButton,
      this.elements.defenseUpgradeButton,
    ].forEach((button) => button.setInteractive({ useHandCursor: true }));

    [
      this.elements.panel,
      this.elements.panelBorder,
      this.elements.title,
      this.elements.subtitle,
    ].forEach((element) => {
      element.setInteractive({ useHandCursor: true });
      element.on('pointerdown', (pointer) => this.beginDrag(pointer));
    });

    this.scene.input.on('pointermove', this.handleDragMove, this);
    this.scene.input.on('pointerup', this.endDrag, this);
  }

  /**
   * Hooks the panel buttons to scene upgrade callbacks.
   */
  bindEvents(onUpgradeHp, onUpgradeMana, onUpgradeBaseDamage, onUpgradeDefense) {
    this.elements.hpUpgradeButton.on('pointerdown', onUpgradeHp);
    this.elements.manaUpgradeButton.on('pointerdown', onUpgradeMana);
    this.elements.baseDamageUpgradeButton.on('pointerdown', onUpgradeBaseDamage);
    this.elements.defenseUpgradeButton.on('pointerdown', onUpgradeDefense);
  }

  /**
   * Shows or hides the full profile panel.
   */
  toggle() {
    this.visible = !this.visible;
    Object.values(this.elements).forEach((element) => {
      if (element?.setVisible) {
        element.setVisible(this.visible);
      }
    });
  }

  /**
   * Hides the profile panel without requiring a second click on the player.
   */
  close() {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    Object.values(this.elements).forEach((element) => {
      if (element?.setVisible) {
        element.setVisible(false);
      }
    });
  }

  /**
   * Returns true when a screen-space pointer is inside the profile panel.
   */
  containsPoint(x, y) {
    return Phaser.Geom.Rectangle.Contains(this.bounds, x, y);
  }

  beginDrag(pointer) {
    if (!this.visible) {
      return;
    }

    this.dragState = {
      pointerId: pointer.id,
      offsetX: pointer.x - this.bounds.x,
      offsetY: pointer.y - this.bounds.y,
    };
  }

  handleDragMove(pointer) {
    if (!this.dragState || pointer.id !== this.dragState.pointerId) {
      return;
    }

    const maxX = Math.max(0, this.scene.scale.width - this.bounds.width);
    const maxY = Math.max(0, this.scene.scale.height - this.bounds.height);
    const nextX = Phaser.Math.Clamp(pointer.x - this.dragState.offsetX, 0, maxX);
    const nextY = Phaser.Math.Clamp(pointer.y - this.dragState.offsetY, 0, maxY);
    this.setPosition(nextX, nextY);
  }

  endDrag(pointer) {
    if (!this.dragState) {
      return;
    }

    if (!pointer || pointer.id === this.dragState.pointerId) {
      this.dragState = null;
    }
  }

  setPosition(panelX, panelY) {
    this.bounds.x = panelX;
    this.bounds.y = panelY;
    this.draggableElements.forEach((element) => {
      const offsetX = element.getData('profileOffsetX');
      const offsetY = element.getData('profileOffsetY');
      if (typeof offsetX === 'number' && typeof offsetY === 'number' && element.setPosition) {
        element.setPosition(panelX + offsetX, panelY + offsetY);
      }
    });
  }

  /**
   * Refreshes the panel values and upgrade button visibility.
   */
  update(player, enemyMaxHp) {
    if (!this.visible) {
      return;
    }

    const attackLabels = {
      smash: player.characterConfig?.attackLabels?.smash ?? this.playerAttackConfig.smash.label,
      spinAttack: player.characterConfig?.attackLabels?.spinAttack ?? this.playerAttackConfig.spinAttack.label,
      thrust: player.characterConfig?.attackLabels?.thrust ?? this.playerAttackConfig.thrust.label,
    };
    const characterBaseRange = player.getCharacterBaseDamagePercentRange?.() ?? { min: 0, max: 0 };
    const currentBaseRange = player.getBaseDamagePercentRange?.() ?? characterBaseRange;
    const baseDamageBonusPercent = player.getBaseDamageUpgradeBonusPercent?.() ?? 0;
    const smashDamageRange = this.getPlayerAttackDamage('smash', enemyMaxHp);
    const spinDamageRange = this.getPlayerAttackDamage('spinAttack', enemyMaxHp);
    const thrustDamageRange = this.getPlayerAttackDamage('thrust', enemyMaxHp);
    const smashPercentRange = player.getAttackDamagePercentRange?.('smash') ?? { min: 0, max: 0 };
    const spinPercentRange = player.getAttackDamagePercentRange?.('spinAttack') ?? { min: 0, max: 0 };
    const thrustPercentRange = player.getAttackDamagePercentRange?.('thrust') ?? { min: 0, max: 0 };

    this.elements.subtitle.setText(`${player.playerName}  |  Level ${player.level}  |  Kills ${player.totalEnemyKills ?? 0}`);
    this.elements.hpStat.setText(`${Math.round(player.currentHp)} / ${player.maxHp}`);
    this.elements.manaStat.setText(`${Math.round(player.currentMana)} / ${player.maxMana}`);
    this.elements.expStat.setText(`${Math.round(player.currentExp)} / ${player.expToNextLevel}`);
    this.elements.pointsStat.setText(`${player.availableAttackUpgradePoints}`);
    this.updateBar(this.elements.hpBarFill, player.currentHp, player.maxHp);
    this.updateBar(this.elements.manaBarFill, player.currentMana, player.maxMana);
    this.updateBar(this.elements.expBarFill, player.currentExp, player.expToNextLevel);
    this.updateBar(
      this.elements.pointsBarFill,
      player.availableAttackUpgradePoints,
      Math.max(3, player.availableAttackUpgradePoints, 12),
    );

    this.elements.hpUpgradeStat.setText(`Lv ${player.hpUpgradeLevel}  |  Max HP ${player.maxHp}`);
    this.elements.manaUpgradeStat.setText(`Lv ${player.manaUpgradeLevel}  |  Max MP ${player.maxMana}`);
    this.elements.baseDamageStat.setText(`${Math.round(currentBaseRange.min * 100)}%-${Math.round(currentBaseRange.max * 100)}%  |  Lv ${player.baseDamageUpgradeLevel}  |  +${Math.round(baseDamageBonusPercent * 100)}%`);
    this.elements.defenseStat.setText(`${Math.round(this.getPlayerDefensePercent(player) * 100)}% block  |  ${this.getPlayerDefenseValue(player)} dmg blocked  |  Lv ${player.defenseUpgradeLevel}`);

    this.elements.smashDamage.setText(`${attackLabels.smash} [${this.playerAttackConfig.smash.keyLabel}]`);
    this.elements.smashDamageValue.setText(this.formatDamageRange(smashDamageRange));
    this.elements.smashDamagePercent.setText(this.formatPercentRange(smashPercentRange));
    this.elements.spinDamage.setText(`${attackLabels.spinAttack} [${this.playerAttackConfig.spinAttack.keyLabel}]`);
    this.elements.spinDamageValue.setText(this.formatDamageRange(spinDamageRange));
    this.elements.spinDamagePercent.setText(this.formatPercentRange(spinPercentRange));
    this.elements.thrustDamage.setText(`${attackLabels.thrust} [${this.playerAttackConfig.thrust.keyLabel}]`);
    this.elements.thrustDamageValue.setText(this.formatDamageRange(thrustDamageRange));
    this.elements.thrustDamagePercent.setText(this.formatPercentRange(thrustPercentRange));

    this.updatePreviewSprite(player);

    [
      this.elements.hpUpgradeButton,
      this.elements.manaUpgradeButton,
      this.elements.baseDamageUpgradeButton,
      this.elements.defenseUpgradeButton,
    ].forEach((button) => button.setVisible(player.availableAttackUpgradePoints > 0));
  }

  formatDamageRange(damageRange) {
    if (typeof damageRange === 'number') {
      return `${damageRange} dmg`;
    }

    return `${damageRange.min}-${damageRange.max} dmg`;
  }

  formatPercentRange(percentRange) {
    const minPercent = Math.round((percentRange?.min ?? 0) * 100);
    const maxPercent = Math.round((percentRange?.max ?? 0) * 100);
    return minPercent === maxPercent
      ? `${minPercent}%`
      : `${minPercent}%-${maxPercent}%`;
  }

  updateBar(bar, currentValue, maxValue) {
    const fullWidth = bar.width;
    const safeMax = Math.max(1, maxValue ?? 1);
    const ratio = Phaser.Math.Clamp((currentValue ?? 0) / safeMax, 0, 1);
    bar.displayWidth = Math.max(0, Math.round(fullWidth * ratio));
  }

  updatePreviewSprite(player) {
    const previewTextureKey = player.characterConfig?.animationTextures?.idle
      ?? player.characterConfig?.spawnTextureKey
      ?? player.characterConfig?.previewTextureKey
      ?? null;
    const idleAnimationKey = player.getOptionalAnimationKey?.('idle') ?? null;
    const nextCharacterId = player.characterConfig?.id ?? player.playerName ?? 'unknown';
    const previewSprite = this.elements.previewSprite;

    if (previewTextureKey && this.scene.textures.exists(previewTextureKey)) {
      if (previewSprite.texture?.key !== previewTextureKey || this.previewCharacterId !== nextCharacterId) {
        previewSprite.setTexture(previewTextureKey);
      }
    }

    if (idleAnimationKey && previewSprite.anims?.currentAnim?.key !== idleAnimationKey) {
      previewSprite.play(idleAnimationKey, true);
    }

    this.previewCharacterId = nextCharacterId;
  }
}
