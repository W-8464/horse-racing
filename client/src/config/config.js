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
    input: {
        activePointers: 3, // Cho phép nhận diện tối đa 3 ngón tay cùng lúc
    },
    disableContextMenu: true,
};

export const GAME_SETTINGS = {
    // Tối ưu cho tỉ lệ 932x430
    DESIGN_WIDTH: 932,
    DESIGN_HEIGHT: 430,

    START_LINE_X: 100, // Thu hẹp lề một chút
    FINISH_LINE_X: 5400, // Kéo dài đường đua để tận dụng màn hình ngang
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
    HORSE: 10,       // Đây chỉ là base, thực tế sẽ là giá trị Y (từ 0 đến ~500)

    // Tên người chơi: Y + offset. 
    // Max Y là ~500, cộng thêm offset 1000 = 1500. Vẫn thấp hơn UI.
    NAME_OFFSET: 1000,

    UI: 5000,        // Cao hơn hẳn mọi objects trong game
    OVERLAY: 6000,   // Podium, Guide
    FIREWORK: 7000   // Pháo hoa cao nhất
};