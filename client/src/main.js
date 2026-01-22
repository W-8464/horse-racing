import { config } from './config/config.js';
import GameScene from './scenes/GameScene.js';

const gameConfig = {
    ...config,
    backgroundColor: '#222222',
    scene: [GameScene]
};

const game = new Phaser.Game(gameConfig);