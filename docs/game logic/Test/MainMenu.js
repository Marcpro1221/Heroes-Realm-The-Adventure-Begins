
export default class MainMenu extends Phaser.Scene{
    constructor(){
        super('MainMenuScene');
    }
    preload(){
        this.load.image('menu', '/Resources/Assets/Images/GameMenu2.png');
    }
    create(){
        this.add.text(430,380, 'Game Loaded.....').setDepth(5);
        this.add.image(0, 0, 'menu').setOrigin(0).setDepth(0);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    update(){
        if(this.spaceKey.isDown){
            this.scene.stop('MainMenuScene');
            this.scene.launch('PlayerScene');
            this.scene.start('Scene1Scene');
        }
    }
}