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
        this.cursors = scene.input.keyboard.createCursorKeys();
        const customKeys = ['C', 'W', 'A', 'D', 'V', 'X', 'SPACE'];
        customKeys.forEach(key => {
            this[`key${key}`] = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[key]); //ex: this.keyC
        });
        this.swordHitBox = new Hitbox(scene, this.x, this.y, 65, 40);
        this.spinHitBox = new Hitbox(scene, this.x, this.y, 145, 40);
    }
    update(){
        let movingX = false;
        let speed = 240;
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

        if(this.anims.currentAnim.key === 'spinAttack'){
            if(this.flipX){
                this.setVelocityX(-speed - 100);
            }else{
                this.setVelocityX(speed + 100);
            }
        }
        this.once('animationcomplete', () => {
            this.anims.play('idle', true);
            this.swordSwing = false;
            console.log('sword swing complete');
        });


        //console.log(this.anims.currentAnim.key, this.anims.currentFrame.index);
    }
    hitboxOne(){
        this.swordHitBox.setVisible(false);

        this.flipX ? this.swordHitBox.follow(this, -45, 0) : this.swordHitBox.follow(this, 45, 0); 

        if(this.anims.currentAnim.key === 'smash' && this.anims.currentFrame.index === 11){
            this.swordHitBox.body.enable = true; // enable hitbox on frame index 11
        }else if(this.anims.currentAnim.key === 'smash' && this.anims.currentFrame.index === 15){
            this.swordHitBox.body.enable = false; // disable hitbox on frame index 15
        }
        console.log('Player', this.anims.currentAnim.key, this.swordHitBox.body.enable)
   
    }
    hitboxTwo(){
        this.spinHitBox.setVisible(false);
        this.flipX ? this.spinHitBox.follow(this, -7, 0) : this.spinHitBox.follow(this, 7, 0); 
        
        if(this.anims.currentAnim.key === 'spinAttack' && this.anims.currentFrame.index === 1){
            this.spinHitBox.body.enable = true; // enable hitbox on frame index 11
        }else if(this.anims.currentAnim.key === 'spinAttack' && this.anims.currentFrame.index === 4){
            this.spinHitBox.body.enable = false; // disable hitbox on frame index 15
        }
        console.log('Player', this.anims.currentAnim.key, this.spinHitBox.body.enable);
        console.log(this.spinHitBox.body);
    }
    attackThree(){
    }
 
}