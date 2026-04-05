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
        this.patrolStartX = this.x;
        this.patrolEndX = this.enemyLastPosition;
        this.prevX = this.x; // store initial previous X
        this.patrolSpeed = 55 * 1.01;
        this.patrolDirection = this.patrolEndX < this.patrolStartX ? -1 : 1;
        this.knockbackVelocityX = 0;
        this.knockbackDamping = 0.84;
        this.knockbackFacingLock = null;
        this.knockbackFacingThreshold = 6;
        this.detectionZone = new Hitbox(this.scene, this.x, this.y, 120, 100);
        this.enemyHitBox = new Hitbox(this.scene, this.x, this.y, 65, 30);
    }
    updateMovement(){
        const patrolMinX = Math.min(this.patrolStartX, this.patrolEndX);
        const patrolMaxX = Math.max(this.patrolStartX, this.patrolEndX);

        if (this.x <= patrolMinX) {
            this.x = patrolMinX;
            this.patrolDirection = 1;
        } else if (this.x >= patrolMaxX) {
            this.x = patrolMaxX;
            this.patrolDirection = -1;
        }

        const patrolVelocityX = this.patrolSpeed * this.patrolDirection;
        this.setVelocityX(patrolVelocityX + this.knockbackVelocityX);

        if (Math.abs(this.knockbackVelocityX) < 6) {
            this.knockbackVelocityX = 0;
        } else {
            this.knockbackVelocityX *= this.knockbackDamping;
        }

        if (Math.abs(this.knockbackVelocityX) >= this.knockbackFacingThreshold && this.knockbackFacingLock !== null) {
            this.applyFacing(this.knockbackFacingLock);
        } else {
            this.knockbackFacingLock = null;

            if (this.body.velocity.x < 0) {
                this.applyFacing(false);
            } else if (this.body.velocity.x > 0) {
                this.applyFacing(true);
            }
        }

        this.prevX = this.x;
    }
    applyFacing(flipX){
        this.flipX = flipX;

        if (flipX) {
            this.body.setOffset(0, 7);
            return;
        }

        this.body.setOffset(30, 7);
    }
    applyKnockback(knockbackVelocityX, knockbackVelocityY){
        this.knockbackVelocityX = knockbackVelocityX;
        this.knockbackFacingLock = this.flipX;

        if (typeof knockbackVelocityY === 'number') {
            this.setVelocityY(knockbackVelocityY);
        }
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
    }
    updateOnPlayerDetection(player){
        if (this.detectionZone.getBounds().contains(player.x, player.y)) {
            console.log('Player detected by enemy!');
        }
    }
}
