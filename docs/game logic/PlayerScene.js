import Sprite from './Sprite.js';
export default class PlayerScene extends Phaser.Scene{
    constructor(){
        super({key: 'PlayerScene', active: true});

    }
    // preload(){
    //     Sprite.luneBladeLoadAsset(this);
    // }
    // create(){

    // }
    // update(){
    //     this.createMovement();
    // }
    // createMovement(){
    //     const cursors = gameState.cursors;
    //     const player = gameState.player;
    //     const key = {
    //         keyC : gameState.keyC,
    //         keyA : gameState.keyA,
    //         keyD : gameState.keyD,
    //         keyW : gameState.keyW,
    //         keyV : gameState.keyV,
    //         keyX : gameState.keyX,
    //         keySpace : gameState.keySpace
    //     };
    
    //     // LuneReaper Asset Load
    //     function luneReaperMovement(){
    //         if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
    //             player.setVelocityY(-430);
    //             player.setScale(2.5);
    //         }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
    //             player.anims.play('idle', true); // set to frame index 2 of the jump spritesheet
    //             player.setScale(2.5);
    //         }else if(cursors.left.isDown || key.keyA.isDown){
    //             player.setVelocityX(-250);
    //             player.setFlipX(true);
    //             player.anims.play('run', true);
    //             console.log(player.x)// debugger
    //             player.setScale(2.5);
        
    //         }else if(cursors.right.isDown || key.keyD.isDown){
    //             player.setVelocityX(250);
    //             player.anims.play('run', true);
    //             player.setFlipX(false);
    //             console.log(player.x) /// debugger
    //             player.setScale(2.5);
        
    //         }else if(key.keyC.isDown){
    //             console.log(player.anims.play('slash', true));
    //             player.setVelocityX(0);
    //             player.setScale(2.5);
    //         }else if(key.keyX.isDown){
    //             console.log( player.anims.play('double_slash', true));
    //                 if(player.flipX){ // use flipX properties from player object and get boolean value
    //                     player.setVelocityX(-50);
    //                 }else{
    //                     player.setVelocityX(50);
    //                 }
    //                 player.setScale(2.5);
    //         }else if(key.keyV.isDown){
    //             console.log(player.anims.play('dash', true));
    //                 if(player.flipX){ // use flipX properties from player object and get boolean value
    //                     player.x -= 10;
    //                 }else{
    //                     player.x += 10;
    //                 }
    //                 player.setScale(2.5);
    //         }else if(key.keySpace.isDown && player.body.blocked.down){
    //             console.log(player.anims.play('special_skill', true));
    //            player.setScale(3);
    //             player.setVelocityX(0);
    //         }
    //         else{
    //             player.setVelocityX(0);
    //             player.setScale(2.5);
    //             player.anims.play('idle', true);
    //         }
    //     }
        
    //     function luneBladeMovement(){
    //     // Lune Blade Asset Load
    //         if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
    //             player.setVelocityY(-550);
    //             player.setScale(2.5);
    //         }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
    //             player.anims.play('fall', true); // set to frame index 2 of the jump spritesheet
    //             player.setScale(2.5);
    //         }else if(cursors.left.isDown || key.keyA.isDown){
    //             player.setVelocityX(-280);
    //             player.setFlipX(true);
    //             player.anims.play('run', true);
    //             console.log(player.x)// debugger
    //             player.setScale(2.5);
    //         }else if(cursors.right.isDown || key.keyD.isDown){
    //             player.setVelocityX(280);
    //             player.anims.play('run', true);
    //             player.setFlipX(false);
    //             console.log(player.x) /// debugger
    //             player.setScale(2.5);
    //         }else if(key.keyC.isDown){
    //             console.log(player.anims.play('smash', true));
    //             player.setVelocityX(0);
    //             player.setScale(2.5);
    //         }else if(key.keyX.isDown){
    //             console.log( player.anims.play('spinAttack', true));
    //                 if(player.flipX){ // use flipX properties from player object and get boolean value
    //                     player.setVelocityX(-400);
    //                 }else{
    //                     player.setVelocityX(400);
    //                 }
    //                 player.setScale(2.5);
    //         }else if(key.keyV.isDown){
    //             console.log(player.anims.play('thrust', true));
    //                 if(player.flipX){ // use flipX properties from player object and get boolean value
    //                     player.setVelocityX(-100);
    //                 }else{
    //                     player.setVelocityX(100);
    //                 }
    //                 player.setScale(2.5);
    //         }else if(key.keySpace.isDown && player.body.blocked.down){
    //             console.log(player.anims.play('specialAttack', true));
    //             player.setVelocityX(0);
    //             player.setScale(2.5);            
    //         }
    //         else{
    //             player.setVelocityX(0);
    //             player.anims.play('idle', true);
    //             player.setScale(2.5);
    //         }

    //     }

    //     //luneReaperMovement(); // calling function for character movement
    //     luneBladeMovement(); // calling function for character movement
    // }
    // createKeys(){ 
    //     gameState.cursors = this.input.keyboard.createCursorKeys();
    //     gameState.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    //     gameState.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    //     gameState.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    //     gameState.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    //     gameState.keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    //     gameState.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    //     gameState.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // }
}