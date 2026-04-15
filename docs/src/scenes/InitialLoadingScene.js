import { loadCharacterSelectionAssets } from '../assets/loaders.js';
import { SCENE_KEYS } from '../constants/sceneKeys.js';

export default class InitialLoadingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.INITIAL_LOADING);
    this.loadingUi = null;
  }

  preload() {
    this.createLoadingUi({
      title: 'Heroes Realm',
      subtitle: 'Preparing character selection assets...',
      accentColor: 0xf7c35f,
    });
    this.bindLoaderProgress();
    loadCharacterSelectionAssets(this);
  }

  create() {
    this.scene.start(SCENE_KEYS.BOOT);
  }

  createLoadingUi({ title, subtitle, accentColor }) {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 520;
    const panelHeight = 220;
    const barWidth = 360;
    const barHeight = 22;

    this.cameras.main.setBackgroundColor('#09131f');
    this.add.rectangle(centerX, centerY, width, height, 0x09131f, 1);
    this.add.ellipse(centerX - 220, centerY - 120, 280, 280, 0x12324b, 0.38);
    this.add.ellipse(centerX + 210, centerY + 80, 240, 240, 0x224f71, 0.28);

    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x0f1d2d, 0.94)
      .setStrokeStyle(2, 0x5eb7ff, 0.58);
    const titleText = this.add.text(centerX, centerY - 60, title, {
      fontFamily: 'Georgia',
      fontSize: '34px',
      color: '#f8f1c2',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const subtitleText = this.add.text(centerX, centerY - 14, subtitle, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d9ecff',
    }).setOrigin(0.5);
    const barShadow = this.add.rectangle(centerX, centerY + 34, barWidth + 8, barHeight + 8, 0x02060b, 0.55)
      .setStrokeStyle(1, 0x27435b, 0.9);
    const barFrame = this.add.rectangle(centerX, centerY + 34, barWidth, barHeight, 0x14283a, 1)
      .setStrokeStyle(2, 0x6ec6ff, 0.65);
    const barFill = this.add.rectangle((centerX - (barWidth / 2)) + 2, centerY + 34, 4, barHeight - 6, accentColor, 1)
      .setOrigin(0, 0.5);
    const percentText = this.add.text(centerX, centerY + 74, '0%', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#fff8d9',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.loadingUi = {
      panel,
      titleText,
      subtitleText,
      barShadow,
      barFrame,
      barFill,
      percentText,
      barWidth,
    };
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
    const fillWidth = Math.max(4, (this.loadingUi.barWidth - 4) * clampedProgress);
    this.loadingUi.barFill.width = fillWidth;
    this.loadingUi.percentText.setText(`${Math.round(clampedProgress * 100)}%`);
  }
}
