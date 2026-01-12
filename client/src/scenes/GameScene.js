import Horse from '../entities/Horse.js';
import { GAME_SETTINGS, DEPTH } from '../config/config.js';
import EnvironmentManager from './EnvironmentManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.env = new EnvironmentManager(this);
        this.resetState();

        this.clickCount = 0;
        this.flashButton = null;
    }

    resetState() {
        this.role = null;
        this.socket = null;
        this.horse = null;
        this.otherPlayers = null;
        this.isFinished = false;
        this.isRaceStarted = false;
        this.isCountdownRunning = false;
    }

    preload() {
        this.load.spritesheet('horse', 'assets/images/horse-temp/28.png', {
            frameWidth: 403.5,
            frameHeight: 320
        });
        this.load.image('lantern', 'assets/images/light.png');
        this.load.image('flash_icon', 'assets/images/flash.png');
    }

    create() {
        this.socket = io();
        this.otherPlayers = this.physics.add.group();

        // Khởi tạo môi trường thông qua Manager
        this.env.createPixelTextures();
        this.env.setupWorld();
        this.env.drawCheckeredLine(GAME_SETTINGS.START_LINE_X);
        this.env.drawCheckeredLine(GAME_SETTINGS.FINISH_LINE_X);

        this.createAnimations();
        this.setupSocketListeners();
        this.setupInputs();
        this.createModeSelectionUI();
    }

    // --- GAME LOGIC ---
    createModeSelectionUI() {
        const cx = this.cameras.main.centerX;

        this.playerBtn = this.add.text(cx, 260, 'PLAYER', { fontSize: '32px' })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI)
            .setInteractive();

        this.hostBtn = this.add.text(cx, 320, 'HOST', { fontSize: '32px' })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI)
            .setInteractive();

        this.playerBtn.on('pointerdown', () => {
            this.playerBtn.destroy();
            this.hostBtn.destroy();
            this.showPlayerNameInput();
        });

        this.hostBtn.on('pointerdown', () => {
            this.playerBtn.destroy();
            this.hostBtn.destroy();
            this.showHostPasswordInput();
        });
    }

    createAnimations() {
        if (!this.anims.exists('horse_run')) {
            this.anims.create({
                key: 'horse_run',
                frames: this.anims.generateFrameNumbers('horse', { start: 4, end: 7 }),
                frameRate: 6,
                repeat: -1
            });
        }
    }

    setupInputs() {
        this.input.on('pointerdown', (pointer) => {
            if (this.winnerContainer || this.winnerOverlay) return;

            if (!this.isRaceStarted || this.isFinished || !this.horse || this.role !== 'player') return;

            if (this.flashButton && this.flashButton.getBounds().contains(pointer.x, pointer.y)) return;

            this.clickCount++;
            this.horse.x += 20;
            this.horse.playRun();
            this.socket.emit('playerMovement', { x: this.horse.x });

            if (this.clickCount >= 10 && !this.flashButton) {
                this.createFlashButton();
            }
        });
    }

    activateSpeedBoost() {
        this.horse.x += 100;

        this.time.delayedCall(1000, () => {
            this.horse.clearTint();
        });

        console.log("SKILL ACTIVATED!");
    }

    // --- SOCKETS ---
    setupSocketListeners() {
        this.socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach((id) => {
                if (id === this.socket.id) {
                    this.addPlayer(players[id]);
                } else {
                    this.addOtherPlayers(players[id]);
                }
            });
        });

        this.socket.on('newPlayer', (playerInfo) => this.addOtherPlayers(playerInfo));

        this.socket.on('playerMoved', (playerInfo) => {
            this.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (playerInfo.id === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    if (otherPlayer.playRun) otherPlayer.playRun();
                }
            });
        });

        this.socket.on('playerDisconnected', (playerId) => {
            const playerToDestroy = this.otherPlayers.getChildren().find(p => p.playerId === playerId);
            if (playerToDestroy) playerToDestroy.destroy();
        });

        this.socket.on('raceReset', (players) => {
            this.isRaceStarted = false;
            this.isFinished = false;
            this.clickCount = 0;

            if (this.horse) {
                this.horse.x = players[this.socket.id].x;
                this.horse.resetColor();
            }

            this.otherPlayers.getChildren().forEach(p => {
                const info = players[p.playerId];
                if (info) p.setPosition(info.x, info.y);
            });

            this.createStartButton();
        });

        this.socket.on('hostAccepted', () => {
            this.createStartButton();
        });

        this.socket.on('playerAccepted', () => {
            // player đã tạo ngựa bên server
        });

        this.socket.on('startCountdown', () => {
            const domElements = document.querySelectorAll('input, button');
            domElements.forEach(el => el.remove());

            this.clearAllUI();

            if (this.playerBtn) this.playerBtn.destroy();
            if (this.hostBtn) this.hostBtn.destroy();

            if (this.winnerContainer) {
                this.winnerContainer.destroy();
                this.winnerContainer = null;
            }

            if (this.winnerOverlay) {
                this.winnerOverlay.destroy();
                this.winnerOverlay = null;
            }

            if (this.waitingText) {
                this.waitingText.destroy();
                this.waitingText = null;
            }

            if (this.startButton) {
                this.startButton.destroy();
                this.startButton = null;
            }
            this.startCountdown();
        });

        this.socket.on('raceFinished', (data) => {
            this.isRaceStarted = false;
            this.showWinnerBanner(data.winnerName);
        });
    }

    // --- PLAYERS ---
    addPlayer(playerInfo) {
        if (this.horse) return;

        this.horse = new Horse(
            this,
            playerInfo.x,
            playerInfo.y,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name
        );

        this.horse.setDepth(DEPTH.HORSE);
        this.horse.play('horse_run');
        this.cameras.main.startFollow(this.horse, true, 0.1, 0.1);
    }

    addOtherPlayers(playerInfo) {
        const existing = this.otherPlayers.getChildren().find(p => p.playerId === playerInfo.id);
        if (existing || playerInfo.id === this.socket.id) {
            return;
        }

        const otherPlayer = new Horse(
            this,
            playerInfo.x,
            playerInfo.y,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name
        );

        otherPlayer.setDepth(DEPTH.HORSE);
        otherPlayer.play('horse_run');
        this.otherPlayers.add(otherPlayer);
    }

    clearAllUI() {
        const gameCanvas = this.game.canvas;
        const domContainer = gameCanvas.parentElement.querySelectorAll('.phaser-dom-element');
        domContainer.forEach(el => el.remove());
    }

    // --- UI & COUNTDOWN ---
    createStartButton() {
        const { centerX } = this.cameras.main;
        const btnBg = this.add.graphics()
            .fillStyle(0x00c853, 1).lineStyle(4, 0x008a39, 1)
            .fillRoundedRect(-100, -40, 200, 80, 5).strokeRoundedRect(-100, -40, 200, 80, 5)
            .lineStyle(2, 0x5dfc9b, 1).strokeRoundedRect(-94, -34, 188, 68, 3);

        const btnText = this.add.text(0, 0, 'START', {
            fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        this.startButton = this.add.container(centerX, 300, [btnBg, btnText])
            .setScrollFactor(0).setSize(200, 80).setInteractive({ useHandCursor: true })
            .setDepth(DEPTH.UI);

        this.startButton.on('pointerdown', () => {
            this.socket.emit('hostStartGame');
        });

    }

    startCountdown() {
        this.isCountdownRunning = true;
        let timeLeft = GAME_SETTINGS.COUNTDOWN_TIME;

        const countdownText = this.add.text(this.cameras.main.centerX, 200, timeLeft.toString(), {
            fontSize: '96px', fontStyle: 'bold', color: '#ff1744'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI);

        this.time.addEvent({
            delay: 1000,
            repeat: timeLeft,
            callback: () => {
                timeLeft--;
                if (timeLeft > 0) {
                    countdownText.setText(timeLeft.toString());
                } else {
                    countdownText.setText('GO!');
                    this.isRaceStarted = true;
                    this.isCountdownRunning = false;
                    this.isRaceStarted = true;
                    this.time.delayedCall(800, () => countdownText.destroy());
                }
            }
        });
    }

    createFlashButton() {
        const x = this.cameras.main.width - 80;
        const y = this.cameras.main.height - 80;
        const radius = 40;

        const btnIcon = this.add.image(0, 0, 'flash_icon');

        btnIcon.setDisplaySize(radius * 2, radius * 2);

        const btnBorder = this.add.graphics();
        btnBorder.lineStyle(4, 0xffffff, 1);
        btnBorder.strokeCircle(0, 0, radius);

        this.flashButton = this.add.container(x, y, [btnIcon, btnBorder])
            .setScrollFactor(0)
            .setSize(radius * 2, radius * 2)
            .setInteractive({ useHandCursor: true })
            .setDepth(DEPTH.UI);

        this.flashButton.on('pointerdown', () => {
            this.flashButton.setScale(0.9);
            this.useFlashSkill();
        });

        this.flashButton.on('pointerup', () => {
            if (this.flashButton) this.flashButton.setScale(1);
        });
    }

    useFlashSkill() {
        if (!this.horse) return;

        this.horse.x += 150;
        this.socket.emit('playerMovement', { x: this.horse.x });

        this.time.delayedCall(500, () => {
            this.horse.resetColor();
        });

        this.flashButton.destroy();
        this.flashButton = null;
        this.clickCount = 0;
    }

    showWaitingText() {
        this.waitingText = this.add.text(
            this.cameras.main.centerX,
            300,
            'Waiting to start...',
            {
                fontSize: '28px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(DEPTH.UI);
    }

    getLeadingHorse() {
        let leader = null;
        let maxX = -Infinity;

        this.otherPlayers.getChildren().forEach(horse => {
            if (horse.x > maxX) {
                maxX = horse.x;
                leader = horse;
            }
        });

        return leader;
    }

    showPlayerNameInput() {
        const cx = this.cameras.main.centerX;

        const dom = this.add.dom(cx, 300).createFromHTML(`
        <div style="text-align:center">
            <div style="color:#5dfc9b;font-family:monospace;font-size:20px;margin-bottom:10px">
                ENTER NAME
            </div>
            <input id="playerName" type="text"
                   style="${PIXEL_INPUT_STYLE}" />
            <br/><br/>
            <button id="joinBtn" style="${PIXEL_BTN_STYLE}">
                JOIN
            </button>
        </div>
    `).setDepth(DEPTH.UI).setScrollFactor(0);

        dom.addListener('click');
        dom.on('click', (e) => {
            if (e.target.id === 'joinBtn') {
                const name = dom.getChildByID('playerName').value.trim();
                if (!name) return;

                this.role = 'player';
                dom.destroy();

                window.scrollTo(0, 0);

                this.socket.emit('selectRole', {
                    role: 'player',
                    name
                });

                this.showWaitingText();
            }
        });
    }

    showHostPasswordInput() {
        const cx = this.cameras.main.centerX;

        const dom = this.add.dom(cx, 300).createFromHTML(`
        <div style="text-align:center">
            <div style="color:#ff1744;font-family:monospace;font-size:20px;margin-bottom:10px">
                HOST ACCESS
            </div>
            <input id="hostPass" type="password"
                   style="${PIXEL_INPUT_STYLE}" />
            <br/><br/>
            <button id="hostBtn" style="${PIXEL_BTN_STYLE}">
                CONFIRM
            </button>
            <div id="error"
                 style="color:#ff1744;font-family:monospace;font-size:14px;margin-top:8px;display:none">
                INVALID PASSWORD
            </div>
        </div>
    `).setDepth(DEPTH.UI).setScrollFactor(0);

        dom.addListener('click');

        dom.on('click', (e) => {
            if (e.target.id === 'hostBtn') {
                const password = dom.getChildByID('hostPass').value.trim();
                if (!password) return;

                this.role = 'host';

                this.socket.emit('selectRole', {
                    role: 'host',
                    password
                });
            }
        });

        this.socket.once('hostRejected', () => {
            dom.getChildByID('error').style.display = 'block';
        });

        this.socket.once('hostAccepted', () => {
            dom.destroy();
            window.scrollTo(0, 0);
        });
    }

    showWinnerBanner(winnerName) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // 1. Tạo nền tối (Canvas)
        this.winnerOverlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(DEPTH.UI);

        // 2. Tạo bảng thông báo bằng HTML (DOM) để tách biệt hoàn toàn Input
        const winnerDom = this.add.dom(cx, cy).createFromHTML(`
        <div style="
            background: #003b1f; 
            border: 4px solid #5dfc9b; 
            padding: 20px 60px; 
            text-align: center; 
            font-family: monospace;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        ">
            <h1 style="color: #ffeb3b; margin: 0 0 10px 0; font-size: 32px;">WINNER!</h1>
            <div style="color: #5dfc9b; font-size: 24px; margin-bottom: 20px;">${winnerName}</div>
            <button id="restartBtn" style="
                background: #5dfc9b; 
                color: #003b1f; 
                border: none; 
                padding: 10px 30px; 
                font-family: monospace; 
                font-weight: bold; 
                font-size: 20px; 
                cursor: pointer;
            ">RESTART</button>
        </div>
    `).setDepth(DEPTH.UI + 1).setScrollFactor(0);

        winnerDom.addListener('click');
        winnerDom.on('click', (e) => {
            if (e.target.id === 'restartBtn') {
                window.location.reload();
            }
        });

        // Gán vào biến để quản lý nếu cần destroy
        this.winnerContainer = winnerDom;

        // Animation pop nhẹ
        winnerDom.setScale(0);
        this.tweens.add({
            targets: winnerDom,
            scale: 1,
            duration: 300,
            ease: 'Back.Out'
        });
    }

    update() {
        if (this.role === 'host' && this.isRaceStarted) {
            const leader = this.getLeadingHorse();
            if (leader && this.cameras.main._follow !== leader) {
                this.cameras.main.startFollow(leader, true, 0.08, 0.08);
            }
        }
    }
}

const PIXEL_INPUT_STYLE = `
    background: #111;
    color: #5dfc9b;
    border: 3px solid #5dfc9b;
    font-family: monospace;
    font-size: 18px;
    padding: 8px;
    outline: none;
    box-shadow: 0 0 0 3px #003b1f inset;
    appearance: none;
    -webkit-appearance: none;
`;

const PIXEL_BTN_STYLE = `
    background: #003b1f;
    color: #5dfc9b;
    border: 3px solid #5dfc9b;
    font-family: monospace;
    font-size: 18px;
    padding: 8px 20px;
    cursor: pointer;
`;
