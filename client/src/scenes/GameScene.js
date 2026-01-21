import { GAME_SETTINGS } from '../config/config.js';
import EnvironmentManager from './EnvironmentManager.js';

import PlayerManager from './PlayerManager.js';
import UIManager from './UIManager.js';
import NetworkManager from './NetworkManager.js';
import FlashSkillManager from './FlashSkillManager.js';
import InputManager from './InputManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        // state chung (thay cho việc GameScene ôm cả đống field)
        this.state = {
            role: null,
            isFinished: false,
            isRaceStarted: false,
            isCountdownRunning: false,
            sounds: {}
        };

        this.env = null;
        this.players = null;
        this.ui = null;
        this.network = null;
        this.flashSkill = null;
        this.inputs = null;
    }

    preload() {
        // this.load.spritesheet('horse', 'assets/images/horse-temp/28.png', {
        //     frameWidth: 403.5,
        //     frameHeight: 320
        // });

        this.load.spritesheet('horse', 'assets/images/horse-run.png', {
            frameWidth: 384,
            frameHeight: 270
        });

        this.load.spritesheet('idle', 'assets/images/horse-idle.png', {
            frameWidth: 384,
            frameHeight: 270
        });

        this.load.image('lantern', 'assets/images/light.png');
        this.load.image('flash_icon', 'assets/images/flash.png');

        // Nhạc nền (BGM)
        this.load.audio('bgm', 'assets/sounds/background_music.mp3');
        // Hiệu ứng âm thanh (SFX)
        this.load.audio('countdown_full', 'assets/sounds/countdown.mp3');
        this.load.audio('gallop', 'assets/sounds/gallop.mp3');
        this.load.audio('audience', 'assets/sounds/audience.mp3');
        this.load.audio('finish_sound', 'assets/sounds/win.mp3');
    }

    create() {
        // environment
        this.env = new EnvironmentManager(this);
        this.env.createPixelTextures();

        const initialWorldHeight = Math.max(GAME_SETTINGS.DESIGN_HEIGHT || 720, this.scale.height);
        this.env.setupWorld(initialWorldHeight);

        this.env.drawCheckeredLine(GAME_SETTINGS.START_LINE_X);
        this.env.drawCheckeredLine(GAME_SETTINGS.FINISH_LINE_X);

        // sounds
        this.state.sounds.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        this.state.sounds.countdown = this.sound.add('countdown_full');
        this.state.sounds.gallop = this.sound.add('gallop', { loop: true });
        this.state.sounds.audience = this.sound.add('audience', { loop: true });
        this.state.sounds.finish = this.sound.add('finish_sound');

        this.state.sounds.bgm.play();

        // anims
        this.createAnimations();

        // managers
        this.players = new PlayerManager(this, this.state);
        this.players.init();

        this.ui = new UIManager(this, this.state);

        this.network = new NetworkManager(this, this.state, this.players, this.ui);
        this.network.init();

        this.flashSkill = new FlashSkillManager(this, this.state, this.players, this.network);

        this.inputs = new InputManager(this, this.state, this.players, this.network, this.flashSkill, this.ui);
        this.inputs.init();

        this.setupResizeHandler();

        this.setupRestartHandler();

        this.showInitialUI();
    }

    setupResizeHandler() {
        // layout ngay lúc init
        this.handleResize({ width: this.scale.width, height: this.scale.height });

        this.scale.on('resize', this.handleResize, this);

        // cleanup
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    setupRestartHandler() {
        // chỉ host mới được yêu cầu restart
        this.events.on('restartRequested', this.handleRestartRequested, this);

        // cleanup
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.events.off('restartRequested', this.handleRestartRequested, this);
        });
    }

    handleRestartRequested() {
        if (this.state.role !== 'host') return;

        // Ưu tiên gọi method nếu NetworkManager có expose
        if (this.network?.requestRestart) {
            this.network.requestRestart();
            return;
        }

        // fallback: nếu NetworkManager expose socket
        if (this.network?.socket) {
            this.network.socket.emit('hostRestartGame');
            return;
        }

        console.warn('[restart] Cannot find socket/requestRestart in NetworkManager');
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        const cam = this.cameras.main;

        const baseW = GAME_SETTINGS.DESIGN_WIDTH || 1560;
        const baseH = GAME_SETTINGS.DESIGN_HEIGHT || 720;
        const rawZoom = Math.min(width / baseW, height / baseH);
        const zoom = Phaser.Math.Clamp(rawZoom, 0.45, 1);

        cam.setViewport(0, 0, width, height);
        cam.setSize(width, height);
        //cam.setZoom(zoom);
        //const worldHeight = Math.max(baseH, height / zoom);
        const worldHeight = Math.max(GAME_SETTINGS.DESIGN_HEIGHT || 720, height);
        cam.setBounds(0, 0, GAME_SETTINGS.WORLD_WIDTH, worldHeight);

        this.env?.resize(worldHeight);

        this.ui?.layout();
    }

    createAnimations() {
        // if (!this.anims.exists('horse_run')) {
        //     this.anims.create({
        //         key: 'horse_run',
        //         frames: this.anims.generateFrameNumbers('horse', { start: 4, end: 7 }),
        //         frameRate: 6,
        //         repeat: -1
        //     });
        // }
        if (!this.anims.exists('horse_run')) {
            this.anims.create({
                key: 'horse_run',
                frames: this.anims.generateFrameNumbers('horse', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: 0
            });
        }
        if (!this.anims.exists('horse_idle')) {
            this.anims.create({
                key: 'horse_idle',
                frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
    }

    handleFullScreen() {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
    }

    showInitialUI() {
        this.ui.showPlayerNameInput(
            (name) => {
                this.handleFullScreen();
                this.state.role = 'player';
                this.network.selectRolePlayer(name);
                this.ui.showWaitingText();
            },
            () => {
                this.handleFullScreen();
                this.ui.showHostPasswordInput(
                    (password) => {
                        this.state.role = 'host';
                        this.network.selectRoleHost(password);
                    },
                    () => {
                        this.showInitialUI();
                    }
                );
            }
        );
    }

    update(time) {
        if (this.players && this.network) {
            this.players.updateAllPositions(this.network);

            if (this.state.role === 'host' && !this.state.isFinished) {
                if (!this.lastLeaderboardUpdate || time - this.lastLeaderboardUpdate > 200) {

                    const allHorses = [...this.players.otherPlayers.getChildren()];
                    if (this.players.horse) allHorses.push(this.players.horse);

                    const sortedData = allHorses.map(h => ({
                        id: h.playerId,
                        name: h.playerName || 'Guest',
                        x: h.x,
                        horseColor: h.baseColor
                    }));

                    sortedData.sort((a, b) => b.x - a.x);

                    this.ui.updateHostLeaderboard(sortedData);
                    this.lastLeaderboardUpdate = time;
                }
            }
        }
        this.players?.updateHostCameraFollow();
    }
}
