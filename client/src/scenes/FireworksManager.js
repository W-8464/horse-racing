export default class FireworksManager {
    constructor(scene) {
        this.scene = scene;
        this.isRunning = false;
        this.timerEvent = null;
    }

    createTexture() {
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

        this.timerEvent = this.scene.time.addEvent({
            delay: 800,
            callback: this.launchFirework,
            callbackScope: this,
            loop: true
        });

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

        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(50, height / 2);

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

        emitter.setScrollFactor(0);

        emitter.setDepth(30001);

        emitter.explode(40);

        this.scene.time.delayedCall(1500, () => {
            emitter.destroy();
        });
    }
}