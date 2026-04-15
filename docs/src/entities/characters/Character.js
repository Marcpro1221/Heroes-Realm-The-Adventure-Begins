/**
 * Base character class for shared popup and physics behavior.
 * `Player` and `Enemy` both extend this so common visual feedback stays in one
 * place instead of being duplicated in separate entity classes.
 */
export default class Character extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  /**
   * Displays floating combat text above the character.
   */
  showDamagePopup(x, y, damage, color = '#ff0000', duration = 800, riseDistance = 70) {
    const damageText = this.scene.add.text(x, y, damage.toString(), {
      fontFamily: 'Arial',
      fontSize: '28px',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - riseDistance,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => damageText.destroy(),
    });
  }
}
