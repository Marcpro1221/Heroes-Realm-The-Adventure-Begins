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
    this.build();
  }

  /**
   * Creates the profile panel objects and interaction buttons.
   */
  build() {
    const viewportWidth = this.scene.cameras.main.width;
    const viewportHeight = this.scene.cameras.main.height;
    const panelWidth = Math.round(viewportWidth * 0.5);
    const panelHeight = Math.max(600, Math.round(viewportHeight * 0.75));
    const panelX = Math.round((viewportWidth - panelWidth) / 2);
    const panelY = Math.round((viewportHeight - panelHeight) / 2);
    const innerX = panelX + 24;
    const innerWidth = panelWidth - 48;
    const statsTextWidth = Math.max(220, Math.round(innerWidth * 0.58));
    const previewAreaX = innerX + statsTextWidth + 28;
    const previewAreaWidth = Math.max(120, innerWidth - statsTextWidth - 28);
    const buttonX = panelX + panelWidth - 48;
    const abyssBlue = 0x08111f;
    const abyssLine = 0x1f4f75;
    const abyssRow = 0x10233c;

    this.elements = {
      panel: this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, abyssBlue, 0.96).setOrigin(0, 0),
      panelBorder: this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight).setOrigin(0, 0).setStrokeStyle(2, abyssLine, 0.8),
      title: this.scene.add.text(innerX, panelY + 18, 'Character Profile', { fontFamily: 'Arial', fontSize: '28px', color: '#f5fbff', fontStyle: 'bold' }),
      subtitle: this.scene.add.text(innerX, panelY + 56, '', { fontFamily: 'Arial', fontSize: '16px', color: '#aad5ee' }),

      statsTitle: this.scene.add.text(innerX, panelY + 98, 'Core Stats', { fontFamily: 'Arial', fontSize: '19px', color: '#effbff', fontStyle: 'bold' }),
      statsDivider: this.scene.add.rectangle(innerX, panelY + 126, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),
      hpStat: this.scene.add.text(innerX, panelY + 138, '', { fontFamily: 'Arial', fontSize: '17px', color: '#f1f9ff', wordWrap: { width: statsTextWidth } }),
      manaStat: this.scene.add.text(innerX, panelY + 168, '', { fontFamily: 'Arial', fontSize: '17px', color: '#f1f9ff', wordWrap: { width: statsTextWidth } }),
      expStat: this.scene.add.text(innerX, panelY + 198, '', { fontFamily: 'Arial', fontSize: '17px', color: '#f1f9ff', wordWrap: { width: statsTextWidth } }),
      pointsStat: this.scene.add.text(innerX, panelY + 228, '', { fontFamily: 'Arial', fontSize: '17px', color: '#f1f9ff', wordWrap: { width: statsTextWidth } }),
      previewFrame: this.scene.add.rectangle(previewAreaX, panelY + 138, previewAreaWidth, 124, abyssRow, 0.62).setOrigin(0, 0),
      previewFrameBorder: this.scene.add.rectangle(previewAreaX, panelY + 138, previewAreaWidth, 124).setOrigin(0, 0).setStrokeStyle(1, abyssLine, 0.72),
      previewTitle: this.scene.add.text(previewAreaX + (previewAreaWidth / 2), panelY + 144, 'Preview', { fontFamily: 'Arial', fontSize: '14px', color: '#9cd8f6', fontStyle: 'bold' }).setOrigin(0.5, 0),
      previewSprite: this.scene.add.sprite(previewAreaX + (previewAreaWidth / 2), panelY + 220, '__MISSING'),

      growthTitle: this.scene.add.text(innerX, panelY + 272, 'Growth & Attributes', { fontFamily: 'Arial', fontSize: '19px', color: '#effbff', fontStyle: 'bold' }),
      growthDivider: this.scene.add.rectangle(innerX, panelY + 300, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),
      hpRowBg: this.scene.add.rectangle(panelX + 16, panelY + 314, panelWidth - 32, 30, abyssRow, 0.72).setOrigin(0, 0),
      manaRowBg: this.scene.add.rectangle(panelX + 16, panelY + 348, panelWidth - 32, 30, abyssRow, 0.56).setOrigin(0, 0),
      baseDamageRowBg: this.scene.add.rectangle(panelX + 16, panelY + 382, panelWidth - 32, 30, abyssRow, 0.72).setOrigin(0, 0),
      defenseRowBg: this.scene.add.rectangle(panelX + 16, panelY + 416, panelWidth - 32, 30, abyssRow, 0.56).setOrigin(0, 0),
      hpUpgradeStat: this.scene.add.text(innerX, panelY + 320, '', { fontFamily: 'Arial', fontSize: '16px', color: '#f1f9ff' }),
      manaUpgradeStat: this.scene.add.text(innerX, panelY + 354, '', { fontFamily: 'Arial', fontSize: '16px', color: '#f1f9ff' }),
      baseDamageStat: this.scene.add.text(innerX, panelY + 388, '', { fontFamily: 'Arial', fontSize: '16px', color: '#f1f9ff' }),
      defenseStat: this.scene.add.text(innerX, panelY + 422, '', { fontFamily: 'Arial', fontSize: '16px', color: '#f1f9ff' }),
      hpUpgradeButton: this.scene.add.text(buttonX, panelY + 314, '+', { fontFamily: 'Arial', fontSize: '24px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 9, y: 0 } }),
      manaUpgradeButton: this.scene.add.text(buttonX, panelY + 348, '+', { fontFamily: 'Arial', fontSize: '24px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 9, y: 0 } }),
      baseDamageUpgradeButton: this.scene.add.text(buttonX, panelY + 382, '+', { fontFamily: 'Arial', fontSize: '24px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 9, y: 0 } }),
      defenseUpgradeButton: this.scene.add.text(buttonX, panelY + 416, '+', { fontFamily: 'Arial', fontSize: '24px', color: '#8af5ff', fontStyle: 'bold', backgroundColor: '#11314a', padding: { x: 9, y: 0 } }),

      skillsTitle: this.scene.add.text(innerX, panelY + 466, 'Skill Damage', { fontFamily: 'Arial', fontSize: '19px', color: '#effbff', fontStyle: 'bold' }),
      skillsDivider: this.scene.add.rectangle(innerX, panelY + 494, innerWidth, 1, abyssLine, 0.72).setOrigin(0, 0.5),
      smashDamage: this.scene.add.text(innerX, panelY + 506, '', { fontFamily: 'Arial', fontSize: '15px', color: '#f1f9ff', wordWrap: { width: innerWidth } }),
      spinDamage: this.scene.add.text(innerX, panelY + 530, '', { fontFamily: 'Arial', fontSize: '15px', color: '#f1f9ff', wordWrap: { width: innerWidth } }),
      thrustDamage: this.scene.add.text(innerX, panelY + 554, '', { fontFamily: 'Arial', fontSize: '15px', color: '#f1f9ff', wordWrap: { width: innerWidth } }),
    };

    this.bounds = new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight);
    this.elements.previewSprite.setScale(1.9).setDepth(206);

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

    [
      this.elements.hpUpgradeButton,
      this.elements.manaUpgradeButton,
      this.elements.baseDamageUpgradeButton,
      this.elements.defenseUpgradeButton,
    ].forEach((button) => button.setInteractive({ useHandCursor: true }));
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
    this.elements.hpStat.setText(`HP: ${Math.round(player.currentHp)} / ${player.maxHp}`);
    this.elements.manaStat.setText(`Mana: ${Math.round(player.currentMana)} / ${player.maxMana}`);
    this.elements.expStat.setText(`EXP: ${Math.round(player.currentExp)} / ${player.expToNextLevel}`);
    this.elements.pointsStat.setText(`Skill Points: ${player.availableAttackUpgradePoints}`);

    this.elements.hpUpgradeStat.setText(`Vitality: Lv ${player.hpUpgradeLevel}  |  Max HP ${player.maxHp}`);
    this.elements.manaUpgradeStat.setText(`Mana Pool: Lv ${player.manaUpgradeLevel}  |  Max Mana ${player.maxMana}`);
    this.elements.baseDamageStat.setText(`Base Damage: ${Math.round(currentBaseRange.min * 100)}%-${Math.round(currentBaseRange.max * 100)}%  |  Base Upg Lv ${player.baseDamageUpgradeLevel}  |  +${Math.round(baseDamageBonusPercent * 100)}%`);
    this.elements.defenseStat.setText(`Defense: ${Math.round(this.getPlayerDefensePercent(player) * 100)}%  |  Block ${this.getPlayerDefenseValue(player)} dmg  |  Lv ${player.defenseUpgradeLevel}`);

    this.elements.smashDamage.setText(`${attackLabels.smash} [C]: ${smashDamageRange.min}-${smashDamageRange.max} dmg  |  ${Math.round(smashPercentRange.min * 100)}%-${Math.round(smashPercentRange.max * 100)}% total`);
    this.elements.spinDamage.setText(`${attackLabels.spinAttack} [X]: ${spinDamageRange.min}-${spinDamageRange.max} dmg  |  ${Math.round(spinPercentRange.min * 100)}%-${Math.round(spinPercentRange.max * 100)}% total`);
    this.elements.thrustDamage.setText(`${attackLabels.thrust} [V]: ${thrustDamageRange.min}-${thrustDamageRange.max} dmg  |  ${Math.round(thrustPercentRange.min * 100)}%-${Math.round(thrustPercentRange.max * 100)}% total`);

    const previewTextureKey = player.characterConfig?.spawnTextureKey
      ?? player.characterConfig?.previewTextureKey
      ?? null;
    const idleAnimationKey = player.getOptionalAnimationKey?.('idle') ?? null;
    if (previewTextureKey && this.scene.textures.exists(previewTextureKey)) {
      this.elements.previewSprite.setTexture(previewTextureKey);
      if (idleAnimationKey) {
        this.elements.previewSprite.play(idleAnimationKey, true);
      }
    }

    [
      this.elements.hpUpgradeButton,
      this.elements.manaUpgradeButton,
      this.elements.baseDamageUpgradeButton,
      this.elements.defenseUpgradeButton,
    ].forEach((button) => button.setVisible(player.availableAttackUpgradePoints > 0));
  }
}
