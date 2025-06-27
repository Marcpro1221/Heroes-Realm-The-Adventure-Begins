import Sprite from './Sprite.js';
import config from './index.js';
export default class MainScene extends Phaser.Scene{
    constructor(){
        super('MainGameScene');
    }
    preload(){
        Sprite.backgroundSprite(this);
        //Sprite.repearLoadAsset(this);
        Sprite.luneBladeLoadAsset(this);
        Sprite.enemySprites(this);
    }
    create(){
        Sprite.enemyMovement(this);
        Sprite.luneBladeAnimateAsset(this);
        //Sprite.repearAnimateAsset(this);
        gameState.portal = this.add.image((gameState.width / 2) - 950, gameState.height - 1100, 'portal').setDepth(11);
        this.add.text((gameState.width / 2) - 850, gameState.height - 1100, 'COMING SOON....');
        const single_platform_position = [
            {x: (gameState.width / 2) - 950, y: gameState.height - 950}, // platform position x & y
            {x: gameState.width - 550, y: gameState.height - 250}, 
            {x: gameState.width - 550, y: gameState.height - 930},
            {x: gameState.width - 230, y: gameState.height - 330}
        ];

         this.enemyPosition = [ // NEED TO UPDATE TO MAKE SPAWNING 
                               {x: 2200, y: 1250}, // enemy position x & y
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 3000, y: 500},
                               {x: 3000, y: 500},
                               {x: 3000, y: 500},
                            ];

        gameState.enemyMushroom = this.physics.add.group();                       

        gameState.player = this.physics.add.sprite(250, 1250, 'idle').setDepth(100);
        gameState.player.body.setSize(15, 18, true);
        gameState.player.body.setOffset(65, 63); // position x & y relative to the spritesheet
        gameState.player.setCollideWorldBounds(true);

        gameState.platforms = this.physics.add.staticGroup(); //for all platform type
        gameState.platforms.create(0, gameState.height - 100, 'ground').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1); //224 is the ground height
        gameState.platforms.create((gameState.width / 2) - 600, 700, 'upper_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1);
        gameState.platforms.create((gameState.width) - 1250, gameState.height - 1080, 'medium_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1);

        single_platform_position.forEach(platform => gameState.platforms.create(platform.x, platform.y, 'single_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1));
        
        this.enemyPosition.forEach((enemyPos, i) => {
            setTimeout(()=>{ //delay of enemy spawn
                const enemy = gameState.enemyMushroom.create(enemyPos.x, enemyPos.y, 'enemy_walk');
                enemy.body.setSize(40, 65, true);
                enemy
                    .setOrigin(0, 0)
                    .setScale(2)
                    .setDepth(10)
                    .setScrollFactor(1)
                    .refreshBody(); 
                    
                this.physics.add.collider(enemy,gameState.platforms); // collider for each enemy
                this.physics.add.overlap(gameState.player, enemy, (player, enemy)=>{
                    console.log('Collided!');
                    if (!player.isHurting) { // custom flag to prevent repeat
                        player.isHurting = true;
                    
                        //player.anims.play('hurt', true); // play hurt animation once
                        player.setTint(0xff0000); // optional visual feedback
                    
                        this.time.delayedCall(500, () => {
                          player.clearTint();
                          player.isHurting = false;
                          //player.anims.play('idle', true); // return to idle or original anim
                        });
                      }
                      if(!player.flipX){
                        player.x += 0.2;
                      }else{
                        player.x -= 0.2;
                      }
                      
                });
                let prevX = enemy.x;

                this.tweens.add({
                    targets: enemy,
                    x: enemy.x - 1000, //enemy.x - 1000 <= change to  after testing
                    ease: 'linear',
                    duration: 8000,
                    paused: false,
                    repeat: -1,
                    yoyo: true,
                    onUpdate: () => {
                    // Update physics body
                        enemy.body.updateFromGameObject();
                        // Flip sprite based on movement direction
                        if (enemy.x < prevX) {
                            enemy.flipX = false; // facing left
                            enemy.body.setOffset(30, 7); // facing left position x & y hitbox
                        } else if (enemy.x > prevX) {
                            enemy.flipX = true; // facing right position x & y hitbox
                            enemy.body.setOffset(0, 7);
                        }
                            prevX = enemy.x;
                        }
                }); 
                 
            }, i * 5000);
        });
        
        // moving the 6th platform
        this.characterTweensY(gameState.platforms.getChildren()[6], gameState.height - 830, 3000, false, -1, true, gameState.platforms.getChildren()[6].body);
       
        // function of different features
        this.createParallaxBackground();
        this.createKeys(); 
        this.createSoundEffects(); // background music and sound effect

        //Cameras
        this.cameras.main.setBounds(0, 0, gameState.width, gameState.height);
        this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
        this.cameras.main.setFollowOffset(100, 0.5);
        this.cameras.main.setDeadzone(250, 250);
        this.physics.world.setBounds(0, 0, gameState.width, gameState.height);
        this.physics.add.collider(gameState.player, gameState.platforms);
    }

    update(){  
        gameState.enemyMushroom.getChildren().forEach(enemy => {
            enemy.anims.play('enemy_walk', true);
        });
        this.createMovement();
    }
    createMovement(){
        const cursors = gameState.cursors;
        const player = gameState.player;
        const key = {
            keyC : gameState.keyC,
            keyA : gameState.keyA,
            keyD : gameState.keyD,
            keyW : gameState.keyW,
            keyV : gameState.keyV,
            keyX : gameState.keyX,
            keySpace : gameState.keySpace
        };
    
        // LuneReaper Asset Load
        function luneReaperMovement(){
            if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
                player.setVelocityY(-430);
                player.setScale(2.5);
            }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
                player.anims.play('idle', true); // set to frame index 2 of the jump spritesheet
                player.setScale(2.5);
            }else if(cursors.left.isDown || key.keyA.isDown){
                player.setVelocityX(-250);
                player.setFlipX(true);
                player.anims.play('run', true);
                console.log(player.x)// debugger
                player.setScale(2.5);
        
            }else if(cursors.right.isDown || key.keyD.isDown){
                player.setVelocityX(250);
                player.anims.play('run', true);
                player.setFlipX(false);
                console.log(player.x) /// debugger
                player.setScale(2.5);
        
            }else if(key.keyC.isDown){
                console.log(player.anims.play('slash', true));
                player.setVelocityX(0);
                player.setScale(2.5);
            }else if(key.keyX.isDown){
                console.log( player.anims.play('double_slash', true));
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.setVelocityX(-50);
                    }else{
                        player.setVelocityX(50);
                    }
                    player.setScale(2.5);
            }else if(key.keyV.isDown){
                console.log(player.anims.play('dash', true));
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.x -= 10;
                    }else{
                        player.x += 10;
                    }
                    player.setScale(2.5);
            }else if(key.keySpace.isDown && player.body.blocked.down){
                console.log(player.anims.play('special_skill', true));
               player.setScale(3);
                player.setVelocityX(0);
            }
            else{
                player.setVelocityX(0);
                player.setScale(2.5);
                player.anims.play('idle', true);
            }
        }
        
        function luneBladeMovement(){
        // Lune Blade Asset Load
            if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
                player.setVelocityY(-550);
                player.setScale(2.5);
            }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
                player.anims.play('fall', true); // set to frame index 2 of the jump spritesheet
                player.setScale(2.5);
            }else if(cursors.left.isDown || key.keyA.isDown){
                player.setVelocityX(-240);
                player.setFlipX(true);
                player.anims.play('run', true);
                console.log(player.x)// debugger
                player.setScale(2.5);
            }else if(cursors.right.isDown || key.keyD.isDown){
                player.setVelocityX(240);
                player.anims.play('run', true);
                player.setFlipX(false);
                console.log(player.x) /// debugger
                player.setScale(2.5);
            }else if(key.keyC.isDown){
                console.log(player.anims.play('smash', true));
                player.setVelocityX(0);
                player.setScale(2.5);
            }else if(key.keyX.isDown){
                console.log( player.anims.play('spinAttack', true));
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.setVelocityX(-400);
                    }else{
                        player.setVelocityX(400);
                    }
                    player.setScale(2.5);
            }else if(key.keyV.isDown){
                console.log(player.anims.play('thrust', true));
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.setVelocityX(-100);
                    }else{
                        player.setVelocityX(100);
                    }
                    player.setScale(2.5);
            }else if(key.keySpace.isDown && player.body.blocked.down){
                console.log(player.anims.play('specialAttack', true));
                player.setVelocityX(0);
                player.setScale(2.5);            
            }
            else{
                player.setVelocityX(0);
                player.anims.play('idle', true);
                player.setScale(2.5);
            }

        }

        //luneReaperMovement(); // calling function for character movement
        luneBladeMovement(); // calling function for character movement
    }

    createSoundEffects(){
        this.sound.add('grassy_biome', { loop: true, volume: 2}).play();//sounds
    }
    
    createKeys(){ 
        gameState.cursors = this.input.keyboard.createCursorKeys();
        gameState.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        gameState.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        gameState.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        gameState.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        gameState.keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
        gameState.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        gameState.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    }
    createParallaxBackground(){
        gameState.clouds = this.add.image(0, gameState.height - 1450, 'clouds').setOrigin(0, 0).setDepth(1);
        gameState.mountain = this.add.image(0, gameState.height - 970, 'mountain').setOrigin(0, 0).setDepth(2);
        gameState.ruins = this.add.image(0, config.height, 'ruins').setOrigin(0, 0).setDepth(3);
        gameState.trees = this.add.image(0, gameState.height - 650, 'trees').setOrigin(0, 0).setDepth(5);
        gameState.clouds.setScrollFactor(0.2, 0.1);
        gameState.mountain.setScrollFactor(0.5, 0.4);
        gameState.ruins.setScrollFactor(0.5, 0.5);
        gameState.trees.setScrollFactor(0.7, 0.7);
    }
    characterTweensY(target, y, duration, isPause, repetation, isYoYo, objectBody){
        this.tweens.add({
            targets: target,
            y: y,
            ease: 'linear', // given
            duration: duration,
            paused: isPause,
            repeat: repetation,
            yoyo: isYoYo,
            onUpdate: () => {
                // Sync physics body with the tweened position
                objectBody.updateFromGameObject();
              }
        });
    }
    characterTweensX(target, x, duration, isPause, repetation, isYoYo, objectBody){
        this.tweens.add({
            targets: target,
            x: x,
            ease: 'linear', // given
            duration: duration,
            paused: isPause,
            repeat: repetation,
            yoyo: isYoYo,
            onUpdate: () => {
                // Sync physics body with the tweened position
                objectBody.updateFromGameObject();
              }
        });
    }
}   



/**
 * 1. Create and Fix World asset
 * 2. platform collider
 */