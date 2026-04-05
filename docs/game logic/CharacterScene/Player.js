import Character from "./Character.js";
import Hitbox from "./Hitbox.js";
export default class Player extends Character {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.setCollideWorldBounds(true);
        this.body.setSize(12, 18, true);
        this.body.setOffset(66, 63);
        this.setScale(2.2);
        this.setDepth(100);
        this.swordSwing = false;
        this.attackAnimationHandlerBound = false;
        this.playerName = 'Marc';
        this.maxHp = 100;
        this.currentHp = this.maxHp;
        this.maxMana = 100;
        this.currentMana = this.maxMana;
        this.level = 1;
        this.currentExp = 0;
        this.expToNextLevel = 500;
        this.availableAttackUpgradePoints = 0;
        this.attackUpgradeLevels = {
            smash: 0,
            spinAttack: 0,
            thrust: 0
        };
        this.defenseUpgradeLevel = 0;
        this.defensePercentPerLevel = 0.01;
        this.isDead = false;
        this.isHurting = false;
        this.cursors = scene.input.keyboard.createCursorKeys();
        const customKeys = ['C', 'W', 'A', 'D', 'V', 'X', 'SPACE'];
        customKeys.forEach(key => {
            this[`key${key}`] = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[key]); //ex: this.keyC
        });

        this.swordHitBox = new Hitbox(scene, this.x, this.y, 65, 40);
        this.spinHitBox = new Hitbox(scene, this.x, this.y, 145, 40);
        this.thrustAttackHitBox = new Hitbox(scene, this.x, this.y, 95, 25);
        this.bindAttackAnimationHandlers();
    }
    enableProfileInteraction() {
        const hitArea = new Phaser.Geom.Rectangle(
            this.body.offset.x,
            this.body.offset.y,
            this.body.width,
            this.body.height
        );

        this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    }
    getDefensePercent() {
        return this.defenseUpgradeLevel * this.defensePercentPerLevel;
    }
    getDefenseValue() {
        return Math.round(this.maxHp * this.getDefensePercent());
    }
    // Attack animation listener: reset combat state once per finished attack animation.
    bindAttackAnimationHandlers(){
        if (this.attackAnimationHandlerBound) {
            return;
        }

        this.on('animationcomplete', (animation) => {
            const attackAnimations = ['smash', 'thrust', 'spinAttack', 'specialAttack'];

            if (!attackAnimations.includes(animation.key)) {
                return;
            }

            this.swordSwing = false;
            this.swordHitBox.body.enable = false;
            this.spinHitBox.body.enable = false;
            this.thrustAttackHitBox.body.enable = false;
            this.anims.play('idle', true);
        });

        this.attackAnimationHandlerBound = true;
    }
    update(){
        if (this.isDead) {
            this.setVelocityX(0);
            return;
        }

        let movingX = false;
        let speed = 200;
        this.isOverLap = false;

        if(!this.swordSwing){
            this.setVelocityX(0);
            if(this.keyC.isDown){
                this.swordSwing = true;
                this.anims.play('smash', true);  
            }else if(this.keyV.isDown){
                this.swordSwing = true;
                this.anims.play('thrust', true);

            }else if(Phaser.Input.Keyboard.JustDown(this.keyX)){
                this.swordSwing = true;
                this.anims.play('spinAttack', true);

            }else if(this.keySPACE.isDown && this.body.blocked.down){
                this.swordSwing = true;
                this.anims.play('specialAttack', true);
            }
            else{
                if((this.cursors.up.isDown || this.keyW.isDown) && this.body.blocked.down){
                    this.setVelocityY(-490);
                    this.anims.play('jump', true);
                }
                if(this.cursors.left.isDown || this.keyA.isDown){
                    this.setVelocityX(-speed);
                    this.anims.play('run', true);
                    this.flipX = true;
                    movingX = true;
                }else if(this.cursors.right.isDown || this.keyD.isDown){
                    this.setVelocityX(speed);
                    this.flipX = false;
                    this.anims.play('run', true);
                    movingX = true;
                }

                if(this.body.velocity.y > 0 && !this.body.touching.down){
                    this.anims.play('fall', true);
                }else if(!movingX){
                    this.anims.play('idle', true);
                    this.setVelocityX(0);
                }
            }
        }

        if(this.anims.currentAnim?.key === 'spinAttack'){
            if(this.flipX){
                this.setVelocityX(-speed - 100);
            }else{
                this.setVelocityX(speed + 100);
            }
        }


        //console.log(this.anims.currentAnim.key, this.anims.currentFrame.index);
    }
    hitboxOne(){
        this.swordHitBox.setVisible(false);

        this.flipX ? this.swordHitBox.follow(this, -45, 0) : this.swordHitBox.follow(this, 45, 0); 

        if(this.anims.currentAnim?.key === 'smash' && this.anims.currentFrame?.index === 11){
            this.swordHitBox.body.enable = true; // enable hitbox on frame index 11
            if (!this.thrustSoundPlayed) {
                this.scene.sound.play('smashAttack', { volume: 1.5 });
                this.thrustSoundPlayed = true;
            }
        }else if(this.anims.currentAnim?.key === 'smash' && this.anims.currentFrame?.index === 14){
            this.swordHitBox.body.enable = false; // disable hitbox on frame index 15
            this.thrustSoundPlayed = false;
        }
   
    }
    hitboxTwo(){
        this.spinHitBox.setVisible(false);
        this.flipX ? this.spinHitBox.follow(this, -7, 0) : this.spinHitBox.follow(this, 7, 0); 
        
        if(this.anims.currentAnim?.key === 'spinAttack' && this.anims.currentFrame?.index === 1){
            this.spinHitBox.body.enable = true; // enable hitbox on frame index 11
            if (!this.thrustSoundPlayed) {
                this.scene.sound.play('spinAttack', { volume: 1.5 });
                this.thrustSoundPlayed = true;
            }
        }else if(this.anims.currentAnim?.key === 'spinAttack' && this.anims.currentFrame?.index === 4){
            this.spinHitBox.body.enable = false; // disable hitbox on frame index 15
            this.thrustSoundPlayed = false;
        }
    }
    hitboxThree(){
        this.thrustAttackHitBox.setVisible(false);
        this.flipX ? this.thrustAttackHitBox.follow(this, -35, 2) : this.thrustAttackHitBox.follow(this, 35, 2);

        if(this.anims.currentAnim?.key === 'thrust' && this.anims.currentFrame?.index === 1){
            this.thrustAttackHitBox.body.enable = true; // enable hitbox on frame index 11
            if (!this.thrustSoundPlayed) {
                this.scene.sound.play('thrustAttack', { volume: 1.5 });
                this.thrustSoundPlayed = true;
            }
        }else if(this.anims.currentAnim?.key === 'thrust' && this.anims.currentFrame?.index === 2){
            this.thrustAttackHitBox.body.enable = false; // disable hitbox on frame index 15
            this.thrustSoundPlayed = false;
        }
    }
 
}
