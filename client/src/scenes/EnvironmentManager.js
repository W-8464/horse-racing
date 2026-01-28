import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.worldWidth = GAME_SETTINGS.WORLD_WIDTH;
        this.baseHeight = GAME_SETTINGS.DESIGN_HEIGHT;
        this.skyHeight = 110;
        this.worldHeight = this.baseHeight;

        this.grass = null;
        this.sky = null;
        this.mist = null;

        this._texturesCreated = false;
        this._staticObjectsCreated = false;

        // Mảng chứa các emitter pháo hoa đang hoạt động để quản lý/xóa
        this.activeFireworks = [];
        this.fireworkTimer = null;
    }

    createPixelTextures() {
        if (this._texturesCreated) return;

        // 1. Texture Cỏ
        if (!this.scene.textures.exists('grassPixel')) {
            const grassCanvas = this.scene.textures.createCanvas('grassPixel', 64, 128);
            const ctx = grassCanvas.context;
            const grd = ctx.createLinearGradient(0, 0, 0, 128);
            grd.addColorStop(0, '#5da139');
            grd.addColorStop(1, '#73bd4d');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 64, 128);

            const colors = ['#7bc655', '#6ab344', '#82c35e'];
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.floor(Math.random() * 64);
                const y = Math.floor(Math.random() * 128);
                const size = y > 64 ? 3 : 1;
                ctx.fillRect(x, y, size, size);
            }
            grassCanvas.refresh();
        }

        // 2. Texture Mây
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

        // 3. Texture Hạt Pháo Hoa (Chấm trắng)
        if (!this.scene.textures.exists('particle_pixel')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 4, 4);
            graphics.generateTexture('particle_pixel', 4, 4);
            graphics.destroy();
        }

        this._texturesCreated = true;
    }

    setupWorld(initialWorldHeight) {
        const worldHeight = Math.max(this.baseHeight, initialWorldHeight || this.baseHeight);
        this.worldHeight = worldHeight;

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight);

        // Vẽ Bầu trời
        if (!this.sky) {
            const sky = this.scene.add.graphics();
            sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xbfe9ff, 0xbfe9ff, 1);
            sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
            this.sky = sky;
        }

        // Vẽ Cỏ
        if (!this.grass) {
            this.grass = this.scene.add.tileSprite(
                0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight, 'grassPixel'
            ).setOrigin(0).setDepth(DEPTH.GRASS);
        } else {
            this._resizeGrass();
        }

        // Vẽ Núi và Sương mù
        if (!this.mist) {
            this.drawMountains(this.worldWidth, this.skyHeight);
            this.mist = this.drawHorizonMist(this.worldWidth);
        }

        // Tạo object tĩnh (Mây, Đèn lồng)
        if (!this._staticObjectsCreated) {
            for (let i = 0; i < this.worldWidth; i += 300) {
                this.scene.add.image(i, 20 + Math.random() * 40, 'cloudPixel')
                    .setScale(1.5 + Math.random())
                    .setAlpha(0.5)
                    .setScrollFactor(0.15);
            }
            for (let x = 0; x < this.worldWidth; x += 350) {
                this.scene.add.image(x, -20, 'lantern')
                    .setOrigin(0.5, 0)
                    .setScale(0.35)
                    .setDepth(DEPTH.LANTERN);
            }
            this._staticObjectsCreated = true;
        }

        // ĐÃ XÓA: this.drawCheckeredLine(...) - Không hiển thị vạch đích nữa
    }

    resize(nextWorldHeight) {
        const newHeight = Math.max(this.baseHeight, nextWorldHeight || this.baseHeight);
        if (newHeight === this.worldHeight) return;

        this.worldHeight = newHeight;
        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight);
        this._resizeGrass();
    }

    _resizeGrass() {
        if (!this.grass) return;
        const h = this.worldHeight - this.skyHeight;
        this.grass.setSize(this.worldWidth, h);
        this.grass.setDisplaySize(this.worldWidth, h);
    }

    drawMountains(worldWidth, mountainBaseY) {
        const graphics = this.scene.add.graphics();
        const pixelSize = 6;
        graphics.fillStyle(0x5a7e91, 0.6);

        for (let x = 0; x < worldWidth; x += 140) {
            const mHeight = 30 + Math.random() * 40;
            const mWidth = 100 + Math.random() * 60;

            for (let py = 0; py < mHeight; py += pixelSize) {
                const currentWidth = mWidth * (1 - py / mHeight);
                const startX = x + (mWidth - currentWidth) / 2;
                const drawX = Math.floor(startX / pixelSize) * pixelSize;
                const drawY = mountainBaseY - py - pixelSize;
                const drawW = Math.floor(currentWidth / pixelSize) * pixelSize;
                if (drawW > 0) graphics.fillRect(drawX, drawY, drawW, pixelSize);
            }
        }
        graphics.setScrollFactor(0.25).setDepth(DEPTH.GRASS - 1);
    }

    drawHorizonMist(worldWidth) {
        const mist = this.scene.add.graphics();
        mist.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x73bd4d, 0x73bd4d, 0.8, 0.8, 0, 0);
        mist.fillRect(0, this.skyHeight, worldWidth, 80);
        mist.setDepth(DEPTH.GRASS + 0.1).setScrollFactor(1);
        return mist;
    }

    launchFireworks() {
        const cam = this.scene.cameras.main;
        let count = 0;

        // Dừng timer cũ nếu có
        if (this.fireworkTimer) this.fireworkTimer.remove();

        this.fireworkTimer = this.scene.time.addEvent({
            delay: 400, // Mỗi 0.4s bắn 1 quả
            loop: true,
            callback: () => {
                // 1. Random vị trí và màu sắc
                const x = Phaser.Math.Between(cam.width * 0.2, cam.width * 0.8);
                const y = Phaser.Math.Between(cam.height * 0.2, cam.height * 0.5);
                const color = Phaser.Utils.Array.GetRandom([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff]);

                // 2. Tạo Emitter MỚI cho mỗi quả (Syntax mới của Phaser 3.60)
                // this.scene.add.particles(x, y, texture, config)
                const emitter = this.scene.add.particles(x, y, 'particle_pixel', {
                    speed: { min: 150, max: 350 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 2, end: 0 },
                    alpha: { start: 1, end: 0 },
                    gravityY: 150,
                    lifespan: { min: 800, max: 1200 },
                    quantity: 40,
                    tint: color,    // Set màu trực tiếp trong config
                    blendMode: 'ADD',
                    emitting: false // Không tự bắn liên tục
                });

                // Set depth cao nhất
                emitter.setDepth(DEPTH.UI + 100).setScrollFactor(0);

                // 3. Kích hoạt nổ 1 lần
                emitter.explode(40);

                // 4. Lưu vào mảng để quản lý (nếu cần xóa gấp)
                this.activeFireworks.push(emitter);

                // 5. Tự hủy sau khi hạt bay hết (2 giây là an toàn)
                this.scene.time.delayedCall(2000, () => {
                    if (emitter && emitter.active) {
                        emitter.destroy();
                    }
                    // Xóa khỏi mảng activeFireworks
                    const index = this.activeFireworks.indexOf(emitter);
                    if (index > -1) this.activeFireworks.splice(index, 1);
                });

                // Dừng bắn sau 15 quả
                count++;
                if (count >= 15 && this.fireworkTimer) {
                    this.fireworkTimer.remove();
                    this.fireworkTimer = null;
                }
            }
        });
    }

    stopFireworks() {
        // Dừng bộ đếm bắn
        if (this.fireworkTimer) {
            this.fireworkTimer.remove();
            this.fireworkTimer = null;
        }

        // Hủy tất cả emitter đang hoạt động ngay lập tức
        if (this.activeFireworks.length > 0) {
            this.activeFireworks.forEach(emitter => {
                if (emitter && emitter.active) emitter.destroy();
            });
            this.activeFireworks = [];
        }
    }
}