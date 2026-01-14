export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    dom: {
        createContainer: true // 🔥 BẮT BUỘC
    },
    scale: {
        // RESIZE: canvas sẽ luôn khớp với size của parent (#game-container).
        // UI sẽ tự layout theo scene.scale.width/height trong từng scene.
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,

        // Kích thước "thiết kế" (base) để làm chuẩn layout/font.
        // Khi RESIZE, width/height ở đây chỉ là mặc định lúc init.
        width: 1560,
        height: 720,

        fullscreenTarget: 'game-container'
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
};

export const GAME_SETTINGS = {
    // Base design size (dùng làm tỉ lệ layout UI)
    DESIGN_WIDTH: 1560,
    DESIGN_HEIGHT: 720,

    START_LINE_X: 150,
    FINISH_LINE_X: 2000,
    WORLD_WIDTH: 2500,

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
