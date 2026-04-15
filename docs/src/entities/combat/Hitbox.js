/**
 * Simple invisible rectangle used for attack and detection overlap checks.
 * These hitboxes are created by entities (`Player`, `Enemy`) and then wired
 * into actual overlap/collision rules by scene or system code.
 */
export default class Hitbox extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, fillColor = 0xff0000, fillAlpha = 0) {
    super(scene, x, y, width, height, fillColor, fillAlpha);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.allowGravity = false;
    this.body.setSize(width, height, true);
    this.body.enable = false;
  }

  /**
   * Keeps the hitbox aligned to a target object every frame.
   */
  follow(target, offsetX, offsetY) {
    this.x = target.x + offsetX;
    this.y = target.y + offsetY;

    if (!this.body) {
      return;
    }

    this.body.updateFromGameObject();
  }
}
