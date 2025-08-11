import Character from "./Character.js";
import Hitbox from "./Hitbox.js";
export default class Enemy extends Character {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.setOrigin(0, 0);
        this.setDepth(10);
        this.setScrollFactor(1);
        this.enemyLastPosition = this.x / 2; // store patrol target
        this.prevX = this.x; // store initial previous X
        this.detectionZone = new Hitbox(this.scene, this.x, this.y, 120, 100);
        this.enemyHitBox = new Hitbox(this.scene, this.x, this.y, 65, 30);
        this.patrol = this.scene.tweens.add({
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
    detectionZoneArea(){  
        if(this.flipX){
            this.detectionZone.follow(this, 60, 50); // follow the enemy with an offset
            this.enemyHitBox.follow(this, 90, 90);
        }else{
            this.detectionZone.follow(this, 50, 50); // follow the enemy with an offset
            this.enemyHitBox.follow(this, 20, 90);
        }
        

        this.enemyHitBox.setDepth(10);
        this.detectionZone.setDepth(10);

        /*
        1. if the player within the detection zone, set tween to false,
        and set animation to idle, 
        2. if the player not within the detection zone, set tween to true,
        and set animation to patrol.
        3. if the player within the enemyHitBox, set animation to attack.
        */

    }
    updateOnPlayerDetection(player){
        if (this.detectionZone.getBounds().contains(player.x, player.y)) {
            // this.patrol.paused = true; // pause the patrol tween
            console.log('Player detected by enemy!');
        }else{
            this.patrol.paused = false; // resume the patrol tween
        }
    }
}