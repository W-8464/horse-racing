export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    dom: {
        createContainer: true // 🔥 BẮT BUỘC
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.LANDSCAPE,
        width: 1280,
        height: 720,
        fullscreenTarget: 'game-container'
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
};

export const GAME_SETTINGS = {
    START_LINE_X: 150,
    FINISH_LINE_X: 2000,
    WORLD_WIDTH: 2500,

    COUNTDOWN_TIME: 3
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