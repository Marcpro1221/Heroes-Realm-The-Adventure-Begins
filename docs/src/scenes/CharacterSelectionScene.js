import { registerCharacterSelectionAnimations } from '../assets/animations.js';
import { loadCharacterSelectionAssets } from '../assets/loaders.js';
import { PLAYABLE_CHARACTERS, getCharacterConfig } from '../constants/characters.js';
import { SCENE_KEYS } from '../constants/sceneKeys.js';
import { gameState } from '../state/gameState.js';

/**
 * Character selection and title screen scene.
 * This scene is the handoff point between menu flow and gameplay because it
 * chooses which character config `MainScene` should load.
 */
export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CHARACTER_SELECTION);
    this.selectedCharacterId = null;
    this.selectionCards = new Map();
    this.playerName = '';
    this.nameInputHandler = null;
    this.menuBackground = null;
    this.titleText = null;
    this.developerCreditText = null;
  }

  /**
   * Loads menu art, preview sprites, and title music.
   */
  preload() {
    loadCharacterSelectionAssets(this);
  }

  /**
   * Builds the selection screen and waits for the player to continue.
   * The selected id is written to both `gameState` and Phaser's registry:
   * - `gameState` keeps a convenient shared runtime reference
   * - `registry` is the cross-scene source that `MainScene` reads on startup
   */
  create() {
    this.selectedCharacterId = null;
    this.playerName = '';
    this.selectionCards.clear();
    gameState.selectedCharacterId = null;
    gameState.playerName = '';
    this.registry.set('selectedCharacterId', null);
    this.registry.set('playerName', '');

    registerCharacterSelectionAnimations(this);

    this.menuBackground = this.add.image(0, 0, 'menu')
      .setOrigin(0.5)
      .setDepth(0);
    this.titleText = this.add.text(0, 0, 'Select Your Character', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#fff7d1',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(5);

    this.developerCreditText = this.add.text(24, this.scale.height - 18, 'developer: Marc Roland Soniega', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffe8a6',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#8f6b16', blur: 10, fill: true },
    })
      .setOrigin(0, 1)
      .setDepth(6);

    this.promptText = this.add.text(this.scale.width / 2, 380, 'Choose a character first', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    this.nameFieldLabel = this.add.text(0, 0, 'Player Name', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fff7d1',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    this.nameFieldValue = this.add.text(0, 0, 'Name: _', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: 'rgba(8,17,31,0.72)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    PLAYABLE_CHARACTERS.forEach((character) => {
      this.createSelectionCard(character);
    });

    this.layoutSelectionScene();

    gameState.backgroundMusic?.stop();
    gameState.backgroundMusic = this.sound.add('journey', { loop: true, volume: 0.7 });
    gameState.backgroundMusic.play();

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.nameInputHandler = this.handleNameInput.bind(this);
    this.input.keyboard.on('keydown', this.nameInputHandler);
    this.scale.on('resize', this.layoutSelectionScene, this);
    this.events.once('shutdown', this.cleanupSelectionScene, this);
    this.events.once('destroy', this.cleanupSelectionScene, this);
  }

  /**
   * Builds one clickable character preview card.
   * Each card is driven by the same character config used later by `Player`,
   * so the menu and gameplay stay synchronized around one data source.
   */
  createSelectionCard(character) {
    const previewConfig = getCharacterConfig(character.id);
    const previewHitArea = previewConfig.previewHitArea ?? { x: 60, y: 56, width: 24, height: 30 };
    const previewSprite = this.add.sprite(0, 0, previewConfig.previewTextureKey)
      .setDepth(10)
      .setScale(character.previewScale)
      .setInteractive(
        new Phaser.Geom.Rectangle(
          previewHitArea.x,
          previewHitArea.y,
          previewHitArea.width,
          previewHitArea.height,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
    previewSprite.input.cursor = 'pointer';
    const label = this.add.text(0, 0, character.label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);
    previewSprite.play(previewConfig.previewAnimation.key);
    previewSprite.on('pointerdown', () => this.selectCharacter(character.id));

    this.selectionCards.set(character.id, {
      previewSprite,
      label,
      previewScale: character.previewScale,
      previewHitArea,
    });
  }

  /**
   * Fits the menu art to the current camera and grounds each character preview
   * against a shared baseline so the party reads as standing on the same plane.
   */
  layoutSelectionScene() {
    const camera = this.cameras.main;
    const { width, height } = camera;
    const menuTexture = this.textures.get('menu').getSourceImage();
    const backgroundScale = Math.min(width / menuTexture.width, height / menuTexture.height);

    this.menuBackground
      .setPosition(width / 2, height / 2)
      .setScale(backgroundScale);

    this.titleText?.setPosition(width / 2, height * 0.52);
    this.promptText?.setPosition(width / 2, height * 0.60);
    this.developerCreditText?.setPosition(24, height - 18);

    const baseGroundY = height * 0.91;
    const slotXPositions = [0.43, 0.56, 0.67];

    PLAYABLE_CHARACTERS.forEach((character, index) => {
      const card = this.selectionCards.get(character.id);
      if (!card) {
        return;
      }

      const previewX = width * (slotXPositions[index] ?? 0.5);
      const bodyBottomOffset = (card.previewHitArea.y + card.previewHitArea.height - 72) * card.previewScale;
      const previewY = baseGroundY - bodyBottomOffset;
      const labelY = baseGroundY + 18;

      card.previewSprite.setPosition(previewX, previewY);
      card.label.setPosition(previewX, labelY);
    });

    this.updateNameFieldPosition();
  }

  /**
   * Persists the chosen character and refreshes the selection UI.
   * `MainScene` depends on this state being set before the scene transition.
   */
  selectCharacter(characterId) {
    this.selectedCharacterId = characterId;
    gameState.selectedCharacterId = characterId;
    this.registry.set('selectedCharacterId', characterId);

    this.selectionCards.forEach((ui, id) => {
      const isSelected = id === characterId;
      ui.previewSprite.setTint(isSelected ? 0xfff1bf : 0xffffff);
      ui.previewSprite.setScale(isSelected ? (ui.previewScale + 0.2) : ui.previewScale);
      ui.label.setColor(isSelected ? '#fff4c5' : '#f8fafc');
    });

    const selectedCharacter = getCharacterConfig(characterId);
    this.updateNameFieldPosition();
    this.nameFieldLabel.setVisible(true);
    this.nameFieldValue.setVisible(true);
    this.refreshNameFieldText();
    this.promptText.setText(`Enter your name and press Enter to start as ${selectedCharacter.label}`);
    this.promptText.setColor('#fff7d1');
  }

  /**
   * Handles keyboard input for the player name field.
   */
  handleNameInput(event) {
    if (!this.selectedCharacterId) {
      return;
    }

    if (event.key === 'Backspace') {
      this.playerName = this.playerName.slice(0, -1);
      this.refreshNameFieldText();
      return;
    }

    if (!/^[a-zA-Z0-9]$/.test(event.key) || this.playerName.length >= 14) {
      return;
    }

    this.playerName += event.key;
    this.refreshNameFieldText();
  }

  /**
   * Keeps the name field positioned above the selected character preview.
   */
  updateNameFieldPosition() {
    if (!this.selectedCharacterId) {
      return;
    }

    const selectedCard = this.selectionCards.get(this.selectedCharacterId);
    if (!selectedCard) {
      return;
    }

    const fieldX = selectedCard.previewSprite.x;
    const fieldY = selectedCard.previewSprite.y - 110;
    this.nameFieldLabel.setPosition(fieldX, fieldY);
    this.nameFieldValue.setPosition(fieldX, fieldY + 28);
  }

  /**
   * Refreshes the displayed player-name text and shared scene state.
   */
  refreshNameFieldText() {
    const trimmedName = this.playerName.trim();
    this.nameFieldValue.setText(`Name: ${this.playerName || '_'}`);
    gameState.playerName = trimmedName;
    this.registry.set('playerName', trimmedName);

    if (!this.selectedCharacterId) {
      this.promptText.setText('Choose a character first');
      this.promptText.setColor('#ffffff');
      return;
    }

    const selectedCharacter = getCharacterConfig(this.selectedCharacterId);
    if (!trimmedName) {
      this.promptText.setText(`Enter your name before starting as ${selectedCharacter.label}`);
      this.promptText.setColor('#ffcf5a');
      return;
    }

    this.promptText.setText(`Press Enter to start as ${selectedCharacter.label}`);
    this.promptText.setColor('#fff7d1');
  }

  /**
   * Removes transient selection-scene handlers.
   */
  cleanupSelectionScene() {
    if (this.nameInputHandler) {
      this.input.keyboard.off('keydown', this.nameInputHandler);
      this.nameInputHandler = null;
    }

    this.scale.off('resize', this.layoutSelectionScene, this);
  }

  /**
   * Starts the main game once the player has selected a character.
   */
  update() {
    this.updateNameFieldPosition();

    if (!Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      return;
    }

    if (!this.selectedCharacterId) {
      this.promptText.setText('Select a character before pressing Enter');
      this.promptText.setColor('#ffcf5a');
      return;
    }

    if (!this.playerName.trim()) {
      this.promptText.setText('Enter a player name before pressing Enter');
      this.promptText.setColor('#ffcf5a');
      return;
    }

    gameState.backgroundMusic?.stop();
    this.scene.start(SCENE_KEYS.WORLD_LOADING, { targetSceneKey: SCENE_KEYS.MAIN_GAME });
  }
}
