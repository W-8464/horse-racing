import { DEPTH } from "../config/config.js";

export default class Tree extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);

        scene.add.existing(this);

        this.setOrigin(0.5, 1); // Gốc ở chân cây để dễ đặt lên mặt đất
        this.setScale(0.2);    // Tăng scale lên chút cho rõ (tuỳ chỉnh theo size ảnh gốc)
        this.setDepth(DEPTH.TREE);

        // Random thời gian bắt đầu để các cây không đung đưa cùng nhịp
        this.playSway();
    }

    playSway() {
        if (this.scene.anims.exists('tree_sway')) {
            this.play({ key: 'tree_sway', repeat: -1, startFrame: Phaser.Math.Between(0, 3) });
        }
    }
}