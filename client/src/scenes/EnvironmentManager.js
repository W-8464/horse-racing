import { DEPTH, GAME_SETTINGS } from '../config/config.js';

export default class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.worldWidth = GAME_SETTINGS.WORLD_WIDTH;
        this.baseHeight = GAME_SETTINGS.DESIGN_HEIGHT;

        this.baseSkyHeight = 110;
        this.skyHeight = this.baseSkyHeight;

        this.worldHeight = this.baseHeight;

        this.grass = null;
        this.track = null;
        this.laneLines = null;
        this.sky = null;
        this.mist = null;
        this.mountains = null;

        this._cloudsCreated = false;
        this._lanternsCreated = false;
        this._checkLineXs = [];
        this._checkLineGraphics = [];
    }

    createPixelTextures() {
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

        if (!this.scene.textures.exists('dirtPixel')) {
            const dirtCanvas = this.scene.textures.createCanvas('dirtPixel', 64, 64);
            const dCtx = dirtCanvas.context;
            dCtx.fillStyle = '#8b5e3c';
            dCtx.fillRect(0, 0, 64, 64);
            const dirtColors = ['#a06e46', '#6d4528', '#784e30'];
            for (let i = 0; i < 150; i++) {
                dCtx.fillStyle = dirtColors[Math.floor(Math.random() * dirtColors.length)];
                const x = Math.floor(Math.random() * 64);
                const y = Math.floor(Math.random() * 64);
                const size = Math.random() > 0.5 ? 2 : 1;
                dCtx.fillRect(x, y, size, size);
            }
            dirtCanvas.refresh();
        }

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
    }

    setupWorld(initialWorldHeight) {
        const worldHeight = Math.max(this.baseHeight, initialWorldHeight || this.baseHeight);
        this.worldHeight = worldHeight;

        const extraHeight = Math.max(0, this.worldHeight - this.baseHeight);
        this.skyHeight = this.baseSkyHeight + (extraHeight * 0.5);

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Sky
        if (!this.sky) {
            this.sky = this.scene.add.graphics();
            this.sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xbfe9ff, 0xbfe9ff, 1);
            this.sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
        }

        // Clouds
        if (!this._cloudsCreated) {
            for (let i = 0; i < this.worldWidth; i += 300) {
                const cloudY = 20 + Math.random() * 40 + (extraHeight * 0.2);
                this.scene.add.image(i, cloudY, 'cloudPixel')
                    .setScale(1.5 + Math.random())
                    .setAlpha(0.5)
                    .setScrollFactor(0.15);
            }
            this._cloudsCreated = true;
        }

        // Grass
        if (!this.grass) {
            this.grass = this.scene.add.tileSprite(
                0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight, 'grassPixel'
            ).setOrigin(0).setDepth(DEPTH.GRASS);
        } else {
            this._resizeGrass();
        }

        // Mountains & Mist
        if (!this.mist) {
            this.drawMountains(this.worldWidth, this.skyHeight);
            // Mist vẽ ở đây với depth là DEPTH.GRASS + 0.1
            this.mist = this.drawHorizonMist(this.worldWidth);
        }

        // Track
        this._setupTrack();

        // Lanterns
        if (!this._lanternsCreated) {
            for (let x = 0; x < this.worldWidth; x += 350) {
                this.scene.add.image(x, -20, 'lantern')
                    .setOrigin(0.5, 0).setScale(0.25).setDepth(DEPTH.LANTERN);
            }
            this._lanternsCreated = true;
        }
    }

    _setupTrack() {
        const TOP_MARGIN = 20;
        const LANE_HEIGHT = 40;
        const MAX_LANES = 7;

        const trackStartY = this.skyHeight + TOP_MARGIN;
        const trackHeight = LANE_HEIGHT * MAX_LANES;

        if (!this.track) {
            this.track = this.scene.add.tileSprite(
                0, trackStartY, this.worldWidth, trackHeight, 'dirtPixel'
            ).setOrigin(0, 0);

            // [FIX LỖI MIST]: Đặt Depth của Track cao hơn Mist (Mist là GRASS + 0.1)
            // Để Track luôn đè lên sương mù, sương mù chỉ hiện ở khe hở 20px (TOP_MARGIN)
            this.track.setDepth(DEPTH.GRASS + 1);
        } else {
            this.track.y = trackStartY;
        }

        if (this.laneLines) {
            this.laneLines.destroy();
        }

        this.laneLines = this.scene.add.graphics();
        // Lane Lines cũng phải cao hơn Track
        this.laneLines.setDepth(DEPTH.GRASS + 2);

        this.laneLines.lineStyle(4, 0x5c4033, 1);
        this.laneLines.lineBetween(0, trackStartY, this.worldWidth, trackStartY);
        this.laneLines.lineBetween(0, trackStartY + trackHeight, this.worldWidth, trackStartY + trackHeight);

        this.laneLines.lineStyle(2, 0xffffff, 0.3);
        for (let i = 1; i < MAX_LANES; i++) {
            const y = trackStartY + (i * LANE_HEIGHT);
            this.laneLines.lineBetween(0, y, this.worldWidth, y);
        }
    }

    resize(nextWorldHeight) {
        const newHeight = Math.max(this.baseHeight, nextWorldHeight || this.baseHeight);
        if (newHeight === this.worldHeight) return;

        this.worldHeight = newHeight;

        const extraHeight = Math.max(0, this.worldHeight - this.baseHeight);
        const oldSkyHeight = this.skyHeight;
        this.skyHeight = this.baseSkyHeight + (extraHeight * 0.5);

        const deltaY = this.skyHeight - oldSkyHeight;

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        if (this.sky) {
            this.sky.clear();
            this.sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xbfe9ff, 0xbfe9ff, 1);
            this.sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
        }

        this._resizeGrass();

        if (this.track) {
            this.track.width = this.worldWidth;
            this._setupTrack();
        }

        if (this.mountains) {
            this.mountains.y += deltaY;
        }

        if (this.mist) {
            this.mist.clear();
            this.mist.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x73bd4d, 0x73bd4d, 0.8, 0.8, 0, 0);
            this.mist.fillRect(0, this.skyHeight, this.worldWidth, 36);
        }

        this._redrawCheckLines();
    }

    _resizeGrass() {
        if (!this.grass) return;
        this.grass.y = this.skyHeight;
        const h = this.worldHeight - this.skyHeight;
        this.grass.setSize(this.worldWidth, h);
        this.grass.setDisplaySize(this.worldWidth, h);
    }

    drawMountains(worldWidth, mountainBaseY) {
        this.mountains = this.scene.add.graphics();
        const pixelSize = 6;
        this.mountains.fillStyle(0x5a7e91, 0.6);

        for (let x = 0; x < worldWidth; x += 140) {
            const mHeight = 30 + Math.random() * 40;
            const mWidth = 100 + Math.random() * 60;
            for (let py = 0; py < mHeight; py += pixelSize) {
                const currentWidth = mWidth * (1 - py / mHeight);
                const startX = x + (mWidth - currentWidth) / 2;
                const drawX = Math.floor(startX / pixelSize) * pixelSize;
                const drawY = mountainBaseY - py - pixelSize;
                const drawW = Math.floor(currentWidth / pixelSize) * pixelSize;
                if (drawW > 0) this.mountains.fillRect(drawX, drawY, drawW, pixelSize);
            }
        }
        this.mountains.setScrollFactor(0.25).setDepth(DEPTH.GRASS - 1);
    }

    drawHorizonMist(worldWidth) {
        const mist = this.scene.add.graphics();
        mist.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x73bd4d, 0x73bd4d, 0.8, 0.8, 0, 0);
        mist.fillRect(0, this.skyHeight, worldWidth, 36);
        // Mist giữ nguyên depth thấp
        mist.setDepth(DEPTH.GRASS + 0.1).setScrollFactor(1);
        return mist;
    }

    drawCheckeredLine(xPosition) {
        this._checkLineXs.push(xPosition);
        const g = this._createCheckeredLineGraphics(xPosition);
        this._checkLineGraphics.push(g);
        return g;
    }

    _createCheckeredLineGraphics(xPosition) {
        const graphics = this.scene.add.graphics();
        const TOP_MARGIN = 20;
        const LANE_HEIGHT = 40;
        const MAX_LANES = 7;
        const startY = this.skyHeight + TOP_MARGIN;
        const endY = startY + (LANE_HEIGHT * MAX_LANES);
        const topWidth = 24;
        const bottomWidth = 36;
        const rows = MAX_LANES * 2;
        const totalHeight = endY - startY;
        const rowHeight = totalHeight / rows;

        for (let i = 0; i < rows; i++) {
            const y1 = startY + i * rowHeight;
            const y2 = startY + (i + 1) * rowHeight;
            const progress1 = i / rows;
            const progress2 = (i + 1) / rows;
            const w1 = Phaser.Math.Linear(topWidth, bottomWidth, progress1) / 2;
            const w2 = Phaser.Math.Linear(topWidth, bottomWidth, progress2) / 2;
            for (let col = 0; col < 2; col++) {
                const isWhite = (i + col) % 2 === 0;
                if (isWhite) graphics.fillStyle(0xffffff, 0.9);
                else graphics.fillStyle(0x000000, 0.35);
                let p1, p2, p3, p4;
                if (col === 0) {
                    p1 = { x: xPosition - w1, y: y1 };
                    p2 = { x: xPosition, y: y1 };
                    p3 = { x: xPosition, y: y2 };
                    p4 = { x: xPosition - w2, y: y2 };
                } else {
                    p1 = { x: xPosition, y: y1 };
                    p2 = { x: xPosition + w1, y: y1 };
                    p3 = { x: xPosition + w2, y: y2 };
                    p4 = { x: xPosition, y: y2 };
                }
                graphics.fillPoints([p1, p2, p3, p4], true);
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