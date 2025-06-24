export default class CharacterSelection extends Phaser.Scene{
    constructor(){
        super('CharacterSelectionScene');

    }
    preload(){
        this.load.image('menu', 'Resources/Assets/Images/GameMenu2.png');
        this.load.audio('journey', 'Resources/Assets/Music-Sounds/The_Journey.mp3');
    }
    create(){
        gameState.bgMusic = this.sound.add('journey', { loop: true, volume: 2});
        gameState.bgMusic.play();
        this.add.text(430,380, 'Press Space to Start.....').setDepth(5);
        this.add.image(0, 0, 'menu').setOrigin(0).setDepth(0);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    update(){
        if(this.spaceKey.isDown){
            this.scene.start('MainGameScene');
            console.log(gameState.bgMusic.stop())
        }
    }
}


// Character Scene