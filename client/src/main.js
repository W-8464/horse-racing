// const config = {
//     type: Phaser.AUTO,
//     width: 1280,
//     height: 720,
//     parent: 'game-container',
//     physics: {
//         default: 'arcade',
//         arcade: { debug: false }
//     },
//     scene: { preload: preload, create: create, update: update }
// };

// const game = new Phaser.Game(config);
// const FINISH_LINE_X = 2000;

// function preload() {
//     this.load.spritesheet('horse', 'assets/images/horse-temp/1.png', {
//         frameWidth: 403.5,
//         frameHeight: 320
//     });
// }

// let socket;
// let otherPlayers;
// let isFinished = false;

// function create() {
//     const self = this;
//     socket = io();
//     otherPlayers = this.physics.add.group();

//     const worldWidth = 2500;
//     const sectionHeight = 720 / 4;

//     // 1. THẾ GIỚI & CAMERA
//     this.cameras.main.setBounds(0, 0, 2500, 720);
//     this.physics.world.setBounds(0, 0, 2500, 720);
//     this.add.rectangle(0, 0, worldWidth, sectionHeight, 0x87CEEB).setOrigin(0);
//     this.add.rectangle(0, sectionHeight, worldWidth, sectionHeight * 3, 0x2d8a39).setOrigin(0);

//     // Vẽ vạch đích
//     for (let i = 0; i < 720; i += 40) {
//         let color = (i / 40) % 2 === 0 ? 0xffffff : 0x000000;
//         this.add.rectangle(FINISH_LINE_X, i, 40, 40, color).setOrigin(0);
//     }

//     // 2. HOẠT ẢNH (ANIMATION)
//     this.anims.create({
//         key: 'idle_orange',
//         frames: this.anims.generateFrameNumbers('horse', { start: 0, end: 1 }),
//         frameRate: 6,
//         repeat: -1
//     });

//     this.anims.create({
//         key: 'run_orange',
//         frames: this.anims.generateFrameNumbers('horse', { start: 4, end: 7 }),
//         frameRate: 6,
//         repeat: -1
//     });

//     // 3. XỬ LÝ SOCKET
//     socket.on('currentPlayers', (players) => {
//         Object.keys(players).forEach((id) => {
//             if (id === socket.id) {
//                 addPlayer(self, players[id]);
//                 // ĐẢM BẢO CAMERA FOLLOW SAU KHI ADD
//                 self.cameras.main.startFollow(self.horse, true, 0.1, 0.1);
//             } else {
//                 addOtherPlayers(self, players[id]);
//             }
//         });
//     });

//     socket.on('newPlayer', (playerInfo) => {
//         addOtherPlayers(self, playerInfo);
//     });

//     socket.on('playerMoved', (playerInfo) => {
//         otherPlayers.getChildren().forEach((otherPlayer) => {
//             if (playerInfo.id === otherPlayer.playerId) {
//                 otherPlayer.setPosition(playerInfo.x, playerInfo.y);

//                 // Chuyển sang chạy
//                 if (otherPlayer.anims.currentAnim.key !== 'run_orange') {
//                     otherPlayer.play('run_orange');
//                 }

//                 // Tự động về idle sau 500ms
//                 if (otherPlayer.idleTimer) otherPlayer.idleTimer.remove();
//                 otherPlayer.idleTimer = this.time.delayedCall(500, () => {
//                     otherPlayer.play('idle_orange');
//                 });
//             }
//         });
//     });

//     socket.on('playerDisconnected', (playerId) => {
//         otherPlayers.getChildren().forEach((otherPlayer) => {
//             if (playerId === otherPlayer.playerId) {
//                 otherPlayer.destroy();
//             }
//         });
//     });

//     // 4. ĐIỀU KHIỂN
//     let idleTimer;

//     this.input.on('pointerdown', () => {
//         if (self.horse && !isFinished) {
//             self.horse.x += 20;

//             // Chuyển sang anim RUN nếu đang không chạy
//             if (self.horse.anims.currentAnim.key !== 'run_orange') {
//                 self.horse.play('run_orange');
//             }

//             // Xóa Timer cũ nếu có
//             if (idleTimer) idleTimer.remove();

//             // Sau 500ms không click nữa thì quay về IDLE
//             idleTimer = this.time.delayedCall(500, () => {
//                 if (!isFinished) self.horse.play('idle_orange');
//             });

//             socket.emit('playerMovement', { x: self.horse.x });
//             // ... kiểm tra vạch đích ...
//         }
//     });
// }

// function addPlayer(self, playerInfo) {
//     self.horse = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'horse', 0);
//     self.horse.setCollideWorldBounds(true);
//     self.horse.setScale(0.36);
//     self.horse.play('idle_orange'); // Luôn bắt đầu bằng trạng thái đứng im
// }

// function addOtherPlayers(self, playerInfo) {
//     const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'horse', 0).setOrigin(0.5, 0.5);
//     otherPlayer.playerId = playerInfo.id;
//     otherPlayer.setScale(0.36);
//     otherPlayers.add(otherPlayer);
// }

// function update() { }

import { config } from './config/config.js';
import GameScene from './scenes/GameScene.js';

const gameConfig = {
    ...config,
    scene: [GameScene]
};

const game = new Phaser.Game(gameConfig);