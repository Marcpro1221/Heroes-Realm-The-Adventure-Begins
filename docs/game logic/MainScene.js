import Sprite from './Sprite.js';
import config from './index.js';
import Player from './CharacterScene/Player.js';
import Enemy from './CharacterScene/Enemy.js';
export default class MainScene extends Phaser.Scene{
    constructor(){
        super('MainGameScene');
        this.maxEnemySpawns = 7;
        this.enemySpawnDelay = 25000;
        this.enemyRespawnBaseDelay = 4000;
        this.enemyRespawnDelayStep = 1500;
        this.enemyRespawnDelayIncreaseEveryDeaths = 2;
        this.enemyRespawnMaxDelay = 10000;
        this.enemyMaxHp = 100;
        this.enemyContactDamageMinPercent = 0.03;
        this.enemyContactDamageMaxPercent = 0.05;
        this.enemyExpMinPercent = 0.03;
        this.enemyExpMaxPercent = 0.04;
        this.levelUpDamageBonus = 3;
        this.levelUpDefenseBonusPercent = 0.01;
        this.enemyKnockbackDistance = 35;
        this.enemyKnockbackMinPercent = 0.02;
        this.enemyKnockbackJumpVelocity = -180;
        // Attack balance settings: adjust percent and hit interval here for each player attack key.
        this.playerAttackConfig = {
            smash: { keyLabel: 'C', label: 'Smash', damagePercent: 0.35, hitCooldownMs: 450, tintDurationMs: 180 },
            spinAttack: { keyLabel: 'X', label: 'Spin Attack', damagePercent: 0.08, hitCooldownMs: 90, tintDurationMs: 70 },
            thrust: { keyLabel: 'V', label: 'Thrust', damagePercent: 0.18, hitCooldownMs: 180, tintDurationMs: 100 }
        };
    }
    preload(){
        Sprite.backgroundSprite(this);
        //Sprite.repearLoadAsset(this);
        Sprite.luneBladeLoadAsset(this);
        Sprite.enemySprites(this);
        this.load.audio('thrustAttack', 'Resources/Assets/Music-Sounds/ThrustAttack.mp3');
        this.load.audio('smashAttack', 'Resources/Assets/Music-Sounds/smashAttack3.mp3');
        this.load.audio('spinAttack', 'Resources/Assets/Music-Sounds/spinAttack.mp3');
        this.load.audio('hitAttack', 'Resources/Assets/Music-Sounds/hitAttack.mp3');

    }
    create(){
        Sprite.enemyMovement(this);
        Sprite.luneBladeAnimateAsset(this);
        //Sprite.repearAnimateAsset(this);
        
        gameState.platforms = this.physics.add.staticGroup();
        gameState.enemy = this.physics.add.group();
        this.activeEnemyCount = 0;
        this.enemyRespawnCounts = {};
        this.isRestarting = false;
        this.cleanupComplete = false;
        this.events.once('shutdown', this.cleanupSceneState, this);
        this.events.once('destroy', this.cleanupSceneState, this);

        gameState.portal = this.add.image((gameState.width / 2) - 950, gameState.height - 1100, 'portal').setDepth(11);
        this.add.text((gameState.width / 2) - 850, gameState.height - 1100, 'COMING SOON....');

        const single_platform_position = [ // NEED TO UPDATE TO MAKE platform organize
            {x: (gameState.width / 2) - 950, y: gameState.height - 950}, // platform position x & y
            {x: gameState.width - 550, y: gameState.height - 250}, 
            {x: gameState.width - 550, y: gameState.height - 930},
            {x: gameState.width - 230, y: gameState.height - 330}
        ];

         this.enemyPosition = [ // NEED TO UPDATE TO MAKE SPAWNING 
                               {x: 2200, y: 1250}, // enemy position x & y
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                               {x: 2200, y: 1250},
                                {x: 2200, y: 1250},
                            ];
                                     
        gameState.player = new Player(this, 250, 1250, 'idle');
        gameState.player.enableProfileInteraction();
        gameState.player.input.cursor = 'pointer';
        gameState.player.on('pointerdown', () => {
            this.togglePlayerProfile();
        });
        this.createPlayerHud();

         //for all platform type
        gameState.platforms.create(0, gameState.height - 100, 'ground').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1); //224 is the ground height
        gameState.platforms.create((gameState.width / 2) - 600, 700, 'upper_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1);
        gameState.platforms.create((gameState.width) - 1250, gameState.height - 1080, 'medium_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1);

        single_platform_position.forEach(platform => gameState.platforms.create(platform.x, platform.y, 'single_platform').setOrigin(0, 0).refreshBody().setDepth(10).setScrollFactor(1));

        // Enemy spawn scheduler: only create up to the configured max count.
        this.scheduleEnemySpawns();
        
        // moving the 6th platform
        this.characterTweensY(gameState.platforms.getChildren()[6], gameState.height - 850, 3000, false, -1, true, gameState.platforms.getChildren()[6].body);
       
        // function of different features
        this.createParallaxBackground();
        this.createSoundEffects(); // background music and sound effect

        //Cameras
        this.cameras.main.setBounds(0, 0, gameState.width, gameState.height);
        this.cameras.main.startFollow(gameState.player, true, 0.8, 0.8);
        this.cameras.main.setFollowOffset(100, 0.5);
        this.cameras.main.setDeadzone(250, 250);
        this.physics.world.setBounds(0, 0, gameState.width, gameState.height);
        this.physics.add.collider(gameState.player, gameState.platforms);
    }

    update(){  
        gameState.enemy.getChildren().forEach(enemy => {
            if (!enemy.active) {
                return;
            }
            enemy.updateMovement();
            enemy.anims.play('enemy_walk', true);
            enemy.detectionZoneArea(); // enemy detection zone
            enemy.updateOnPlayerDetection(gameState.player); // update enemy detection zone on player
            this.updateEnemyHpBar(enemy);
        });

        this.fpsText.setText(`FPS: ${Math.floor(this.game.loop.actualFps)}`); // display FPS
        this.updatePlayerHud();
        gameState.player.update(); // update player movement
        gameState.player.hitboxOne();
        gameState.player.hitboxTwo();
        gameState.player.hitboxThree();
    }
    // Enemy spawn setup: queue enemies with a hard cap of 7 active spawns.
    scheduleEnemySpawns(){
        this.enemyPosition.slice(0, this.maxEnemySpawns).forEach((enemyPos, index) => {
            this.time.delayedCall(index * this.enemySpawnDelay, () => {
                this.trySpawnEnemy(enemyPos);
            });
        });
    }

    // Enemy spawn guard: only spawn when the current alive count is below the cap.
    trySpawnEnemy(enemyPos){
        if (this.activeEnemyCount >= this.maxEnemySpawns) {
            return false;
        }

        this.spawnEnemy(enemyPos);
        return true;
    }

    // Enemy creation: instantiate enemy, initialize state, and connect combat.
    spawnEnemy(enemyPos){
        const enemy = new Enemy(this, enemyPos.x, enemyPos.y, 'enemy_walk');
        enemy.body.setSize(40, 65, true);
        enemy.setScale(1.5).refreshBody();
        enemy.update();
        enemy.spawnPoint = { ...enemyPos };
        enemy.spawnPointKey = this.getEnemySpawnPointKey(enemyPos);
        gameState.enemy.add(enemy);
        this.activeEnemyCount += 1;

        this.initializeEnemyState(enemy);
        this.physics.add.collider(enemy, gameState.platforms);
        this.setupEnemyCombat(enemy);
    }

    // Enemy state: assign health values and create the HP bar visuals.
    initializeEnemyState(enemy){
        enemy.maxHp = this.enemyMaxHp;
        enemy.currentHp = this.enemyMaxHp;
        enemy.isHurting = false;
        enemy.isDead = false;
        enemy.lastDamageByAttack = {};
        enemy.lastTintAt = 0;
        enemy.hpBarWidth = 60;
        enemy.hpBarHeight = 8;
        enemy.hpBarOffsetY = 18;
        enemy.hpBar = this.add.graphics().setDepth(20);
        this.updateEnemyHpBar(enemy);
    }

    // Enemy combat hooks: player body damage and weapon overlap damage.
    setupEnemyCombat(enemy){
        this.physics.add.overlap(gameState.player, enemy, this.handlePlayerEnemyOverlap, null, this);
        this.physics.add.overlap(enemy, gameState.player.swordHitBox, () => this.damageEnemy(enemy, 'smash'), null, this);
        this.physics.add.overlap(enemy, gameState.player.spinHitBox, () => this.damageEnemy(enemy, 'spinAttack'), null, this);
        this.physics.add.overlap(enemy, gameState.player.thrustAttackHitBox, () => this.damageEnemy(enemy, 'thrust'), null, this);
    }

    // Player contact damage: apply touch damage when the enemy body overlaps the player.
    handlePlayerEnemyOverlap(player, enemy){
        if (!enemy.active || enemy.isDead || player.isHurting || player.isDead || this.isRestarting) {
            return;
        }

        const damagePercent = Phaser.Math.FloatBetween(this.enemyContactDamageMinPercent, this.enemyContactDamageMaxPercent);
        const enemyDamage = Math.max(1, Math.round(player.maxHp * damagePercent));
        const defenseValue = this.getPlayerDefenseValue(player);
        const damage = Math.max(0, enemyDamage - defenseValue);
        player.isHurting = true;
        player.currentHp = Math.max(0, player.currentHp - damage);
        player.showDamagePopup(player.x, player.y, damage);
        this.updatePlayerHud();

        if (player.currentHp <= 0) {
            this.handlePlayerDeath(player);
            return;
        }

        this.time.delayedCall(500, () => {
            player.isHurting = false;
        });
    }

    // Weapon damage: apply percentage-based damage from player attack hitboxes.
    damageEnemy(enemy, attackType){
        if (!enemy.active || enemy.isDead) {
            return;
        }

        const attackConfig = this.playerAttackConfig[attackType];
        if (!attackConfig) {
            return;
        }

        const currentTime = this.time.now;
        const lastHitTime = enemy.lastDamageByAttack[attackType] ?? -Infinity;
        if ((currentTime - lastHitTime) < attackConfig.hitCooldownMs) {
            return;
        }

        const damage = this.getPlayerAttackDamage(attackType, enemy.maxHp);
        enemy.lastDamageByAttack[attackType] = currentTime;
        enemy.lastTintAt = currentTime;
        enemy.isHurting = true;
        enemy.currentHp = Math.max(0, enemy.currentHp - damage);
        this.applyEnemyKnockback(enemy, gameState.player);
        enemy.setTint(0xff0000);
        enemy.showDamagePopup(enemy.x + 40, enemy.y + 40, damage);
        this.updateEnemyHpBar(enemy);
        this.sound.play('hitAttack', { loop: false, volume: 0.7 });

        if (enemy.currentHp <= 0) {
            this.destroyEnemy(enemy);
            return;
        }

        this.time.delayedCall(attackConfig.tintDurationMs, () => {
            if (!enemy.active) {
                return;
            }

            if ((this.time.now - enemy.lastTintAt) < attackConfig.tintDurationMs) {
                return;
            }

            enemy.clearTint();
            enemy.isHurting = false;
        });
    }

    applyEnemyKnockback(enemy, player){
        if (!enemy.body || !player) {
            return;
        }

        let knockbackDirection = player.flipX ? 1 : -1;

        if (player.body && enemy.body && player.body.center.x !== enemy.body.center.x) {
            knockbackDirection = player.body.center.x < enemy.body.center.x ? 1 : -1;
        }

        const playerReferenceX = player.body ? player.body.center.x : player.x;
        const distanceFromPlayer = Math.abs(enemy.x - playerReferenceX);
        const knockbackDistance = Math.max(this.enemyKnockbackDistance, distanceFromPlayer * this.enemyKnockbackMinPercent);
        const knockbackVelocityX = knockbackDistance * knockbackDirection * 5;

        enemy.applyKnockback(knockbackVelocityX, this.enemyKnockbackJumpVelocity);
    }

    // Enemy HP bar drawing: redraw the bar so it follows the enemy every frame.
    updateEnemyHpBar(enemy){
        if (!enemy.hpBar || !enemy.active) {
            return;
        }

        const bodyCenterX = enemy.body.x + (enemy.body.width / 2);
        const barX = bodyCenterX - (enemy.hpBarWidth / 2);
        const barY = enemy.body.y - enemy.hpBarOffsetY;
        const healthRatio = Phaser.Math.Clamp(enemy.currentHp / enemy.maxHp, 0, 1);

        enemy.hpBar.clear();
        enemy.hpBar.fillStyle(0x000000, 0.8);
        enemy.hpBar.fillRect(barX, barY, enemy.hpBarWidth, enemy.hpBarHeight);
        enemy.hpBar.fillStyle(0xff3b30, 1);
        enemy.hpBar.fillRect(barX + 1, barY + 1, (enemy.hpBarWidth - 2) * healthRatio, enemy.hpBarHeight - 2);
    }

    // Enemy cleanup: remove physics helpers and HP UI when the enemy dies.
    destroyEnemy(enemy){
        enemy.isDead = true;
        enemy.clearTint();
        this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);
        const respawnPoint = enemy.spawnPoint ? { ...enemy.spawnPoint } : null;

        if (enemy.hpBar) {
            enemy.hpBar.destroy();
            enemy.hpBar = null;
        }

        if (enemy.detectionZone) {
            enemy.detectionZone.destroy();
        }

        if (enemy.enemyHitBox) {
            enemy.enemyHitBox.destroy();
        }

        enemy.destroy();

        this.grantEnemyExp(gameState.player);

        if (respawnPoint) {
            const respawnDelay = this.getEnemyRespawnDelay(respawnPoint);
            this.time.delayedCall(respawnDelay, () => {
                this.trySpawnEnemy(respawnPoint);
            });
        }
    }

    getEnemySpawnPointKey(enemyPos){
        return `${enemyPos.x}:${enemyPos.y}`;
    }

    getEnemyRespawnDelay(enemyPos){
        const spawnPointKey = this.getEnemySpawnPointKey(enemyPos);
        const destroyedCount = (this.enemyRespawnCounts[spawnPointKey] ?? 0) + 1;
        this.enemyRespawnCounts[spawnPointKey] = destroyedCount;

        const extraDelaySteps = Math.floor(destroyedCount / this.enemyRespawnDelayIncreaseEveryDeaths);
        const respawnDelay = this.enemyRespawnBaseDelay + (extraDelaySteps * this.enemyRespawnDelayStep);

        return Math.min(respawnDelay, this.enemyRespawnMaxDelay);
    }

    createPlayerHud(){
        const hudX = 24;
        const hudY = 18;
        const barWidth = 150;
        const barHeight = 14;
        const labelStyle = {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#d7e3ea'
        };

        this.playerHud = {
            x: hudX,
            y: hudY,
            barWidth,
            barHeight,
            displayedHpRatio: 1,
            displayedExpRatio: 0,
            displayedManaRatio: 1,
            panel: this.add.rectangle(hudX, hudY, 238, 132, 0x0f1720, 0.92).setOrigin(0, 0),
            headerButton: this.add.rectangle(hudX, hudY, 238, 32, 0x15202b, 0.8).setOrigin(0, 0),
            nameText: this.add.text(hudX + 16, hudY + 10, '', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'bold'
            }),
            profileHintText: this.add.text(hudX + 160, hudY + 11, 'Click for profile', {
                fontFamily: 'Arial',
                fontSize: '11px',
                color: '#9fb3c8'
            }).setOrigin(1, 0),
            levelBadge: this.add.rectangle(hudX + 206, hudY + 16, 24, 24, 0x1d4ed8, 1).setOrigin(0.5),
            levelText: this.add.text(hudX + 206, hudY + 9, '', {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0),
            hpLabel: this.add.text(hudX + 16, hudY + 42, 'HP', labelStyle),
            expLabel: this.add.text(hudX + 16, hudY + 70, 'EXP', labelStyle),
            manaLabel: this.add.text(hudX + 16, hudY + 98, 'Mana', labelStyle),
            hpBarBg: this.add.rectangle(hudX + 72, hudY + 50, barWidth, barHeight, 0x1f2933).setOrigin(0, 0.5),
            hpBarFill: this.add.rectangle(hudX + 72, hudY + 50, barWidth, barHeight, 0x22c55e).setOrigin(0, 0.5),
            hpBarGlow: this.add.rectangle(hudX + 72, hudY + 50, barWidth, 4, 0x86efac, 0.35).setOrigin(0, 0.5),
            hpValueText: this.add.text(hudX + 72 + barWidth - 8, hudY + 39, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }).setOrigin(1, 0),
            expBarBg: this.add.rectangle(hudX + 72, hudY + 78, barWidth, barHeight, 0x1f2933).setOrigin(0, 0.5),
            expBarFill: this.add.rectangle(hudX + 72, hudY + 78, 0, barHeight, 0xf59e0b).setOrigin(0, 0.5),
            expBarGlow: this.add.rectangle(hudX + 72, hudY + 78, 0, 4, 0xfcd34d, 0.35).setOrigin(0, 0.5),
            expValueText: this.add.text(hudX + 72 + barWidth - 8, hudY + 67, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }).setOrigin(1, 0),
            manaBarBg: this.add.rectangle(hudX + 72, hudY + 106, barWidth, barHeight, 0x1f2933).setOrigin(0, 0.5),
            manaBarFill: this.add.rectangle(hudX + 72, hudY + 106, barWidth, barHeight, 0x3b82f6).setOrigin(0, 0.5),
            manaBarGlow: this.add.rectangle(hudX + 72, hudY + 106, barWidth, 4, 0x93c5fd, 0.35).setOrigin(0, 0.5),
            manaValueText: this.add.text(hudX + 72 + barWidth - 8, hudY + 95, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }).setOrigin(1, 0)
        };

        Object.values(this.playerHud).forEach(element => {
            if (element && element.setScrollFactor) {
                element.setScrollFactor(0);
            }
            if (element && element.setDepth) {
                element.setDepth(200);
            }
        });

        this.fpsText = this.add.text(config.width - 16, 14, '', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#0f1720',
            padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setDepth(210).setScrollFactor(0);

        this.playerHud.headerButton.setInteractive({ useHandCursor: true });
        this.playerHud.headerButton.on('pointerdown', () => {
            this.togglePlayerProfile();
        });
        this.createPlayerProfilePanel();

        this.updatePlayerHud();
    }

    updatePlayerHud(){
        if (!this.playerHud || !gameState.player) {
            return;
        }

        const hpRatio = Phaser.Math.Clamp(gameState.player.currentHp / gameState.player.maxHp, 0, 1);
        const expRatio = Phaser.Math.Clamp(gameState.player.currentExp / gameState.player.expToNextLevel, 0, 1);
        const manaRatio = Phaser.Math.Clamp(gameState.player.currentMana / gameState.player.maxMana, 0, 1);
        this.playerHud.displayedHpRatio = Phaser.Math.Linear(this.playerHud.displayedHpRatio, hpRatio, 0.18);
        this.playerHud.displayedExpRatio = Phaser.Math.Linear(this.playerHud.displayedExpRatio, expRatio, 0.18);
        this.playerHud.displayedManaRatio = Phaser.Math.Linear(this.playerHud.displayedManaRatio, manaRatio, 0.18);
        const hpDisplayWidth = this.playerHud.barWidth * this.playerHud.displayedHpRatio;
        const expDisplayWidth = this.playerHud.barWidth * this.playerHud.displayedExpRatio;
        const manaDisplayWidth = this.playerHud.barWidth * this.playerHud.displayedManaRatio;
        const hpColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(0xef4444),
            Phaser.Display.Color.ValueToColor(0x22c55e),
            100,
            Math.round(hpRatio * 100)
        );
        const manaColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(0x1d4ed8),
            Phaser.Display.Color.ValueToColor(0x60a5fa),
            100,
            Math.round(manaRatio * 100)
        );

        this.playerHud.nameText.setText(gameState.player.playerName);
        this.playerHud.levelText.setText(`Lv ${gameState.player.level}`);
        this.playerHud.hpBarFill.width = hpDisplayWidth;
        this.playerHud.hpBarFill.fillColor = Phaser.Display.Color.GetColor(hpColor.r, hpColor.g, hpColor.b);
        this.playerHud.hpBarGlow.width = hpDisplayWidth;
        this.playerHud.hpValueText.setText(`${Math.round(gameState.player.currentHp)}/${gameState.player.maxHp}`);
        this.playerHud.expBarFill.width = expDisplayWidth;
        this.playerHud.expBarGlow.width = expDisplayWidth;
        this.playerHud.expValueText.setText(`${Math.round(gameState.player.currentExp)}/${gameState.player.expToNextLevel}`);
        this.playerHud.manaBarFill.width = manaDisplayWidth;
        this.playerHud.manaBarFill.fillColor = Phaser.Display.Color.GetColor(manaColor.r, manaColor.g, manaColor.b);
        this.playerHud.manaBarGlow.width = manaDisplayWidth;
        this.playerHud.manaValueText.setText(`${Math.round(gameState.player.currentMana)}/${gameState.player.maxMana}`);

        if (this.playerProfile) {
            this.updatePlayerProfilePanel();
        }
    }

    createPlayerProfilePanel(){
        const panelWidth = 340;
        const panelHeight = 308;
        const panelX = (config.width / 2) - (panelWidth / 2);
        const panelY = (config.height / 2) - (panelHeight / 2);
        const profileElements = {
            background: this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0b1220, 0.95).setOrigin(0, 0),
            title: this.add.text(panelX + 16, panelY + 14, 'Player Profile', {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }),
            subtitle: this.add.text(panelX + 16, panelY + 40, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#9fb3c8'
            }),
            hpStat: this.add.text(panelX + 16, panelY + 72, '', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#bbf7d0'
            }),
            manaStat: this.add.text(panelX + 16, panelY + 96, '', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#bfdbfe'
            }),
            expStat: this.add.text(panelX + 16, panelY + 120, '', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#fde68a'
            }),
            pointsStat: this.add.text(panelX + 16, panelY + 146, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#93c5fd'
            }),
            defenseStat: this.add.text(panelX + 16, panelY + 172, '', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#fca5a5'
            }),
            defenseUpgradeButton: this.add.text(panelX + 296, panelY + 168, '+', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#22c55e',
                fontStyle: 'bold',
                backgroundColor: '#16351f',
                padding: { x: 7, y: 0 }
            }),
            attackTitle: this.add.text(panelX + 16, panelY + 202, 'Attack Damage', {
                fontFamily: 'Arial',
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold'
            }),
            smashDamage: this.add.text(panelX + 16, panelY + 228, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }),
            spinDamage: this.add.text(panelX + 16, panelY + 250, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }),
            thrustDamage: this.add.text(panelX + 16, panelY + 272, '', {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#f8fafc'
            }),
            smashUpgradeButton: this.add.text(panelX + 296, panelY + 224, '+', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#22c55e',
                fontStyle: 'bold',
                backgroundColor: '#16351f',
                padding: { x: 7, y: 0 }
            }),
            spinUpgradeButton: this.add.text(panelX + 296, panelY + 246, '+', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#22c55e',
                fontStyle: 'bold',
                backgroundColor: '#16351f',
                padding: { x: 7, y: 0 }
            }),
            thrustUpgradeButton: this.add.text(panelX + 296, panelY + 268, '+', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#22c55e',
                fontStyle: 'bold',
                backgroundColor: '#16351f',
                padding: { x: 7, y: 0 }
            })
        };

        Object.values(profileElements).forEach(element => {
            if (element.setScrollFactor) {
                element.setScrollFactor(0);
            }
            if (element.setDepth) {
                element.setDepth(205);
            }
            if (element.setVisible) {
                element.setVisible(false);
            }
        });

        this.playerProfile = {
            visible: false,
            ...profileElements
        };

        this.playerProfile.defenseUpgradeButton.setInteractive({ useHandCursor: true });
        this.playerProfile.smashUpgradeButton.setInteractive({ useHandCursor: true });
        this.playerProfile.spinUpgradeButton.setInteractive({ useHandCursor: true });
        this.playerProfile.thrustUpgradeButton.setInteractive({ useHandCursor: true });
        this.playerProfile.defenseUpgradeButton.on('pointerdown', () => this.upgradePlayerDefense());
        this.playerProfile.smashUpgradeButton.on('pointerdown', () => this.upgradePlayerAttack('smash'));
        this.playerProfile.spinUpgradeButton.on('pointerdown', () => this.upgradePlayerAttack('spinAttack'));
        this.playerProfile.thrustUpgradeButton.on('pointerdown', () => this.upgradePlayerAttack('thrust'));
    }

    togglePlayerProfile(){
        if (!this.playerProfile) {
            return;
        }

        this.playerProfile.visible = !this.playerProfile.visible;
        Object.entries(this.playerProfile).forEach(([key, element]) => {
            if (key !== 'visible' && element.setVisible) {
                element.setVisible(this.playerProfile.visible);
            }
        });

        if (this.playerProfile.visible) {
            this.updatePlayerProfilePanel();
        }
    }

    updatePlayerProfilePanel(){
        if (!this.playerProfile || !this.playerProfile.visible) {
            return;
        }

        this.playerProfile.subtitle.setText(`${gameState.player.playerName}  |  Level ${gameState.player.level}`);
        this.playerProfile.hpStat.setText(`HP: ${Math.round(gameState.player.currentHp)} / ${gameState.player.maxHp}`);
        this.playerProfile.manaStat.setText(`Mana: ${Math.round(gameState.player.currentMana)} / ${gameState.player.maxMana}`);
        this.playerProfile.expStat.setText(`EXP: ${Math.round(gameState.player.currentExp)} / ${gameState.player.expToNextLevel}`);
        this.playerProfile.pointsStat.setText(`Attribute Points: ${gameState.player.availableAttackUpgradePoints}`);
        this.playerProfile.defenseStat.setText(`Defense: ${Math.round(this.getPlayerDefensePercent(gameState.player) * 100)}%  |  Block ${this.getPlayerDefenseValue(gameState.player)} dmg  |  +${gameState.player.defenseUpgradeLevel}`);
        this.playerProfile.smashDamage.setText(`${this.playerAttackConfig.smash.label}: ${this.getPlayerAttackDamage('smash', this.enemyMaxHp)} dmg  |  +${gameState.player.attackUpgradeLevels.smash}`);
        this.playerProfile.spinDamage.setText(`${this.playerAttackConfig.spinAttack.label}: ${this.getPlayerAttackDamage('spinAttack', this.enemyMaxHp)} dmg  |  +${gameState.player.attackUpgradeLevels.spinAttack}`);
        this.playerProfile.thrustDamage.setText(`${this.playerAttackConfig.thrust.label}: ${this.getPlayerAttackDamage('thrust', this.enemyMaxHp)} dmg  |  +${gameState.player.attackUpgradeLevels.thrust}`);

        const upgradeButtons = [
            this.playerProfile.defenseUpgradeButton,
            this.playerProfile.smashUpgradeButton,
            this.playerProfile.spinUpgradeButton,
            this.playerProfile.thrustUpgradeButton
        ];
        upgradeButtons.forEach(button => {
            button.setVisible(gameState.player.availableAttackUpgradePoints > 0);
        });
    }

    getPlayerAttackDamage(attackType, enemyMaxHp = this.enemyMaxHp){
        const attackConfig = this.playerAttackConfig[attackType];
        if (!attackConfig) {
            return 0;
        }

        const baseDamage = Math.round(enemyMaxHp * attackConfig.damagePercent);
        const levelBonusDamage = (gameState.player.attackUpgradeLevels[attackType] ?? 0) * this.levelUpDamageBonus;
        return Math.max(1, baseDamage + levelBonusDamage);
    }

    getPlayerDefensePercent(player = gameState.player){
        if (!player) {
            return 0;
        }

        const defensePercent = typeof player.getDefensePercent === 'function'
            ? player.getDefensePercent()
            : (player.defenseUpgradeLevel ?? 0) * this.levelUpDefenseBonusPercent;
        return Phaser.Math.Clamp(defensePercent, 0, 1);
    }

    getPlayerDefenseValue(player = gameState.player){
        if (!player) {
            return 0;
        }

        if (typeof player.getDefenseValue === 'function') {
            return player.getDefenseValue();
        }

        return Math.round(player.maxHp * this.getPlayerDefensePercent(player));
    }

    grantEnemyExp(player){
        if (!player || player.isDead) {
            return;
        }

        const expPercent = Phaser.Math.Between(
            Math.round(this.enemyExpMinPercent * 100),
            Math.round(this.enemyExpMaxPercent * 100)
        ) / 100;
        const expGain = Math.max(1, Math.round(player.expToNextLevel * expPercent));
        player.currentExp += expGain;
        this.showExpGainIndicator(player, expGain);

        while (player.currentExp >= player.expToNextLevel) {
            player.currentExp -= player.expToNextLevel;
            this.handlePlayerLevelUp(player);
        }

        this.updatePlayerHud();
    }

    handlePlayerLevelUp(player){
        player.level += 1;
        player.expToNextLevel += 100;
        player.availableAttackUpgradePoints += 1;
        player.currentHp = player.maxHp;
        player.currentMana = player.maxMana;

        const levelUpText = this.add.text(player.x, player.y - 80, `LEVEL ${player.level}`, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#fde68a',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(250);

        this.tweens.add({
            targets: levelUpText,
            y: levelUpText.y - 40,
            alpha: 0,
            duration: 900,
            ease: 'Cubic.easeOut',
            onComplete: () => levelUpText.destroy()
        });

        if (this.playerProfile?.visible) {
            this.updatePlayerProfilePanel();
        }
    }

    upgradePlayerAttack(attackType){
        if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
            return;
        }

        if (!(attackType in gameState.player.attackUpgradeLevels)) {
            return;
        }

        gameState.player.availableAttackUpgradePoints -= 1;
        gameState.player.attackUpgradeLevels[attackType] += 1;
        this.updatePlayerHud();
    }

    upgradePlayerDefense(){
        if (!gameState.player || gameState.player.availableAttackUpgradePoints <= 0) {
            return;
        }

        gameState.player.availableAttackUpgradePoints -= 1;
        gameState.player.defenseUpgradeLevel += 1;
        this.updatePlayerHud();
    }

    showExpGainIndicator(player, expGain){
        const expText = this.add.text(player.x, player.y - 110, `+${expGain} EXP`, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#fde68a',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(240);

        this.tweens.add({
            targets: expText,
            y: expText.y - 50,
            alpha: 0,
            duration: 850,
            ease: 'Cubic.easeOut',
            onComplete: () => expText.destroy()
        });
    }

    handlePlayerDeath(player){
        if (this.isRestarting) {
            return;
        }

        this.isRestarting = true;
        player.isDead = true;
        player.isHurting = true;
        player.setVelocity(0, 0);
        this.cleanupSceneState();

        this.time.delayedCall(700, () => {
            this.scene.restart();
        });
    }
    createMovement(){ // TO BE REMOVE AFTER UPDATE
        const cursors = gameState.cursors;
        const player = gameState.player;
        const key = {
            keyC : gameState.keyC,
            keyA : gameState.keyA,
            keyD : gameState.keyD,
            keyW : gameState.keyW,
            keyV : gameState.keyV,
            keyX : gameState.keyX,
            keySpace : gameState.keySpace
        };
    
        // LuneReaper Asset Load
        function luneReaperMovement(){
            if ((cursors.up.isDown || key.keyW.isDown) && player.body.blocked.down) {
                player.setVelocityY(-400);
               
            }else if (!key.keyX.isDown && !key.keyV.isDown && !key.keyC.isDown && player.body.velocity.y > 0 && !player.body.touching.down) {
                player.anims.play('idle', true); // set to frame index 2 of the jump spritesheet
            }else if(cursors.left.isDown || key.keyA.isDown){
                player.setVelocityX(-250);
                player.setFlipX(true);
                player.anims.play('run', true);
        
            }else if(cursors.right.isDown || key.keyD.isDown){
                player.setVelocityX(250);
                player.anims.play('run', true);
                player.setFlipX(false);
        
            }else if(key.keyC.isDown){
                player.anims.play('slash', true);
                player.setVelocityX(0);
            }else if(key.keyX.isDown){
                player.anims.play('double_slash', true);
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.setVelocityX(-50);
                    }else{
                        player.setVelocityX(50);
                    }
            }else if(key.keyV.isDown){
                player.anims.play('dash', true);
                    if(player.flipX){ // use flipX properties from player object and get boolean value
                        player.x -= 10;
                    }else{
                        player.x += 10;
                    }
            }else if(key.keySpace.isDown && player.body.blocked.down){
                player.anims.play('special_skill', true);
               player.setScale(3);
                player.setVelocityX(0);
            }
            else{
                player.setVelocityX(0);
                player.anims.play('idle', true);
            }
        }
    }

    createSoundEffects(){
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
        }

        this.backgroundMusic = this.sound.add('grassy_biome', { loop: true, volume: 1 });
        this.backgroundMusic.play();
    }

    cleanupSceneState(){
        if (this.cleanupComplete) {
            return;
        }

        this.cleanupComplete = true;

        if (gameState.player?.anims) {
            gameState.player.anims.stop();
        }

        gameState.enemy?.getChildren().forEach(enemy => {
            enemy.anims?.stop();
        });

        this.tweens.killAll();
        this.time.removeAllEvents();

        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = null;
        }

        this.sound.stopAll();
        this.sound.removeAll();
    }
    
    createParallaxBackground(){
        gameState.clouds = this.add.image(0, gameState.height - 1450, 'clouds').setOrigin(0, 0).setDepth(1);
        gameState.mountain = this.add.image(0, gameState.height - 970, 'mountain').setOrigin(0, 0).setDepth(2);
        gameState.ruins = this.add.image(0, config.height, 'ruins').setOrigin(0, 0).setDepth(3);
        gameState.trees = this.add.image(0, gameState.height - 650, 'trees').setOrigin(0, 0).setDepth(5);
        gameState.clouds.setScrollFactor(0.2, 0.1);
        gameState.mountain.setScrollFactor(0.5, 0.4);
        gameState.ruins.setScrollFactor(0.5, 0.5);
        gameState.trees.setScrollFactor(0.7, 0.7);
    }
    characterTweensY(target, y, duration, isPause, repetation, isYoYo, objectBody){
        this.tweens.add({
            targets: target,
            y: y,
            ease: 'linear', // given
            duration: duration,
            paused: isPause,
            repeat: repetation,
            yoyo: isYoYo,
            onUpdate: () => {
                // Sync physics body with the tweened position
                objectBody.updateFromGameObject();
              }
        });
    }
    characterTweensX(target, x, duration, isPause, repetation, isYoYo, objectBody){
        this.tweens.add({
            targets: target,
            x: x,
            ease: 'linear', // given
            duration: duration,
            paused: isPause,
            repeat: repetation,
            yoyo: isYoYo,
            onUpdate: () => {
                // Sync physics body with the tweened position
                objectBody.updateFromGameObject();
              }
        });
    }

      
}   



/**
 * 1. Create and Fix World asset
 * 2. platform collider
 */
