import Horse from '../entities/Horse.js';
import { DEPTH } from '../config/config.js';

export default class PlayerManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.horse = null;
        this.otherPlayers = null;
    }

    init() {
        this.otherPlayers = this.scene.physics.add.group();
    }

    getVisualY(serverY) {
        const BASE_SKY_HEIGHT = 110;
        const currentSkyHeight = this.scene.env ? this.scene.env.skyHeight : BASE_SKY_HEIGHT;
        const offset = currentSkyHeight - BASE_SKY_HEIGHT;

        if (Math.abs(offset) < 5) {
            return serverY;
        }

        return serverY + offset;
    }

    syncCurrentPlayers(players, myId) {
        Object.keys(players).forEach((id) => {
            if (id === myId) this.addSelf(players[id]);
            else this.addOther(players[id], myId);
        });
    }

    addSelf(playerInfo) {
        if (!playerInfo) return;

        const visualY = this.getVisualY(playerInfo.y);

        if (this.horse) {
            this.horse.y = visualY;
            this.horse.serverIndex = playerInfo.serverIndex;
            // Cập nhật lại baseServerY nếu có thay đổi
            this.horse.baseServerY = playerInfo.y;
            this.horse.setDepth(visualY);

            if (this.horse.nameText) {
                this.horse.nameText.setDepth(visualY + 10000);
            }
            return;
        }

        this.horse = new Horse(
            this.scene,
            playerInfo.x,
            visualY,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name,
            true
        );

        // [FIX] Lưu vị trí gốc của server vào instance ngựa
        this.horse.baseServerY = playerInfo.y;

        this.horse.setDepth(DEPTH.HORSE);

        if (this.horse.playIdle) this.horse.playIdle();
        else this.horse.play('horse_idle');

        this.scene.cameras.main.startFollow(this.horse, true, 0.1, 0.1);
    }

    addOther(playerInfo, myId) {
        if (!playerInfo) return;
        if (playerInfo.id === myId) return;

        const visualY = this.getVisualY(playerInfo.y);

        const existing = this.otherPlayers.getChildren().find(p => p.playerId === playerInfo.id);
        if (existing) {
            existing.serverIndex = playerInfo.serverIndex;
            // [FIX] Cập nhật baseServerY
            existing.baseServerY = playerInfo.y;

            if (Math.abs(existing.y - visualY) > 1) {
                existing.y = visualY;
                existing.setDepth(visualY);
            }
            return;
        }

        const other = new Horse(
            this.scene,
            playerInfo.x,
            visualY,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name,
            false
        );

        // [FIX] Lưu vị trí gốc của server
        other.baseServerY = playerInfo.y;
        other.serverIndex = playerInfo.serverIndex;
        other.setDepth(visualY);

        if (other.playIdle) other.playIdle();
        else other.play('horse_idle');

        this.otherPlayers.add(other);
    }

    updateAllPositions(networkManager) {
        const state = networkManager.getInterpolatedState();
        if (!state) return;

        const { b0, b1, renderTime } = state;
        const total = b1.ts - b0.ts;
        if (total <= 0) return;

        const interpolationFactor = (renderTime - b0.ts) / total;

        this.otherPlayers.getChildren().forEach(horse => {
            const idx = horse.serverIndex;
            // Lưu ý: Server chỉ gửi X cập nhật liên tục, còn Y thường cố định.
            // Tuy nhiên, nếu server gửi cả Y (trong snapshot), ta vẫn phải convert qua VisualY
            const x0 = b0.p[idx];
            const x1 = b1.p[idx];

            if (x0 !== undefined && x1 !== undefined) {
                const newX = x0 + (x1 - x0) * interpolationFactor;
                if (Math.abs(horse.x - newX) > 0.1) {
                    horse.x = newX;
                    if (horse.requestRun) horse.requestRun(1);
                    else if (horse.playRun) horse.playRun();
                }
            }

            // Đảm bảo Y luôn đúng (đề phòng resize trình duyệt giữa chừng)
            // Lấy lại Y gốc từ server data (hoặc giữ nguyên Y hiện tại nếu server không gửi Y trong tick)
            // Ở đây ta giả định Y không đổi trong race, nhưng cần update VisualOffset nếu Host resize
            // Cách đơn giản nhất: Lấy Y hiện tại trừ offset cũ cộng offset mới...
            // NHƯNG: Để đơn giản, ta chỉ cần set lại Y đúng trong addSelf/addOther hoặc khi resize.
            // Nếu bạn muốn realtime resize:
            // horse.y = this.getVisualY(ORIGINAL_SERVER_Y); -> Cần lưu serverY gốc vào object horse
        });

        if (this.state.role === 'host' && this.horse) {
            const idx = this.horse.serverIndex;
            const x0 = b0.p[idx];
            const x1 = b1.p[idx];
            if (x0 !== undefined && x1 !== undefined) {
                this.horse.x = x0 + (x1 - x0) * interpolationFactor;
            }
        }
    }

    refreshHorseYPositions() {
        // 1. Cập nhật ngựa của mình
        if (this.horse && this.horse.baseServerY !== undefined) {
            const newY = this.getVisualY(this.horse.baseServerY);
            this.horse.y = newY;
            this.horse.setDepth(newY);
        }

        // 2. Cập nhật ngựa người khác
        this.otherPlayers.getChildren().forEach(horse => {
            if (horse.baseServerY !== undefined) {
                const newY = this.getVisualY(horse.baseServerY);
                horse.y = newY;
                horse.setDepth(newY);
            }
        });
    }

    removeOther(playerId) {
        const p = this.otherPlayers.getChildren().find(x => x.playerId === playerId);
        if (p) p.destroy();
    }

    resetPositionsFromServer(players, myId) {
        if (this.horse && players[myId]) {
            this.horse.x = players[myId].x;
            const visualY = this.getVisualY(players[myId].y);
            this.horse.y = visualY;
            this.horse.setDepth(visualY);

            if (this.horse.resetColor) this.horse.resetColor();
        }

        this.otherPlayers.getChildren().forEach(p => {
            const info = players[p.playerId];
            if (info) {
                const visualY = this.getVisualY(info.y);
                p.setPosition(info.x, visualY);
                p.setDepth(visualY);
            }
        });
    }

    moveSelfBy(dx) {
        if (!this.horse) return;
        this.horse.x += dx;
        if (this.horse.requestRun) this.horse.requestRun(1);
        else if (this.horse.playRun) this.horse.playRun();
    }

    getLeaderFromOthers() {
        let leader = null;
        let maxX = -Infinity;

        this.otherPlayers.getChildren().forEach(h => {
            if (h.x > maxX) {
                maxX = h.x;
                leader = h;
            }
        });

        return leader;
    }

    updateHostCameraFollow() {
        if (this.state.role !== 'host') return;
        if (!this.state.isRaceStarted) return;

        const leader = this.getLeaderFromOthers();
        if (leader && this.scene.cameras.main._follow !== leader) {
            this.scene.cameras.main.startFollow(leader, true, 0.08, 0.08);
        }
    }
}