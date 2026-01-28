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
        // ... (Giữ nguyên phần preload giống code cũ)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: { font: '20px Arial', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

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

        this.load.spritesheet('horse', 'assets/images/horse-run.png', { frameWidth: 384, frameHeight: 270 });
        this.load.spritesheet('idle', 'assets/images/horse-idle.png', { frameWidth: 384, frameHeight: 270 });
        this.load.image('lantern', 'assets/images/light.png');
        this.load.image('flash_icon', 'assets/images/flash.png');
        this.load.audio('bgm', 'assets/sounds/background_music.mp3');
        this.load.audio('countdown_full', 'assets/sounds/countdown.mp3');
        this.load.audio('gallop', 'assets/sounds/gallop.mp3');
        this.load.audio('audience', 'assets/sounds/audience.mp3');
        this.load.audio('finish_sound', 'assets/sounds/win.mp3');
    }

    create() {
        // 1. Tạo môi trường và ngựa như bình thường (để tránh lỗi null reference)
        this.env = new EnvironmentManager(this);
        this.env.createPixelTextures();
        this.env.setupWorld(this.scale.height);

        this.createAnimations();

        // Managers
        this.players = new PlayerManager(this, this.state);
        this.players.init();

        this.ui = new UIManager(this, this.state); // UI sẽ nằm đè lên trên cùng

        this.network = new NetworkManager(this, this.state, this.players, this.ui);
        this.network.init();

        this.flashSkill = new FlashSkillManager(this, this.state, this.players, this.network);
        this.inputs = new InputManager(this, this.state, this.players, this.network, this.flashSkill, this.ui);
        this.inputs.init();

        // Sounds
        this.state.sounds.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        this.state.sounds.countdown = this.sound.add('countdown_full');
        this.state.sounds.gallop = this.sound.add('gallop', { loop: true });
        this.state.sounds.audience = this.sound.add('audience', { loop: true });
        this.state.sounds.finish = this.sound.add('finish_sound');
        this.state.sounds.bgm.play();

        this.setupResizeHandler();
        this.setupRestartHandler();

        // Gọi UI
        this.showInitialUI();
    }

    // --- LOGIC MỚI: Chuyển Host sang màn hình Admin (Màn đen) ---
    setupHostView() {
        // 1. Đặt background camera màu đen
        this.cameras.main.setBackgroundColor('#000000');

        // 2. Tạo một hình chữ nhật đen che phủ toàn bộ thế giới game
        // (Đặt depth thấp hơn UI nhưng cao hơn Environment/Horse)
        // Giả sử UI depth >= 100, Game depth <= 10
        const cover = this.add.rectangle(0, 0, 100000, 100000, 0x000000)
            .setScrollFactor(0)
            .setDepth(50); // Che hết các object có depth < 50
    }

    showInitialUI() {
        const path = window.location.pathname;

        if (path.includes('/host')) {
            // --- GIAO DIỆN HOST ---
            this.handleFullScreen();

            // Kích hoạt chế độ màn hình đen cho Host
            this.setupHostView();

            this.ui.showHostPasswordInput(
                (password) => {
                    this.state.role = 'host';
                    this.network.selectRoleHost(password);
                }
            );
        } else {
            // --- GIAO DIỆN PLAYER ---
            this.ui.showPlayerNameInput(
                (name) => {
                    this.handleFullScreen();
                    this.state.role = 'player';
                    this.network.selectRolePlayer(name);
                    this.ui.showWaitingText();
                }
            );
        }
    }

    update(time, delta) {
        // if (window.innerHeight > window.innerWidth) return;

        // HOST: Không update visual ngựa
        if (this.state.role === 'host') return;

        // PLAYER và SPECTATOR: Đều update visual ngựa
        // Nếu role là spectator, this.players vẫn tồn tại (được init ở create)
        if (this.players) {
            const progress = this.state.progress || 0;
            // Spectator không gửi tap, nhưng vẫn nhận progress từ server để ngựa chạy
            this.players.updateSharedHorse(progress, 0);
        }
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
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        const cam = this.cameras.main;

        // LOGIC RESPONSIVE MỚI:
        // Luôn full màn hình, camera chỉ giới hạn chiều rộng đường đua
        cam.setViewport(0, 0, width, height);
        cam.setSize(width, height);

        // Cập nhật bounds camera theo chiều cao mới
        cam.setBounds(0, 0, GAME_SETTINGS.WORLD_WIDTH, height);

        // Gọi Env resize để vẽ lại đất và cây ở vị trí đáy màn hình mới
        if (this.env) {
            this.env.resize(height);
        }

        if (this.ui) this.ui.layout();
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
}