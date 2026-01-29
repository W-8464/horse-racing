import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.worldWidth = this.scene.scale.width;

        this.groundY = GAME_SETTINGS.GROUND_Y;

        this.ground = null;
        this.sky = null;

        this.clouds = [];
        this.lanterns = [];

        this._texturesCreated = false;

        this.activeFireworks = [];
        this.fireworkTimer = null;
    }

    createPixelTextures() {
        if (this._texturesCreated) return;

        if (!this.scene.textures.exists('groundBlock')) {
            const size = 32;
            const canvas = this.scene.textures.createCanvas('groundBlock', size, size);
            const ctx = canvas.context;
            ctx.fillStyle = '#8B4513'; ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#A0522D';
            for (let i = 0; i < 10; i++) { ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
            ctx.fillStyle = '#5da139'; ctx.fillRect(0, 0, size, 8);
            for (let i = 0; i < size; i += 4) { if (Math.random() > 0.5) ctx.fillRect(i, 8, 4, 3); }
            canvas.refresh();
        }
        if (!this.scene.textures.exists('cloudPixel')) {
            const c = this.scene.textures.createCanvas('cloudPixel', 48, 24);
            const ctx = c.context;
            ctx.fillStyle = '#fff'; ctx.fillRect(12, 0, 24, 12); ctx.fillRect(0, 9, 48, 12);
            ctx.fillStyle = '#def2ff'; ctx.fillRect(8, 18, 32, 3);
            c.refresh();
        }
        if (!this.scene.textures.exists('particle_pixel')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4);
            g.generateTexture('particle_pixel', 4, 4);
            g.destroy();
        }

        this._texturesCreated = true;
    }

    setupWorld(screenHeight) {
        // Cập nhật lại kích thước theo màn hình thực tế
        this.worldWidth = this.scene.scale.width;
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
        } else {
            this.ground.width = this.worldWidth;
            this.ground.y = this.groundY;
        }

        // 3. VẼ TRANG TRÍ (Mây, Đèn lồng) - Gọi hàm riêng để tái sử dụng khi resize
        this.createDecorations(screenHeight);
    }

    createDecorations(screenHeight) {
        this.clouds.forEach(c => c.destroy());
        this.clouds = [];

        this.lanterns.forEach(l => l.destroy());
        this.lanterns = [];

        // Vẽ Mây
        const cloudCount = Math.ceil(this.worldWidth / 200);
        for (let i = 0; i < cloudCount; i++) {
            const x = Math.random() * this.worldWidth;
            const y = Math.random() * (screenHeight * 0.4);
            const cloud = this.scene.add.image(x, y, 'cloudPixel')
                .setScale(2 + Math.random())
                .setAlpha(0.9)
                .setDepth(DEPTH.CLOUD);
            this.clouds.push(cloud);
        }

        // Vẽ Đèn lồng (Dùng công thức của bạn)
        const lanternCount = Math.ceil(this.worldWidth / 400) - 0.9;
        for (let i = 0; i < lanternCount; i++) {
            const x = (this.worldWidth / lanternCount) * i + 50;
            const lantern = this.scene.add.image(x, -10, 'lantern')
                .setOrigin(0.5, 0)
                .setScale(0.4)
                .setDepth(DEPTH.LANTERN);
            this.lanterns.push(lantern);
        }
    }

    resize(newScreenHeight) {
        const newWidth = this.scene.scale.width;
        this.worldWidth = newWidth;
        this.groundY = newScreenHeight - GAME_SETTINGS.GROUND_HEIGHT;

        // 1. Update Camera
        this.scene.cameras.main.setBounds(0, 0, newWidth, newScreenHeight);

        // 2. Update Bầu trời
        if (this.sky) {
            this.sky.clear();
            this.sky.fillGradientStyle(0x6b8cff, 0x6b8cff, 0xafc1ff, 0xafc1ff, 1);
            this.sky.fillRect(0, 0, newWidth, newScreenHeight);
        }

        // 3. Update Đất
        if (this.ground) {
            this.ground.y = this.groundY;
            this.ground.width = newWidth;
        }

        this.createDecorations(newScreenHeight);

        if (this.scene.players) {
            this.scene.players.updateHorseY(this.groundY - 130);
        }
    }

    launchFireworks() {
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