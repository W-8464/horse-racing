import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
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

    setupWorld() {
        const worldWidth = GAME_SETTINGS.WORLD_WIDTH;
        const skyHeight = 180;
        const groundHeight = 540;

        this.scene.cameras.main.setBounds(0, 0, worldWidth, 720);
        this.scene.physics.world.setBounds(0, skyHeight, worldWidth, groundHeight);

        // Trời
        const sky = this.scene.add.graphics();
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xbfe9ff, 0xbfe9ff, 1);
        sky.fillRect(0, 0, worldWidth, skyHeight);

        // Mây
        for (let i = 0; i < worldWidth; i += 400) {
            this.scene.add.image(i, 40 + Math.random() * 60, 'cloudPixel')
                .setScale(2 + Math.random())
                .setAlpha(0.5)
                .setScrollFactor(0.2);
        }

        // Cỏ
        this.scene.add.tileSprite(0, skyHeight, worldWidth, groundHeight, 'grassPixel')
            .setOrigin(0)
            .setDepth(DEPTH.GRASS);

        // Đèn lồng
        for (let x = 0; x < worldWidth; x += 500) {
            this.scene.add.image(x, -20, 'lantern')
                .setOrigin(0.5, 0)
                .setScale(0.5)
                .setDepth(DEPTH.LANTERN);
        }

        this.drawMountains(worldWidth, skyHeight);
        this.drawHorizonMist(worldWidth);
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
        const skyHeight = 180;
        const tileSize = 40;
        const cols = 2;
        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRect(xPosition + (cols * tileSize), skyHeight, 10, 720 - skyHeight);

        for (let y = skyHeight; y < 720; y += tileSize) {
            for (let x = 0; x < cols; x++) {
                const isWhite = ((x + Math.floor((y - skyHeight) / tileSize))) % 2 === 0;
                graphics.fillStyle(isWhite ? 0xffffff : 0x333333, 1);
                graphics.fillRect(xPosition + (x * tileSize), y, tileSize, tileSize);
            }
        }
        graphics.setDepth(DEPTH.CHECK_LINE);
    }
}