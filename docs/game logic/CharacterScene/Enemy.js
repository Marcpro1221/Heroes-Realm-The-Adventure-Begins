import Character from "./Character.js";
export default class Enemy extends Character {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.setOrigin(0, 0);
        this.setDepth(10);
        this.setScrollFactor(1);
        this.enemyLastPosition = this.x / 2; // store patrol target
        this.prevX = this.x; // store initial previous X

        this.scene.tweens.add({
            targets: this,
            x: this.enemyLastPosition,
            duration: 8000,
            paused: false,
            repeat: -1,
            yoyo: true,
            onUpdate: () => {
                this.body.updateFromGameObject();

                if (this.x < this.prevX) {
                    this.flipX = false;
                    this.body.setOffset(30, 7);
                } else if (this.x > this.prevX) {
                    this.flipX = true;
                    this.body.setOffset(0, 7);
                }
                this.prevX = this.x; // update previous X for next frame
            }
        });
        
    }
    update(){ 

    }
}