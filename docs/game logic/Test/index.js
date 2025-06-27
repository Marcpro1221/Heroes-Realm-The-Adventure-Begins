 import BootScene from './BootScene.js';
 import PlayerScene from './PlayerScene.js';
 import MainMenu from './MainMenu.js';
 import Scene1 from './Scene1.js'
 import Scene2 from './Scene2.js';
window.gameState = {
    height: 524,
    width: 1708
    
};

const config = {
    type : Phaser.AUTO,
    width : 1136,
    height : 636,
    backgroundColor: 0x87CEEB,
    scene : [BootScene, PlayerScene, MainMenu, Scene1, Scene2],
    physics : {
        default:'arcade',
        arcade:{
            gravity:{y:800},
            debug:true
        }
    }
}
const game = new Phaser.Game(config);
console.log(config.scene);
