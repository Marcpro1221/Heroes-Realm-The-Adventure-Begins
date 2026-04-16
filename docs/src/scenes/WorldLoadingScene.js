import { loadMainSceneAssets } from '../assets/loaders.js';
import { getWorldLoadingScreenConfig, getWorldSceneConfig } from '../constants/worldSceneConfigs.js';
import { SCENE_KEYS } from '../constants/sceneKeys.js';

export default class WorldLoadingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.WORLD_LOADING);
    this.targetSceneKey = SCENE_KEYS.MAIN_GAME;
    this.targetWorldAssetId = null;
    this.loadingScreenConfig = null;
    this.loadingUi = null;
  }

  init(data) {
    this.targetSceneKey = data?.targetSceneKey ?? SCENE_KEYS.MAIN_GAME;
    this.targetWorldAssetId = data?.targetWorldAssetId
      ?? getWorldSceneConfig(this.targetSceneKey)?.assetWorldId
      ?? null;
    this.loadingScreenConfig = {
      ...getWorldLoadingScreenConfig(this.targetSceneKey),
      ...(data?.loadingScreenOverrides ?? {}),
    };
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
    const loadingScreenConfig = this.loadingScreenConfig ?? getWorldLoadingScreenConfig(this.targetSceneKey);

    this.cameras.main.setBackgroundColor(loadingScreenConfig.backgroundColor);
    this.add.rectangle(centerX, centerY, width, height, Phaser.Display.Color.HexStringToColor(loadingScreenConfig.backgroundColor).color, 1);
    (loadingScreenConfig.orbColors ?? []).forEach((orb) => {
      this.add.ellipse(
        centerX + (orb.xOffset ?? 0),
        centerY + (orb.yOffset ?? 0),
        orb.width ?? 260,
        orb.height ?? 260,
        orb.color ?? 0x16466a,
        orb.alpha ?? 0.24,
      );
    });

    this.add.rectangle(centerX, centerY, panelWidth, panelHeight, loadingScreenConfig.panelColor, 0.95)
      .setStrokeStyle(2, loadingScreenConfig.panelStrokeColor, 0.68);
    this.add.text(centerX, centerY - 72, loadingScreenConfig.title, {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: loadingScreenConfig.titleColor,
      fontStyle: 'bold',
      stroke: '#050a10',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(centerX, centerY - 22, loadingScreenConfig.subtitle, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: loadingScreenConfig.subtitleColor,
      align: 'center',
      wordWrap: { width: 470 },
    }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY + 40, barWidth + 10, barHeight + 10, 0x02060b, 0.55)
      .setStrokeStyle(1, 0x25445c, 0.9);
    this.add.rectangle(centerX, centerY + 40, barWidth, barHeight, loadingScreenConfig.barFrameColor, 1)
      .setStrokeStyle(2, loadingScreenConfig.barStrokeColor, 0.72);
    const barFill = this.add.rectangle((centerX - (barWidth / 2)) + 3, centerY + 40, 4, barHeight - 6, loadingScreenConfig.barFillColor, 1)
      .setOrigin(0, 0.5);
    const percentText = this.add.text(centerX, centerY + 86, '0%', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: loadingScreenConfig.percentColor,
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
