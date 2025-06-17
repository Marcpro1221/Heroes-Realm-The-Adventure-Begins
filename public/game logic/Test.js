import Sprite from './Sprite.js';
const config = {
    type : Phaser.AUTO,
    width : 1031,
    height : 1024,
    scene : {
        preload: preload,
        create: create,
        update: update
    },
    physics : {
        default:'arcade',
        arcade:{
            gravity:{y:400},
            debug: true
        }
    }
}
const game = new Phaser.Game(config);
const gameState = {};
function preload(){
    this.load.image('bg', 'Resources/Assets/Images/map.png');
    this.load.tilemapTiledJSON('map', 'Resources/Assets/Images/map.json');
    Sprite.luneBlaceLoadAsset(this);
}
function create(){
    Sprite.luneBlaceAnimateAsset(this);

    gameState.bg = this.add.image(0, 0, 'bg').setOrigin(0,0);
    this.physics.world.setBounds(0, 0, gameState.bg.width, 1036);
    gameState.player = this.physics.add.sprite(250, 150, 'idle');
    gameState.player.setCollideWorldBounds(true);
    gameState.player.setScale(2)
    gameState.player.body.setSize(30, 30, true);
    this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
    this.cameras.main.setFollowOffset(0, 150);
    gameState.cursors = this.input.keyboard.createCursorKeys();



}
function update(){
    if(gameState.cursors.right.isDown){
        gameState.player.setVelocityX(160);
        gameState.player.anims.play('run', true)
        gameState.player.setFlipX(false);
        console.log(gameState.player.x)
    }else if(gameState.cursors.left.isDown){
        gameState.player.setVelocityX(-160);
        gameState.player.anims.play('run', true);
        gameState.player.setFlipX(true);
        console.log(gameState.player.x)
    }else{
        gameState.player.setVelocityX(0);
        gameState.player.anims.play('idle', true);
    }
}