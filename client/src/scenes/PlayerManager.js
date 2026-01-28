// PlayerManager.js
import Horse from '../entities/Horse.js';
import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class PlayerManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;
        this.sharedHorse = null; // Chỉ 1 con ngựa
    }

    init() {
        // Tạo sẵn con ngựa ở vạch xuất phát
        this.sharedHorse = new Horse(
            this.scene,
            GAME_SETTINGS.START_LINE_X || 100, // Vị trí xuất phát
            this.scene.scale.height / 2 + 100, // Vị trí Y (giữa màn hình)
            'horse',
            'shared',
            0xffffff, // Màu trắng hoặc màu gì đó nổi bật
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
        this.sharedHorse.anims.msPerFrame = 1000 / 10;
        this.sharedHorse.play('horse_idle');
    }

    updateSharedHorse(progress, speed) {
        if (!this.sharedHorse) return;

        // 1. Tính toán vị trí (Vẫn tính toán để spectator thấy ngựa ở vạch xuất phát)
        const startX = GAME_SETTINGS.START_LINE_X || 100;
        const trackLength = (GAME_SETTINGS.FINISH_LINE_X || 5000) - startX;
        const targetX = startX + (trackLength * progress);

        // Di chuyển
        this.sharedHorse.x = Phaser.Math.Linear(this.sharedHorse.x, targetX, 0.1);

        // 2. LOGIC ANIMATION DỰA TRÊN TRẠNG THÁI GAME
        if (this.state.isRaceStarted) {
            // Chỉ chạy khi đã hết Countdown (isRaceStarted = true)
            this.sharedHorse.play({ key: 'horse_run', repeat: -1 }, true);
            this.sharedHorse.anims.msPerFrame = 1000 / 12;
        } else {
            // Còn lại (Lobby, Countdown, hoặc mới vào) -> IDLE
            // ignoreIfPlaying = true để không bị reset frame liên tục
            // Nhưng cần đảm bảo nó đang là idle
            if (this.sharedHorse.anims.currentAnim?.key !== 'horse_idle') {
                this.sharedHorse.play('horse_idle');
            }
        }
    }
}