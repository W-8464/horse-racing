import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.worldWidth = GAME_SETTINGS.WORLD_WIDTH;

        this.groundY = GAME_SETTINGS.GROUND_Y;

        this.ground = null;
        this.sky = null;
        // Đã bỏ this.trees

        this._texturesCreated = false;
        this._staticObjectsCreated = false;

        this.activeFireworks = [];
        this.fireworkTimer = null;
    }

    createPixelTextures() {
        if (this._texturesCreated) return;

        // 1. Texture Đất (Giữ nguyên)
        if (!this.scene.textures.exists('groundBlock')) {
            const size = 32;
            const canvas = this.scene.textures.createCanvas('groundBlock', size, size);
            const ctx = canvas.context;
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#A0522D';
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.fillStyle = '#5da139';
            ctx.fillRect(0, 0, size, 8);
            ctx.fillStyle = '#5da139';
            for (let i = 0; i < size; i += 4) {
                if (Math.random() > 0.5) ctx.fillRect(i, 8, 4, 3);
            }
            canvas.refresh();
        }

        // 2. Texture Mây (Giữ nguyên)
        if (!this.scene.textures.exists('cloudPixel')) {
            const cloudCanvas = this.scene.textures.createCanvas('cloudPixel', 48, 24);
            const cCtx = cloudCanvas.context;
            cCtx.fillStyle = '#ffffff';
            cCtx.fillRect(12, 0, 24, 12);
            cCtx.fillRect(0, 9, 48, 12);
            cCtx.fillStyle = '#def2ff';
            cCtx.fillRect(8, 18, 32, 3);
            cloudCanvas.refresh();
        }

        // 3. Texture Hạt Pháo Hoa (Giữ nguyên)
        if (!this.scene.textures.exists('particle_pixel')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 4, 4);
            graphics.generateTexture('particle_pixel', 4, 4);
            graphics.destroy();
        }

        this._texturesCreated = true;
    }

    setupWorld(screenHeight) {
        this.groundY = screenHeight - GAME_SETTINGS.GROUND_HEIGHT;
        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, screenHeight);

        // 1. VẼ BẦU TRỜI
        if (!this.sky) {
            this.sky = this.scene.add.graphics();
            this.sky.fillGradientStyle(0x6b8cff, 0x6b8cff, 0xafc1ff, 0xafc1ff, 1);
            this.sky.fillRect(0, 0, this.worldWidth, screenHeight);
            this.sky.setDepth(DEPTH.SKY);
        }

        // 2. VẼ MẶT ĐẤT
        if (!this.ground) {
            this.ground = this.scene.add.tileSprite(
                0,
                this.groundY,
                this.worldWidth,
                GAME_SETTINGS.GROUND_HEIGHT,
                'groundBlock'
            ).setOrigin(0, 0).setDepth(DEPTH.GROUND);
        }

        // 3. VẼ MÂY & ĐÈN LỒNG (Đã bỏ vẽ cây)
        if (!this._staticObjectsCreated) {

            // Vẽ Mây
            for (let i = 0; i < this.worldWidth; i += 200) {
                const cloudY = Math.random() * (screenHeight * 0.4);
                this.scene.add.image(i, cloudY, 'cloudPixel')
                    .setScale(2 + Math.random())
                    .setAlpha(0.9)
                    .setDepth(DEPTH.CLOUD)
                    .setScrollFactor(0.5);
            }

            // Đèn lồng
            for (let x = 0; x < this.worldWidth; x += 400) {
                this.scene.add.image(x, 0, 'lantern')
                    .setOrigin(0.5, 0)
                    .setScale(0.4)
                    .setDepth(DEPTH.LANTERN) // Đảm bảo bạn đã khai báo DEPTH.LANTERN trong config hoặc dùng số cụ thể
                    .setScrollFactor(0.8);
            }

            this._staticObjectsCreated = true;
        }
    }

    resize(newScreenHeight) {
        this.groundY = newScreenHeight - GAME_SETTINGS.GROUND_HEIGHT;

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, newScreenHeight);

        if (this.sky) {
            this.sky.clear();
            this.sky.fillGradientStyle(0x6b8cff, 0x6b8cff, 0xafc1ff, 0xafc1ff, 1);
            this.sky.fillRect(0, 0, this.worldWidth, newScreenHeight);
        }

        if (this.ground) {
            this.ground.y = this.groundY;
        }

        // Đã bỏ cập nhật vị trí cây

        // Cập nhật vị trí ngựa theo Ground Y mới
        if (this.scene.players) {
            // Sử dụng logic trừ offset tương tự như trong config
            this.scene.players.updateHorseY(this.groundY - 130);
        }
    }

    // Đã xóa drawTrees()

    launchFireworks() {
        // ... (Giữ nguyên code pháo hoa cũ)
        const cam = this.scene.cameras.main;
        let count = 0;
        if (this.fireworkTimer) this.fireworkTimer.remove();

        this.fireworkTimer = this.scene.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                const x = Phaser.Math.Between(cam.width * 0.2, cam.width * 0.8);
                const y = Phaser.Math.Between(cam.height * 0.1, this.groundY - 100);
                const color = Phaser.Utils.Array.GetRandom([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff]);

                const emitter = this.scene.add.particles(x, y, 'particle_pixel', {
                    speed: { min: 150, max: 350 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 2, end: 0 },
                    alpha: { start: 1, end: 0 },
                    gravityY: 150,
                    lifespan: { min: 800, max: 1200 },
                    quantity: 40,
                    tint: color,
                    blendMode: 'ADD',
                    emitting: false
                });

                emitter.setDepth(DEPTH.UI + 100).setScrollFactor(0);
                emitter.explode(40);
                this.activeFireworks.push(emitter);

                this.scene.time.delayedCall(2000, () => {
                    if (emitter && emitter.active) emitter.destroy();
                    const index = this.activeFireworks.indexOf(emitter);
                    if (index > -1) this.activeFireworks.splice(index, 1);
                });

                count++;
                if (count >= 15 && this.fireworkTimer) {
                    this.fireworkTimer.remove();
                    this.fireworkTimer = null;
                }
            }
        });
    }

    stopFireworks() {
        if (this.fireworkTimer) {
            this.fireworkTimer.remove();
            this.fireworkTimer = null;
        }
        if (this.activeFireworks.length > 0) {
            this.activeFireworks.forEach(emitter => {
                if (emitter && emitter.active) emitter.destroy();
            });
            this.activeFireworks = [];
        }
    }
}