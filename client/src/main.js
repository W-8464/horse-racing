import { config } from './config/config.js';
import GameScene from './scenes/GameScene.js';

const gameConfig = {
    ...config,
    scene: [GameScene]
};

const game = new Phaser.Game(gameConfig);