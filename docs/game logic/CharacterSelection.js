import Sprite from "./Sprite.js";
import Player from './CharacterScene/Player.js';
export default class CharacterSelection extends Phaser.Scene{
    constructor(){
        super('CharacterSelectionScene');

    }
    preload(){
        this.load.image('menu', './Resources/Assets/Images/GameMenu2.png');
        this.load.audio('journey', 'Resources/Assets/Music-Sounds/The_Journey.mp3');
        this.load.spritesheet('idle_blade', 'Resources/Assets/Sprite_Sheet_Luneblace/Idle Break.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        this.load.spritesheet('idle_reaper', 'Resources/Assets/Sprite_Sheet_Reaper/Idle.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        this.load.spritesheet('idle_bladed_staff', 'Resources/Assets/Sprite_Sheet_Bladed_Staff/Idle.png', {
            frameWidth : 144,
            frameHeight : 144
        })

    }
    create(){
        this.anims.create({ // Idle animation sprite
            key: 'idle_blade',
            frames: this.anims.generateFrameNumbers('idle_blade',{start: 0, end: 26}),
            frameRate: 15,
            repeat: -1
        });
        this.anims.create({ // Run Animation sprite
            key: 'idle_reaper',
            frames : this.anims.generateFrameNumbers('idle_reaper',{start: 0, end: 8}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({ // Run Animation sprite
            key: 'idle_bladed_staff',
            frames : this.anims.generateFrameNumbers('idle_bladed_staff',{start: 0, end: 6}),
            frameRate: 10,
            repeat: -1
        });


        this.player_reaper = this.add.sprite(640, 560, 'idle_reaper').setDepth(10);
        this.player_reaper.setScale(1.8);
        this.player_reaper.play('idle_reaper');
        this.player_blade = this.add.sprite(485, 575, 'idle_blade').setDepth(10);
        this.player_blade.setScale(1.8);
        this.player_blade.play('idle_blade');
        this.player_bladed_staff = this.add.sprite(750, 545, 'idle_bladed_staff').setDepth(10);
        this.player_bladed_staff.setScale(1.8);
        this.player_bladed_staff.play('idle_bladed_staff');
        gameState.bgMusic = this.sound.add('journey', { loop: true, volume: 0.7});
        gameState.bgMusic.play();
        this.add.text(430,380, 'Press Space to Start.....').setDepth(5);
        this.add.image(0, 0, 'menu').setOrigin(0).setDepth(0);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    update(){
        if(this.spaceKey.isDown){
            this.scene.stop('CharacterSelectionScene');
            this.scene.launch('PlayerScene');
            this.scene.start('MainGameScene');
            console.log(gameState.bgMusic.stop());
        }
    }
}


// Character Scene