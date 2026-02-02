export default class FireworksManager {
    constructor(scene) {
        this.scene = scene;
        this.isRunning = false;
        this.timerEvent = null;
    }

    createTexture() {
        // Tạo texture 1 chấm trắng nhỏ để làm hạt pháo hoa
        if (!this.scene.textures.exists('particle_dot')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 4, 4);
            graphics.generateTexture('particle_dot', 4, 4);
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.createTexture();

        // Tạo vòng lặp bắn pháo hoa mỗi 0.8 giây
        this.timerEvent = this.scene.time.addEvent({
            delay: 800,
            callback: this.launchFirework,
            callbackScope: this,
            loop: true
        });

        // Bắn ngay 1 quả đầu tiên
        this.launchFirework();
    }

    stop() {
        this.isRunning = false;
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
    }

    launchFirework() {
        if (!this.scene) return;

        const { width, height } = this.scene.scale;

        // Vị trí ngẫu nhiên trên bầu trời
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(50, height / 2); // Chỉ nổ ở nửa trên màn hình

        // Màu ngẫu nhiên rực rỡ
        const colors = [0xff0000, 0x00ff00, 0xffff00, 0x00ffff, 0xff00ff, 0xffa500];
        const color = Phaser.Utils.Array.GetRandom(colors);

        const emitter = this.scene.add.particles(x, y, 'particle_dot', {
            speed: { min: 150, max: 350 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: 150,
            quantity: 40,
            tint: color,
            emitting: false
        });

        // Set depth cao để đè lên mọi thứ (kể cả UI Victory nếu muốn)
        // Hoặc thấp hơn UI một chút (DEPTH.UI - 1) tuỳ bạn
        emitter.setDepth(2001);

        emitter.explode(40);

        // Tự huỷ sau khi nổ xong
        this.scene.time.delayedCall(1500, () => {
            emitter.destroy();
        });
    }
}