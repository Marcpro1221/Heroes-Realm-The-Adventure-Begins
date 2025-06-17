import CharacterSelection from './CharacterSelection.js';
import MainScene from './MainScene.js';

const config = {
    type : Phaser.AUTO,
    width : 1136,
    height : 636,
    scene : [CharacterSelection, MainScene],
    physics : {
        default:'arcade',
        arcade:{
            gravity:{y:200},
            debug:true
        }
    }
}
const game = new Phaser.Game(config);
console.log(config.scene);