import Horse from '../entities/Horse.js';
import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class PlayerManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;
        this.sharedHorse = null;
    }

    init() {
        // Tạo sẵn con ngựa ở vạch xuất phát
        this.sharedHorse = new Horse(
            this.scene,
            GAME_SETTINGS.START_LINE_X || 100,
            GAME_SETTINGS.HORSE_Y,
            'horse',
            'shared',
            0xffffff,
            '',
            false
        );
        this.sharedHorse.setDepth(DEPTH.HORSE);
        this.sharedHorse.play('horse_idle');

        // Camera luôn đi theo con ngựa này
        this.scene.cameras.main.startFollow(this.sharedHorse, true, 0.1, 0.1);
    }

    resetSharedHorse() {
        if (!this.sharedHorse) return;
        this.sharedHorse.x = GAME_SETTINGS.START_LINE_X || 100;
        if (this.scene.env) {
            this.sharedHorse.y = this.scene.env.groundY - 130;
        } else {
            this.sharedHorse.y = GAME_SETTINGS.HORSE_Y;
        }
        this.sharedHorse.anims.msPerFrame = 1000 / 10;
        this.sharedHorse.play('horse_idle');
    }

    updateSharedHorse(progress, speed) {
        if (!this.sharedHorse) return;

        const startX = GAME_SETTINGS.START_LINE_X || 100;
        const trackLength = (GAME_SETTINGS.FINISH_LINE_X || 5000) - startX;
        const targetX = startX + (trackLength * progress);

        this.sharedHorse.x = Phaser.Math.Linear(this.sharedHorse.x, targetX, 0.1);

        // Logic Animation
        if (this.state.isRaceStarted) {
            this.sharedHorse.play({ key: 'horse_run', repeat: -1 }, true);
            this.sharedHorse.anims.msPerFrame = 1000 / 12;
        } else {
            if (this.sharedHorse.anims.currentAnim?.key !== 'horse_idle') {
                this.sharedHorse.play('horse_idle');
            }
        }
    }

    updateHorseY(newY) {
        if (this.sharedHorse) {
            this.sharedHorse.y = newY;
        }
    }
}