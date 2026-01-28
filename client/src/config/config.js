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
    FINISH_LINE_X: 5400,
    WORLD_WIDTH: 5500,

    COUNTDOWN_TIME: 3,
    TICK_RATE: 20,
    INPUT_BATCH_MS: 50,
    CLICK_STEP_DISTANCE: 10,
    GROUND_HEIGHT: 64,

    get GROUND_Y() { return this.DESIGN_HEIGHT - this.GROUND_HEIGHT; },
    get HORSE_Y() { return this.GROUND_Y - 130; }
};

export const DEPTH = {
    SKY: 0,
    CLOUD: 1,
    GROUND: 10,
    CHECK_LINE: 11,
    HORSE: 20,
    UI: 100
};