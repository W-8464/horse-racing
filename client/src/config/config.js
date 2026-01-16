// config.js

export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // Cập nhật kích thước chuẩn mới
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
    // Tối ưu cho tỉ lệ 932x430
    DESIGN_WIDTH: 932,
    DESIGN_HEIGHT: 430,

    START_LINE_X: 100, // Thu hẹp lề một chút
    FINISH_LINE_X: 5000, // Kéo dài đường đua để tận dụng màn hình ngang
    WORLD_WIDTH: 5500,

    COUNTDOWN_TIME: 3,
    TICK_RATE: 20,
    INPUT_BATCH_MS: 50,
    CLICK_STEP_DISTANCE: 10
};

export const DEPTH = {
    SKY: 0,
    CLOUD: 1,
    GRASS: 2,
    CHECK_LINE: 3,
    HORSE: 5,
    TREE: 10,
    LANTERN: 15,
    UI: 100
};