import Hitbox from "./Hitbox.js";
export default class Character extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }
    takenDamage(damage) {
    }
    showDamagePopup(x, y, damage) {
        const damageText = this.scene.add.text(x, y, damage.toString(), {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5);

        this.scene.tweens.add({
          targets: damageText,
          y: damageText.y - 70,
          alpha: 0,
          duration: 800,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            damageText.destroy();
          }
        });
        damageText.setDepth(10);
    }
}