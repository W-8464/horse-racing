import { GAME_SETTINGS } from '../config/config.js';
import EnvironmentManager from './EnvironmentManager.js';

import PlayerManager from './PlayerManager.js';
import UIManager from './UIManager.js';
import NetworkManager from './NetworkManager.js';
import FlashSkillManager from './FlashSkillManager.js';
import InputManager from './InputManager.js';
import FireworksManager from './FireworksManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        this.state = {
            role: null,
            isFinished: false,
            isRaceStarted: false,
            isCountdownRunning: false,
            finishedPlayers: [],
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
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: { font: '20px Arial', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

        const progressBar = this.add.graphics();

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x3498db, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        this.load.spritesheet('horse', 'assets/images/horse-run.png', {
            frameWidth: 384,
            frameHeight: 270
        });

        this.load.spritesheet('idle', 'assets/images/horse-idle.png', {
            frameWidth: 384,
            frameHeight: 270
        });

        this.load.image('flash_icon', 'assets/images/flash.png');

        this.load.audio('countdown_full', 'assets/sounds/countdown.mp3');
        this.load.audio('gallop', 'assets/sounds/gallop.mp3');
        this.load.audio('audience', 'assets/sounds/audience.mp3');
        this.load.audio('finish_sound', 'assets/sounds/win.mp3');
    }

    create() {
        // environment
        this.env = new EnvironmentManager(this);
        this.env.createPixelTextures();

        const initialWorldHeight = Math.max(GAME_SETTINGS.DESIGN_HEIGHT, this.scale.height);
        this.env.setupWorld(initialWorldHeight);

        this.env.drawCheckeredLine(GAME_SETTINGS.START_LINE_X);
        this.env.drawCheckeredLine(GAME_SETTINGS.FINISH_LINE_X);

        // sounds
        this.state.sounds.countdown = this.sound.add('countdown_full');
        this.state.sounds.gallop = this.sound.add('gallop', { loop: true });
        this.state.sounds.audience = this.sound.add('audience', { loop: true });
        this.state.sounds.finish = this.sound.add('finish_sound');

        this.state.sounds.audience.play();

        // anims
        this.createAnimations();

        // [NOTE] FireworksManager cần đảm bảo setDepth(DEPTH.FIREWORK) bên trong nó
        this.fireworks = new FireworksManager(this);

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
        this.handleResize({ width: this.scale.width, height: this.scale.height });
        this.scale.on('resize', this.handleResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    setupRestartHandler() {
        this.events.on('restartRequested', this.handleRestartRequested, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.events.off('restartRequested', this.handleRestartRequested, this);
        });
    }

    handleRestartRequested() {
        if (this.state.role !== 'host') return;
        if (this.network?.requestRestart) {
            this.network.requestRestart();
            return;
        }
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

        const worldHeight = Math.max(GAME_SETTINGS.DESIGN_HEIGHT, height);
        cam.setViewport(0, 0, width, height);
        cam.setSize(width, height);
        cam.setBounds(0, 0, GAME_SETTINGS.WORLD_WIDTH, worldHeight);

        this.env?.resize(worldHeight);

        if (this.players) {
            this.players.refreshHorseYPositions();
        }

        this.ui?.layout();
    }

    createAnimations() {
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
        const path = window.location.pathname;

        if (path === '/host') {
            this.handleFullScreen();
            this.ui.showHostPasswordInput(
                (password) => {
                    this.state.role = 'host';
                    this.network.selectRoleHost(password);
                    this.ui.showLeaderboard('host');
                }
            );
        }
        else {
            this.ui.showPlayerNameInput(
                (name) => {
                    this.handleFullScreen();
                    this.state.role = 'player';
                    this.network.selectRolePlayer(name);
                    this.ui.showWaitingText();
                    this.ui.showGuideOverlay();
                    this.ui.showLeaderboard('player');
                }
            );
        }
    }

    update(time) {
        if (this.players && this.network) {
            this.players.updateAllPositions(this.network);

            // [LOGIC MỚI] Sửa lại phần update Leaderboard
            if (!this.state.isFinished) {
                if (!this.lastLeaderboardUpdate || time - this.lastLeaderboardUpdate > 200) {

                    // 1. Lấy danh sách những người đã về đích từ state (do Server gửi về)
                    const finishedPlayers = this.state.finishedPlayers || [];

                    // 2. Gom tất cả ngựa đang chạy
                    const allHorses = [...this.players.otherPlayers.getChildren()];
                    if (this.players.horse) allHorses.push(this.players.horse);

                    // 3. Map dữ liệu để sắp xếp
                    const sortedData = allHorses.map(h => {
                        // Kiểm tra xem ngựa này đã nằm trong danh sách về đích chưa
                        const finishRecord = finishedPlayers.find(f => f.id === h.playerId);

                        return {
                            id: h.playerId,
                            name: h.playerName || 'Guest',
                            x: h.x,
                            horseColor: h.baseColor,
                            // Nếu đã về đích thì lấy rank từ server, chưa thì là Infinity
                            rank: finishRecord ? finishRecord.rank : Infinity,
                            finishTime: finishRecord ? finishRecord.finishTime : null
                        };
                    });

                    // 4. Sắp xếp:
                    // - Ưu tiên người có Rank (đã về đích) nhỏ hơn lên trước.
                    // - Nếu cả 2 chưa về đích (Rank = Infinity), ai chạy xa hơn (x lớn hơn) đứng trước.
                    sortedData.sort((a, b) => {
                        if (a.rank !== b.rank) {
                            return a.rank - b.rank; // 1, 2, 3... lên trước Infinity
                        }
                        // Cả 2 đều chưa về đích -> so sánh quãng đường X
                        return b.x - a.x;
                    });

                    // 5. Gọi hàm update UI
                    this.ui.updateLeaderboard(sortedData);

                    this.lastLeaderboardUpdate = time;
                }
            }
        }

        if (this.players) {
            this.players.updateDepths();
        }

        this.players?.updateHostCameraFollow();
    }
}