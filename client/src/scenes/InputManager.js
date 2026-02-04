import ClickValidator from '../utils/ClickValidator.js';

export default class InputManager {
    constructor(scene, state, players, network, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.network = network;
        this.ui = ui;

        // Initialize click validator
        this.clickValidator = new ClickValidator({
            maxClicksPerSecond: 12,
            throttleMs: 50,
            warningThreshold: 10
        });

        this.warningText = null;
        this.warningTimeout = null;
    }

    init() {
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    onPointerDown(pointer) {
        if (this.ui.isWinnerOpen()) return;
        if (this.state.role !== 'player') return;

        if (this.state.isCountdownRunning) return;

        if (!this.state.isRaceStarted || this.state.isFinished || !this.players.horse) return;

        // Validate click
        const validation = this.clickValidator.validateClick();

        if (!validation.allowed) {
            this.showWarning(validation.message);
            return;
        }

        // Show warning if approaching limit
        if (validation.warning && validation.message) {
            this.showWarning(validation.message, true);
        }

        // Process the click
        this.players.moveSelfBy(15);
        this.network.emitMovement(this.players.horse.x);

        if (this.players.horse.requestRun) this.players.horse.requestRun(1);
        else if (this.players.horse.playRun) this.players.horse.playRun();
    }

    showWarning(message, isWarning = false) {
        // Clear existing timeout
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
        }

        // Create or update warning text
        if (!this.warningText) {
            const { width, height } = this.scene.scale;
            this.warningText = this.scene.add.text(
                width / 2,
                height * 0.3,
                message,
                {
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    color: isWarning ? '#ffeb3b' : '#ff1744',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 6,
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(6000).setScrollFactor(0);
        } else {
            this.warningText.setText(message);
            this.warningText.setColor(isWarning ? '#ffeb3b' : '#ff1744');
        }

        // Auto-hide after 1.5 seconds
        this.warningTimeout = setTimeout(() => {
            if (this.warningText) {
                this.warningText.destroy();
                this.warningText = null;
            }
        }, 1500);
    }

    reset() {
        this.clickValidator.reset();
        if (this.warningText) {
            this.warningText.destroy();
            this.warningText = null;
        }
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
            this.warningTimeout = null;
        }
    }

    destroy() {
        this.reset();
        if (this.scene.input) {
            this.scene.input.off('pointerdown');
        }
    }
}