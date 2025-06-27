export default class Sprite{
    static luneBladeLoadAsset(loadAsset){

        loadAsset.load.spritesheet('idle', 'Resources/Assets/Sprite_Sheet_Luneblace/Idle.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('idle_break', 'Resources/Assets/Sprite_Sheet_Luneblace/Idle Break.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('run', 'Resources/Assets/Sprite_Sheet_Luneblace/Run.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('jump', 'Resources/Assets/Sprite_Sheet_Luneblace/Jump.png',{
            frameWidth  : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('fall', 'Resources/Assets/Sprite_Sheet_Luneblace/Fall.png',{
            frameWidth  : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('smash', 'Resources/Assets/Sprite_Sheet_Luneblace/Smash.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('thrust', 'Resources/Assets/Sprite_Sheet_Luneblace/Thrust.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('spinAttack', 'Resources/Assets/Sprite_Sheet_Luneblace/Spin.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('specialAttack', 'Resources/Assets/Sprite_Sheet_Luneblace/Special Skill.png',{
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('hurt', 'Resources/Assets/Sprite_Sheet_Luneblace/Hurt.png',{
            frameWidth : 144,
            frameHeight : 144
        })
    }
    static luneBladeAnimateAsset(loadAsset){
        loadAsset.anims.create({ // Run Animation sprite
            key: 'run',
            frames : loadAsset.anims.generateFrameNumbers('run',{start: 0, end: 7}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Idle animation sprite
            key: 'idle',
            frames: loadAsset.anims.generateFrameNumbers('idle',{start: 0, end: 7}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Long Idle animation sprite
            key: 'idle_break',
            frames: loadAsset.anims.generateFrameNumbers('idle_break',{start: 0, end: 26}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // jump animation sprite
            key: 'jump',
            frames: loadAsset.anims.generateFrameNumbers('jump',{start: 0, end: 5}),
            frameRate: 15,
            repeat: -1
        });
        loadAsset.anims.create({ // jump animation sprite
            key: 'fall',
            frames: loadAsset.anims.generateFrameNumbers('fall',{start: 0, end: 5}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({
            key: 'thrust',
            frames: loadAsset.anims.generateFrameNumbers('thrust',{start: 5, end:13}),
            frameRate: 20,
            repeat: -1
        })
        loadAsset.anims.create({
            key: 'smash',
            frames: loadAsset.anims.generateFrameNumbers('smash',{start: 0, end:16}),
            frameRate: 13,
            repeat: -1
        });
        loadAsset.anims.create({
            key : 'spinAttack',
            frames : loadAsset.anims.generateFrameNumbers('spinAttack',{start:5, end: 12}),
            frameRate : 10,
            repeat : -1
        })
        loadAsset.anims.create({
            key : 'specialAttack',
            frames : loadAsset.anims.generateFrameNumbers('specialAttack',{start:0, end: 17}),
            frameRate : 10,
            repeat : -1
        });
        loadAsset.anims.create({
            key: 'right',
            frames: loadAsset.anims.generateFrameNumbers('run',{ start:0, end: 7}),
            frameRate : 5,
            repeat: -1
        });
        loadAsset.anims.create({
            key: 'left',
            frames: loadAsset.anims.generateFrameNumbers('run', { start: 0, end: 7}),
            frameRate: 5,
            repeat: -1
        });
        loadAsset.anims.create({
            key: 'hurt',
            frames: loadAsset.anims.generateFrameNumbers('hurt', { start: 0, end: 2}),
            frameRate: 10,
            repeat: -1
        });
    }
    static repearLoadAsset(loadAsset){
        loadAsset.load.spritesheet('idle', 'Resources/Assets/Sprite_Sheet_Reaper/Idle.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('run', 'Resources/Assets/Sprite_Sheet_Reaper/Run.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('double_slash', 'Resources/Assets/Sprite_Sheet_Reaper/Double Slash.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('slash', 'Resources/Assets/Sprite_Sheet_Reaper/Slash.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('dash', 'Resources/Assets/Sprite_Sheet_Reaper/Dash.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('special_skill', 'Resources/Assets/Sprite_Sheet_Reaper/Special Skill.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('surprise_attack', 'Resources/Assets/Sprite_Sheet_Reaper/Surprise Attack.png', {
            frameWidth : 144,
            frameHeight : 144
        });
        loadAsset.load.spritesheet('surprise_jump', 'Resources/Assets/Sprite_Sheet_Reaper/Surprise Jump.png', {
            frameWidth : 144,
            frameHeight : 144
        });
    }
    static repearAnimateAsset(loadAsset){
        loadAsset.anims.create({ // Run Animation sprite
            key: 'idle',
            frames : loadAsset.anims.generateFrameNumbers('idle',{start: 0, end: 8}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'run',
            frames : loadAsset.anims.generateFrameNumbers('run',{start: 0, end: 7}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'dash',
            frames : loadAsset.anims.generateFrameNumbers('dash',{start: 0, end: 11}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'slash',
            frames : loadAsset.anims.generateFrameNumbers('slash',{start: 0, end: 9}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'double_slash',
            frames : loadAsset.anims.generateFrameNumbers('double_slash',{start: 0, end: 12}),
            frameRate: 15,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'special_skill',
            frames : loadAsset.anims.generateFrameNumbers('special_skill',{start: 0, end: 28}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'surprise_attack',
            frames : loadAsset.anims.generateFrameNumbers('surprise_attack',{start: 0, end: 22}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'surprise_jump',
            frames : loadAsset.anims.generateFrameNumbers('surprise_jump',{start: 0, end: 19}),
            frameRate: 10,
            repeat: -1
        });
    }
    static enemySprites(loadAsset){
        loadAsset.load.spritesheet('enemy_walk', 'Resources/Assets/Huge_mushroom/HugeMushroom_walk.png',{
            frameWidth : 72,
            frameHeight : 72
        });
        loadAsset.load.spritesheet('enemy_idle', 'Resources/Assets/Huge_mushroom/HugeMushroom_idle.png',{
            frameWidth : 72,
            frameHeight : 72
        });
    }
    static enemyMovement(loadAsset){
        loadAsset.anims.create({ // Run Animation sprite
            key: 'enemy_walk',
            frames : loadAsset.anims.generateFrameNumbers('enemy_walk',{start: 0, end: 5}),
            frameRate: 10,
            repeat: -1
        });
        loadAsset.anims.create({ // Run Animation sprite
            key: 'enemy_idle',
            frames : loadAsset.anims.generateFrameNumbers('enemy_idle',{start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        });
    }
    static backgroundSprite(loadAsset){
        loadAsset.load.image('ruins', 'Resources/Assets/Images/ruins.png');
        loadAsset.load.image('clouds', 'Resources/Assets/Images/clouds.png')
        loadAsset.load.image('mountain', 'Resources/Assets/Images/mountain.png');
        loadAsset.load.image('trees', 'Resources/Assets/Images/trees.png');
        loadAsset.load.image('ground', 'Resources/Assets/Images/ground.png');
        loadAsset.load.audio('grassy_biome', 'Resources/Assets/Music-Sounds/Grassy_Biome.mp3');
        loadAsset.load.image('upper_platform', 'Resources/Assets/Images/big_platforms.png');
        loadAsset.load.image('single_tree', 'Resources/Assets/Images/single_tree.png');
        loadAsset.load.image('single_platform', 'Resources/Assets/Images/single_platform.png');
        loadAsset.load.image('medium_platform', 'Resources/Assets/Images/medium_platform.png');
        loadAsset.load.image('portal', 'Resources/Assets/Images/portal.png');
    } 
}