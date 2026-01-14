import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;

        this.worldWidth = GAME_SETTINGS.WORLD_WIDTH;

        // Giữ logic/physics cũ ổn định theo baseHeight
        this.baseHeight = GAME_SETTINGS.DESIGN_HEIGHT || 720;

        // Giữ skyHeight cố định (tránh phá layout/physics cũ)
        this.skyHeight = 180;

        // WorldHeight có thể nở theo viewport height (RESIZE)
        this.worldHeight = this.baseHeight;

        // refs để resize/update
        this.grass = null;
        this.sky = null;
        this.mist = null;

        this._cloudsCreated = false;
        this._lanternsCreated = false;

        this._checkLineXs = [];
        this._checkLineGraphics = [];
    }

    createPixelTextures() {
        // ✅ Guard tránh tạo lại
        if (!this.scene.textures.exists('grassPixel')) {
            const grassCanvas = this.scene.textures.createCanvas('grassPixel', 64, 64);
            const ctx = grassCanvas.context;
            ctx.fillStyle = '#73bd4d';
            ctx.fillRect(0, 0, 64, 64);
            const colors = ['#7bc655', '#6ab344', '#5da139', '#82c35e'];

            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.floor(Math.random() * 16) * 4;
                const y = Math.floor(Math.random() * 16) * 4;
                const size = Math.random() > 0.5 ? 4 : 8;
                ctx.fillRect(x, y, size, size);
            }
            grassCanvas.refresh();
        }

        if (!this.scene.textures.exists('cloudPixel')) {
            const cloudCanvas = this.scene.textures.createCanvas('cloudPixel', 64, 32);
            const cCtx = cloudCanvas.context;
            cCtx.fillStyle = '#ffffff';
            cCtx.fillRect(16, 0, 32, 16);
            cCtx.fillRect(0, 12, 64, 16);
            cCtx.fillStyle = '#def2ff';
            cCtx.fillRect(10, 24, 44, 4);
            cloudCanvas.refresh();
        }
    }

    setupWorld(initialWorldHeight) {
        const worldHeight = Math.max(this.baseHeight, initialWorldHeight || this.baseHeight);
        this.worldHeight = worldHeight;

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight);

        // Trời (vẽ 1 lần)
        if (!this.sky) {
            const sky = this.scene.add.graphics();
            sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xbfe9ff, 0xbfe9ff, 1);
            sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
            this.sky = sky;
        }

        // Mây (tạo 1 lần)
        if (!this._cloudsCreated) {
            for (let i = 0; i < this.worldWidth; i += 400) {
                this.scene.add.image(i, 40 + Math.random() * 60, 'cloudPixel')
                    .setScale(2 + Math.random())
                    .setAlpha(0.5)
                    .setScrollFactor(0.2);
            }
            this._cloudsCreated = true;
        }

        // Cỏ (update được chiều cao khi resize)
        if (!this.grass) {
            this.grass = this.scene.add.tileSprite(
                0,
                this.skyHeight,
                this.worldWidth,
                this.worldHeight - this.skyHeight,
                'grassPixel'
            )
                .setOrigin(0)
                .setDepth(DEPTH.GRASS);
        } else {
            this._resizeGrass();
        }

        // Đèn lồng (tạo 1 lần)
        if (!this._lanternsCreated) {
            for (let x = 0; x < this.worldWidth; x += 500) {
                this.scene.add.image(x, -20, 'lantern')
                    .setOrigin(0.5, 0)
                    .setScale(0.5)
                    .setDepth(DEPTH.LANTERN);
            }
            this._lanternsCreated = true;
        }

        // Núi + sương (tạo 1 lần)
        if (!this.mist) {
            this.drawMountains(this.worldWidth, this.skyHeight);
            this.mist = this.drawHorizonMist(this.worldWidth);
        }
    }

    resize(nextWorldHeight) {
        const newHeight = Math.max(this.baseHeight, nextWorldHeight || this.baseHeight);
        if (newHeight === this.worldHeight) return;

        this.worldHeight = newHeight;

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight);

        this._resizeGrass();
        this._redrawCheckLines();
    }

    _resizeGrass() {
        if (!this.grass) return;
        const h = this.worldHeight - this.skyHeight;
        this.grass.setSize(this.worldWidth, h);
        this.grass.setDisplaySize(this.worldWidth, h);
    }

    drawMountains(worldWidth, mountainBaseY) {
        const graphics = this.scene.add.graphics();
        const pixelSize = 8;
        graphics.fillStyle(0x5a7e91, 0.6);

        for (let x = 0; x < worldWidth; x += 160) {
            const mHeight = 40 + Math.random() * 60;
            const mWidth = 120 + Math.random() * 80;

            for (let py = 0; py < mHeight; py += pixelSize) {
                const currentWidth = mWidth * (1 - py / mHeight);
                const startX = x + (mWidth - currentWidth) / 2;
                const drawX = Math.floor(startX / pixelSize) * pixelSize;
                const drawY = mountainBaseY - py - pixelSize;
                const drawW = Math.floor(currentWidth / pixelSize) * pixelSize;

                if (drawW > 0) graphics.fillRect(drawX, drawY, drawW, pixelSize);
            }
        }
        graphics.setScrollFactor(0.3).setDepth(DEPTH.GRASS - 1);
    }

    drawHorizonMist(worldWidth) {
        const mist = this.scene.add.graphics();
        mist.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x73bd4d, 0x73bd4d, 0, 0, 0.8, 0.8);
        mist.fillRect(0, 160, worldWidth, 40);
        mist.setDepth(DEPTH.GRASS - 0.5).setScrollFactor(1);
    }

    drawCheckeredLine(xPosition) {
        this._checkLineXs.push(xPosition);

        const g = this._createCheckeredLineGraphics(xPosition);
        this._checkLineGraphics.push(g);
        return g;
    }

    _createCheckeredLineGraphics(xPosition) {
        const tileSize = 40;
        const cols = 2;
        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRect(xPosition + (cols * tileSize), this.skyHeight, 10, this.worldHeight - this.skyHeight);

        for (let y = this.skyHeight; y < this.worldHeight; y += tileSize) {
            for (let x = 0; x < cols; x++) {
                const isWhite = ((x + Math.floor((y - this.skyHeight) / tileSize))) % 2 === 0;
                graphics.fillStyle(isWhite ? 0xffffff : 0x333333, 1);
                graphics.fillRect(xPosition + (x * tileSize), y, tileSize, tileSize);
            }
        }

        graphics.setDepth(DEPTH.CHECK_LINE);
        return graphics;
    }

    _redrawCheckLines() {
        this._checkLineGraphics.forEach(g => g.destroy());
        this._checkLineGraphics = [];
        this._checkLineXs.forEach(x => {
            this._checkLineGraphics.push(this._createCheckeredLineGraphics(x));
        });
    }
}