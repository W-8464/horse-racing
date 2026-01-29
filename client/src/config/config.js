export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 932,
        height: 430,
        fullscreenTarget: 'game-container'
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
};

export const GAME_SETTINGS = {
    DESIGN_WIDTH: 932,
    DESIGN_HEIGHT: 430,

    START_LINE_X: 100,
    get FINISH_LINE_X() { return this.DESIGN_WIDTH - 100; },
    get WORLD_WIDTH() { return this.DESIGN_WIDTH; },

    COUNTDOWN_TIME: 3,
    TICK_RATE: 20,
    INPUT_BATCH_MS: 50,
    CLICK_STEP_DISTANCE: 10,
    GROUND_HEIGHT: 64,

    get GROUND_Y() { return this.DESIGN_HEIGHT - this.GROUND_HEIGHT; },
    // Công thức: GroundY - (Chiều cao gốc * Scale / 2)
    // 270 * 0.6 / 2 = 81
    get HORSE_Y() { return this.GROUND_Y - 81; }
};

export const DEPTH = {
    SKY: 0,
    CLOUD: 1,
    GROUND: 10,
    CHECK_LINE: 11,
    HORSE: 20,
    UI: 100
};