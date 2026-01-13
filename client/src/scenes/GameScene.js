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
        };

        this.env = null;
        this.players = null;
        this.ui = null;
        this.network = null;
        this.flashSkill = null;
        this.inputs = null;
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
        // environment
        this.env = new EnvironmentManager(this);
        this.env.createPixelTextures();
        this.env.setupWorld();
        this.env.drawCheckeredLine(GAME_SETTINGS.START_LINE_X);
        this.env.drawCheckeredLine(GAME_SETTINGS.FINISH_LINE_X);

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

        // UI flow: chọn mode
        this.ui.showModeSelection({
            onPlayer: () => {
                this.handleFullScreen();
                this.ui.showPlayerNameInput((name) => {
                    this.state.role = 'player';
                    this.network.selectRolePlayer(name);
                    this.ui.showWaitingText();
                });
            },
            onHost: () => {
                this.handleFullScreen();
                this.ui.showHostPasswordInput((password) => {
                    this.state.role = 'host';
                    this.network.selectRoleHost(password);
                });
            }
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

    handleFullScreen() {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
    }

    update() {
        this.players?.updateHostCameraFollow();
    }
}
