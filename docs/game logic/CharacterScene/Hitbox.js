
export default class Hitbox extends Phaser.GameObjects.Rectangle{
    constructor(scene, x, y, width, height, fillColor = 0xff0000, fillAlpha = 0.2) {
        super(scene, x, y, width, height, fillColor, fillAlpha);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        this.body.allowGravity = false; // Disable gravity for hitbox
        this.body.setSize(width, height, true); // Set the size of the hitbox
        this.body.enable = false; // Initially disable the hitbox
    }
    follow(target, offsetX, offsetY){
        this.x = target.x + offsetX;
        this.y = target.y + offsetY;
        this.body.updateFromGameObject();
    }
}