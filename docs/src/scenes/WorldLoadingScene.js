import { loadMainSceneAssets } from '../assets/loaders.js';
import { getWorldSceneConfig } from '../constants/worldSceneConfigs.js';
import { SCENE_KEYS } from '../constants/sceneKeys.js';

export default class WorldLoadingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.WORLD_LOADING);
    this.targetSceneKey = SCENE_KEYS.MAIN_GAME;
    this.targetWorldAssetId = null;
    this.loadingUi = null;
  }

  init(data) {
    this.targetSceneKey = data?.targetSceneKey ?? SCENE_KEYS.MAIN_GAME;
    this.targetWorldAssetId = data?.targetWorldAssetId
      ?? getWorldSceneConfig(this.targetSceneKey)?.assetWorldId
      ?? null;
  }

  preload() {
    this.createLoadingUi();
    this.bindLoaderProgress();
    loadMainSceneAssets(this, this.targetWorldAssetId);
  }

  create() {
    this.scene.start(this.targetSceneKey);
  }

  createLoadingUi() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 560;
    const panelHeight = 240;
    const barWidth = 400;
    const barHeight = 24;

    this.cameras.main.setBackgroundColor('#061018');
    this.add.rectangle(centerX, centerY, width, height, 0x061018, 1);
    this.add.ellipse(centerX - 260, centerY - 90, 320, 320, 0x0d3550, 0.35);
    this.add.ellipse(centerX + 250, centerY + 120, 260, 260, 0x16466a, 0.24);

    this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x0d1c2a, 0.95)
      .setStrokeStyle(2, 0x60d5ff, 0.68);
    this.add.text(centerX, centerY - 72, 'Entering The World', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#f3e8b3',
      fontStyle: 'bold',
      stroke: '#050a10',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(centerX, centerY - 22, 'Loading terrain, enemies, music, and your selected hero...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d8efff',
      align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY + 40, barWidth + 10, barHeight + 10, 0x02060b, 0.55)
      .setStrokeStyle(1, 0x25445c, 0.9);
    this.add.rectangle(centerX, centerY + 40, barWidth, barHeight, 0x142739, 1)
      .setStrokeStyle(2, 0x6de8ff, 0.72);
    const barFill = this.add.rectangle((centerX - (barWidth / 2)) + 3, centerY + 40, 4, barHeight - 6, 0x5eead4, 1)
      .setOrigin(0, 0.5);
    const percentText = this.add.text(centerX, centerY + 86, '0%', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#fff7d6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.loadingUi = { barFill, percentText, barWidth };
  }

  bindLoaderProgress() {
    this.load.on('progress', (value) => this.updateLoadingProgress(value));
    this.load.once('complete', () => this.updateLoadingProgress(1));
  }

  updateLoadingProgress(value) {
    if (!this.loadingUi) {
      return;
    }

    const clampedProgress = Phaser.Math.Clamp(value, 0, 1);
    const fillWidth = Math.max(4, (this.loadingUi.barWidth - 6) * clampedProgress);
    this.loadingUi.barFill.width = fillWidth;
    this.loadingUi.percentText.setText(`${Math.round(clampedProgress * 100)}%`);
  }
}
