class Test extends Phaser.Scene{
    constructor(){
        super('Test');
        
    }
    preload(){
        this.load.spritesheet('idle', 'Resources/Assets/Sprite_Sheet_Luneblace/Idle.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        this.load.spritesheet('run', 'Resources/Assets/Sprite_Sheet_Luneblace/Run.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        this.load.spritesheet('smash', 'Resources/Assets/Sprite_Sheet_Luneblace/Smash.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        this.load.spritesheet('jump', 'Resources/Assets/Sprite_Sheet_Luneblace/Jump.png',{
            frameWidth : 144,
            frameHeight : 144
        });

    }
    create(){

        this.anims.create({ // Idle animation sprite
            key: 'idle',
            frames: this.anims.generateFrameNumbers('idle',{start: 0, end: 7}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({ // Smash animation sprite
            key: 'smash',
            frames: this.anims.generateFrameNumbers('smash',{start: 0, end:16}),
            frameRate: 15,
            repeat: 0,
        });
        this.anims.create({ // Run Animation sprite
            key: 'run',
            frames : this.anims.generateFrameNumbers('run',{start: 0, end: 7}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({ // Run Animation sprite
            key: 'jump',
            frames : this.anims.generateFrameNumbers('jump',{start: 0, end: 5}),
            frameRate: 10,
            repeat: -1
        });
        this.hitpoint = 100;

        this.player = this.physics.add.sprite(100, 100, 'idle').setDepth(100);
        this.player.body.setSize(15, 18, true);
        this.player.setScale(2.5);
        this.player.setCollideWorldBounds(true);
        this.player.swordSwing = false;

        this.hpText = this.add.text(config.width - 80, config.height - 120, `HP: ${this.hitpoint}`)

        this.box = this.add.rectangle(config.width - 50, config.height - 50, 40, 80, 0xd3d3d3, 0.5);
        this.swordHitBox = this.add.rectangle(this.player.x, this.player.y, 65, 40, 0xd3d3d3, 0.3);
        this.swordHitBox.setVisible(false);
        this.physics.add.existing(this.box, true);
        this.physics.add.existing(this.swordHitBox, true);
        this.swordHitBox.body.enable = false;
        this.physics.add.overlap(this.box, this.swordHitBox, ()=>{
            this.box.fillColor = 0xff0000;
            this.box.fillAlpha = 1;
            console.log('Hit!');
            this.isOverLap = true;
            console.log(this.hitpoint -= Math.random() * 2);

                if(this.hitpoint <= 0){
                    this.hitpoint = 100;
                }
            this.hpText.setText(`HP: ${Math.floor(this.hitpoint)}`);
            
        });
        this.keys = this.input.keyboard.createCursorKeys();
    }
    update(){

        this.player.setVelocityX(0);
        let movingX = false;
        let movingY = false;
        this.isOverLap = false;

        if(!this.player.swordSwing){
            if(this.keys.space.isDown){
                this.player.swordSwing = true; 
                this.player.anims.play('smash', true);
                    this.player.once('animationcomplete', ()=>{
                        this.player.anims.play('idle', true);
                        this.player.swordSwing = false;
                    });
            }else{
                if(this.keys.up.isDown){
                    this.player.setVelocityY(-100);
                    this.player.anims.play('jump', true);
                    movingY = true;
                    
                }else if(this.keys.down.isDown){
                    this.player.setVelocityY(100);
                    this.player.anims.play('jump', true);
                    movingY = true;
                }
                if(this.keys.left.isDown){
                    this.player.setVelocityX(-100);
                    this.player.anims.play('run', true);
                    this.player.setFlipX(true);
                    movingX = true;
                    
                }else if(this.keys.right.isDown){
                    this.player.setVelocityX(100);
                    this.player.setFlipX(false);
                    this.player.anims.play('run', true);
                    movingX = true;
                }  
                if(!movingX && !movingY){
                    this.player.anims.play('idle', true);
                }
            }
        }

        if(this.player.flipX){
            this.swordHitBox.x = this.player.x - 55;
            this.swordHitBox.y = this.player.y;
        }else{
            this.swordHitBox.x = this.player.x + 55;
            this.swordHitBox.y = this.player.y;
        }
        this.swordHitBox.body.updateFromGameObject();
        
        if (!this.isOverLap && !this.resettingColor) {
            this.resettingColor = true;
            this.time.delayedCall(50, () => {
                this.box.fillColor = 0xd3d3d3;
                this.box.fillAlpha = 0.5;
                this.resettingColor = false;
            });
        }
        if(this.player.anims.currentFrame.index === 11 && this.player.anims.currentAnim.key === 'smash'){ // hitbox visible on frame index 11
            this.swordHitBox.body.enable = true;
        }else if(this.player.anims.currentFrame.index === 15 && this.player.anims.currentAnim.key === 'smash'){ // hitbox not visible on frame index 15
            this.swordHitBox.body.enable = false;
        } 
        console.log(this.player.anims.currentAnim.key);
    }

}




const config = {
    type : Phaser.AUTO,
    width : 536,
    height : 336,
    backgroundColor: 0x000000,
    scene : [Test],
    physics : {
        default:'arcade',
        arcade:{
            gravity:{y:800},
            debug:true
        }
    },
  }
  const game = new Phaser.Game(config);