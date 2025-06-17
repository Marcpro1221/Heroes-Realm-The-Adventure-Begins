import Sprite from './Sprite.js';
const gameState = {};
export default class MainScene extends Phaser.Scene{
    constructor(){
        super('MainGameScene');
    }
    preload(){
     this.load.image('bg', 'Resources/Assets/Images/map2.png');
      //Sprite.luneBlaceLoadAsset(this);
     Sprite.repearLoadAsset(this);
    }
    create(){
      // Sprite.luneBlaceAnimateAsset(this);
    Sprite.repearAnimateAsset(this);
    gameState.bg = this.add.image(0, 0, 'bg').setOrigin(0,0);
    gameState.ground = this.physics.add.staticImage(4512 / 2, 460 - 80 / 2, 'bg'); // Calculation for ground Collision detection
   // gameState.platforms = this.physics.add.staticGroup();

    // Idle Player & Collide
    gameState.player = this.physics.add.sprite(250, 150, 'idle');
    gameState.player.setBounce(0.2);
    gameState.player.setCollideWorldBounds(true);
    gameState.player.setScale(2.5);
    gameState.player.body.setSize(30, 30, true);

    // this.cameras.main.setBounds(0, 0, 1536, 724);
    this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
    this.cameras.main.setFollowOffset(0, 150);
    this.physics.world.setBounds(0, 0, gameState.bg.width, 736)

    gameState.player.body.setGravityY(400);
    //this.physics.add.collider(gameState.player, gameState.ground);
    gameState.cursors = this.input.keyboard.createCursorKeys();
    gameState.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    gameState.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    gameState.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    gameState.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    gameState.keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    gameState.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    gameState.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    update(){
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
    if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
        player.setVelocityY(-430);
        player.setScale(2.5);
    }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
        player.anims.play('idle', true); // set to frame index 2 of the jump spritesheet
        player.setScale(2.5);
    }else if(cursors.left.isDown || key.keyA.isDown){
        player.setVelocityX(-280);
        player.setFlipX(true);
        player.anims.play('run', true);
        console.log(player.x)// debugger
        player.setScale(2.5);

    }else if(cursors.right.isDown || key.keyD.isDown){
        player.setVelocityX(280);
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
        player.setScale(4);
        player.setVelocityX(0);
    }
    else{
        player.setVelocityX(0);
        player.setScale(2.5);
        player.anims.play('idle', true);
    }

//     // Lune Blade Asset Load
//     // if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
//     //     player.setVelocityY(-430);
//     // }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
//     //     player.anims.play('fall', true); // set to frame index 2 of the jump spritesheet
        
//     // }else if(cursors.left.isDown || key.keyA.isDown){
//     //     player.setVelocityX(-280);
//     //     player.setFlipX(true);
//     //     player.anims.play('run', true);
//     //     console.log(player.x)// debugger

//     // }else if(cursors.right.isDown || key.keyD.isDown){
//     //     player.setVelocityX(280);
//     //     player.anims.play('run', true);
//     //     player.setFlipX(false);
//     //     console.log(player.x) /// debugger

//     // }else if(key.keyC.isDown){
//     //     console.log(player.anims.play('smash', true));
//     //     player.setVelocityX(0);
//     // }else if(key.keyX.isDown){
//     //     console.log( player.anims.play('spinAttack', true));
//     //         if(player.flipX){ // use flipX properties from player object and get boolean value
//     //             player.setVelocityX(-400);
//     //         }else{
//     //             player.setVelocityX(400);
//     //         }
//     // }else if(key.keyV.isDown){
//     //     console.log(player.anims.play('thrust', true));
//     //         if(player.flipX){ // use flipX properties from player object and get boolean value
//     //             player.setVelocityX(-300);
//     //         }else{
//     //             player.setVelocityX(300);
//     //         }
//     // }else if(key.keySpace.isDown && player.body.blocked.down){
//     //     console.log(player.anims.play('specialAttack', true));
//     //     player.setVelocityX(0);
//     // }
//     // else{
//     //     player.setVelocityX(0);
//     //     player.anims.play('idle', true);
//     // }

    }
}   