import PlayerScene from "./PlayerScene.js";
import Sprite from "../Sprite.js";
export default class Scene1 extends Phaser.Scene{
    constructor(){
        super('Scene1Scene');
    }
    preload(){
        Sprite.luneBladeLoadAsset(this);
    }
    create(){

    }
    update(){

    }
}