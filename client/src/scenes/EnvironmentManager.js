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

        // Thay núi bằng các thành phần mới
        this.cityParams = null; // Lưu vị trí nhà để vẽ lại khi resize
        this.grandstands = null; // Group chứa khán đài và người

        this._cloudsCreated = false;
        this._spectatorsCreated = false; // Cờ kiểm tra texture khán giả
        this._checkLineXs = [];
        this._checkLineGraphics = [];
    }

    createPixelTextures() {
        // ... (Giữ nguyên grassPixel, dirtPixel, cloudPixel cũ) ...
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

        // --- MỚI: Tạo Texture Khán giả (Pixel Art đơn giản) ---
        if (!this._spectatorsCreated) {
            const spectatorColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0xffffff, 0x2ecc71];
            // Tạo 6 biến thể người khác nhau
            spectatorColors.forEach((color, index) => {
                const key = `spectatorPixel_${index}`;
                if (!this.scene.textures.exists(key)) {
                    const sCanvas = this.scene.textures.createCanvas(key, 14, 20); // Kích thước nhỏ
                    const sCtx = sCanvas.context;

                    // Đầu (màu da)
                    sCtx.fillStyle = '#ffccaa';
                    sCtx.fillRect(3, 0, 8, 8);

                    // Tóc (Đen hoặc Nâu)
                    sCtx.fillStyle = Math.random() > 0.5 ? '#000000' : '#5c4033';
                    sCtx.fillRect(3, 0, 8, 3);
                    sCtx.fillRect(2, 2, 2, 4); // tóc mai

                    // Thân (Áo)
                    sCtx.fillStyle = '#' + color.toString(16).padStart(6, '0');
                    sCtx.fillRect(1, 8, 12, 10);

                    // Tay
                    sCtx.fillStyle = '#ffccaa';
                    if (Math.random() > 0.5) {
                        // Giơ tay lên
                        sCtx.fillRect(0, 5, 2, 4);
                        sCtx.fillRect(12, 5, 2, 4);
                    } else {
                        // Tay buông xuôi
                        sCtx.fillRect(1, 10, 2, 5);
                        sCtx.fillRect(11, 10, 2, 5);
                    }

                    sCanvas.refresh();
                }
            });
            this._spectatorsCreated = true;
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
            this.sky.fillGradientStyle(0x5ca0eb, 0x5ca0eb, 0xbfe9ff, 0xbfe9ff, 1); // Chỉnh màu trời xanh hơn chút giống ảnh
            this.sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
        }

        // Clouds
        if (!this._cloudsCreated) {
            for (let i = 0; i < this.worldWidth; i += 300) {
                const cloudY = 20 + Math.random() * 40 + (extraHeight * 0.2);
                this.scene.add.image(i, cloudY, 'cloudPixel')
                    .setScale(1.5 + Math.random())
                    .setAlpha(0.8)
                    .setScrollFactor(0.15);
            }
            this._cloudsCreated = true;
        }

        // Grass Background (Lớp cỏ nền phía sau cùng nếu cần, nhưng track sẽ che hết)
        if (!this.grass) {
            this.grass = this.scene.add.tileSprite(
                0, this.skyHeight, this.worldWidth, this.worldHeight - this.skyHeight, 'grassPixel'
            ).setOrigin(0).setDepth(DEPTH.GRASS);
        } else {
            this._resizeGrass();
        }

        // --- THAY THẾ NÚI BẰNG THÀNH PHỐ VÀ KHÁN ĐÀI ---
        this.drawCityBackground(this.worldWidth, this.skyHeight);
        this.drawGrandstands(this.worldWidth, this.skyHeight);

        // Track
        this._setupTrack();
    }

    // --- MỚI: Vẽ Thành phố phía xa ---
    drawCityBackground(worldWidth, horizonY) {
        if (this.cityGraphics) this.cityGraphics.destroy();
        this.cityGraphics = this.scene.add.graphics();

        // Depth thấp hơn khán đài (Grass - 2)
        this.cityGraphics.setDepth(DEPTH.GRASS - 2);
        this.cityGraphics.setScrollFactor(0.1); // Di chuyển chậm

        // Màu xám trắng
        const cityColors = [0xd0d0d0, 0xe0e0e0, 0xc0c0c0, 0xf5f5f5];

        // Sinh ngẫu nhiên hoặc dùng params đã lưu để không bị đổi khi resize
        if (!this.cityParams) {
            this.cityParams = [];
            for (let x = -100; x < worldWidth + 100; x += 40) {
                this.cityParams.push({
                    x: x,
                    w: 30 + Math.random() * 40,
                    h: 50 + Math.random() * 80, // Chiều cao tòa nhà
                    c: cityColors[Math.floor(Math.random() * cityColors.length)]
                });
            }
        }

        this.cityParams.forEach(b => {
            this.cityGraphics.fillStyle(b.c, 1);
            // Vẽ từ đường chân trời đi lên
            this.cityGraphics.fillRect(b.x, horizonY - b.h, b.w, b.h);

            // Vẽ cửa sổ chấm chấm
            this.cityGraphics.fillStyle(0xa0a0a0, 0.5);
            for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 8) {
                for (let wy = horizonY - b.h + 5; wy < horizonY - 10; wy += 12) {
                    if (Math.random() > 0.3) this.cityGraphics.fillRect(wx, wy, 4, 6);
                }
            }
        });
    }

    drawGrandstands(worldWidth, horizonY) {
        // Xóa group cũ nếu có
        if (this.grandstandContainer) {
            this.grandstandContainer.destroy();
        }

        // Dùng Container để gom nhóm
        this.grandstandContainer = this.scene.add.container(0, 0);
        this.grandstandContainer.setDepth(DEPTH.GRASS - 1);

        // --- SỬA Ở ĐÂY: Đổi từ 0.25 thành 1 ---
        // 1 nghĩa là di chuyển 1:1 theo Camera (cùng tốc độ với đường chạy)
        this.grandstandContainer.setScrollFactor(1);

        const sectionWidth = 320;
        const gapWidth = 40;
        const startY = horizonY;

        const standHeight = 80;
        const stepHeight = 10;
        const steps = 2;

        // Biến đếm để xác định nội dung chữ
        let sectionIndex = 0;

        for (let x = 20; x < worldWidth; x += (sectionWidth + gapWidth)) {

            // 1. Vẽ Biển Quảng Cáo (Vẽ trước tiên để nằm sau cùng)
            const boardW = sectionWidth - 40;
            const boardH = 50;
            const boardX = x + 20;
            const boardY = startY - standHeight - boardH + 50;

            const board = this.scene.add.graphics();
            // Chân biển
            board.lineStyle(4, 0x888888);
            board.lineBetween(boardX + 20, boardY + boardH, boardX + 20, startY);
            board.lineBetween(boardX + boardW - 20, boardY + boardH, boardX + boardW - 20, startY);
            // Khung biển
            board.fillStyle(0xffffff);
            board.fillRect(boardX, boardY, boardW, boardH);
            board.lineStyle(2, 0x333333);
            board.strokeRect(boardX, boardY, boardW, boardH);
            // Nội dung nền biển
            board.fillStyle(0x87CEEB);
            board.fillRect(boardX + 4, boardY + 4, boardW - 8, boardH - 8);

            this.grandstandContainer.add(board);

            // Thêm chữ vào biển quảng cáo
            const textContent = sectionIndex % 2 === 0 ? "CBD" : "VANTIVA";

            // Tính vị trí giữa biển
            const textX = boardX + boardW / 2;
            const textY = boardY + boardH / 2;

            const boardText = this.scene.add.text(textX, textY, textContent, {
                fontSize: '28px',
                fontFamily: 'Arial Black, Arial, sans-serif',
                color: '#333333',
                align: 'center',
                resolution: 1
            });
            boardText.setOrigin(0.5);
            this.grandstandContainer.add(boardText);

            // 2. Chuẩn bị đối tượng vẽ Ghế Gỗ
            const stand = this.scene.add.graphics();
            this.grandstandContainer.add(stand);

            // Vẽ tường chắn 2 bên hông
            stand.fillStyle(0x5c4033);
            stand.fillRect(x - 5, startY - (steps * stepHeight), 5, steps * stepHeight);
            stand.fillRect(x + sectionWidth, startY - (steps * stepHeight), 5, steps * stepHeight);

            // 3. Vòng lặp vẽ bậc ghế và đặt người (Từ cao xuống thấp)
            for (let i = steps - 1; i >= 0; i--) {
                const color = i % 2 === 0 ? 0x8b4513 : 0xa0522d;
                const currentY = startY - ((i + 1) * stepHeight);

                // Vẽ bậc ghế
                stand.fillStyle(color);
                stand.fillRect(x, currentY, sectionWidth, stepHeight);

                // Bóng đổ nhẹ
                stand.fillStyle(0x000000, 0.2);
                stand.fillRect(x, currentY, sectionWidth, 2);

                // Đặt Người (Khán giả)
                const peopleCount = Math.floor(Math.random() * 8) + 3;
                for (let p = 0; p < peopleCount; p++) {
                    const px = x + Math.random() * (sectionWidth - 20) + 10;
                    // Chỉnh toạ độ Y: +5 để chân người thấp hơn mép ghế một chút
                    const py = currentY + 5;

                    const skinId = Math.floor(Math.random() * 6);
                    const spectator = this.scene.add.image(px, py, `spectatorPixel_${skinId}`);
                    spectator.setOrigin(0.5, 1); // Neo ở chân
                    this.grandstandContainer.add(spectator);
                }
            }

            // Tăng biến đếm sau mỗi khu vực khán đài
            sectionIndex++;
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

            // Track đè lên phần chân của khán đài nếu có
            this.track.setDepth(DEPTH.GRASS + 1);
        } else {
            this.track.y = trackStartY;
        }

        if (this.laneLines) {
            this.laneLines.destroy();
        }

        this.laneLines = this.scene.add.graphics();
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

        this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        if (this.sky) {
            this.sky.clear();
            this.sky.fillGradientStyle(0x5ca0eb, 0x5ca0eb, 0xbfe9ff, 0xbfe9ff, 1);
            this.sky.fillRect(0, 0, this.worldWidth, this.skyHeight);
        }

        this._resizeGrass();

        if (this.track) {
            this.track.width = this.worldWidth;
            this._setupTrack();
        }

        // Vẽ lại thành phố và khán đài tại độ cao mới
        this.drawCityBackground(this.worldWidth, this.skyHeight);
        this.drawGrandstands(this.worldWidth, this.skyHeight);

        this._redrawCheckLines();
    }

    _resizeGrass() {
        if (!this.grass) return;
        this.grass.y = this.skyHeight;
        const h = this.worldHeight - this.skyHeight;
        this.grass.setSize(this.worldWidth, h);
        this.grass.setDisplaySize(this.worldWidth, h);
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