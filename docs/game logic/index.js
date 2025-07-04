import CharacterSelection from './CharacterSelection.js';
import MainScene from './MainScene.js';
import BootScene from './BootScene.js';

 window.gameState = {
    height: 1524,
    width: 4708
    
 };
const config = {
    type : Phaser.AUTO,
    width : 1136,
    height : 636,
    backgroundColor: 0x87CEEB,
    scene : [BootScene, CharacterSelection, MainScene],
    physics : {
        default:'arcade',
        arcade:{
            gravity:{y:800},
            debug:false
        }
    },
}
const game = new Phaser.Game(config);
console.log(config.scene);
export default config;  