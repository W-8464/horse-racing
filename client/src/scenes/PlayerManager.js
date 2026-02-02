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
            this.horse.baseServerY = playerInfo.y;
            this._updateHorseDepth(this.horse); // [UPDATE] Dùng hàm chuẩn
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

        this.horse.baseServerY = playerInfo.y;
        this._updateHorseDepth(this.horse); // [UPDATE] Dùng hàm chuẩn

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
            existing.baseServerY = playerInfo.y;

            if (Math.abs(existing.y - visualY) > 1) {
                existing.y = visualY;
                this._updateHorseDepth(existing); // [UPDATE]
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

        other.baseServerY = playerInfo.y;
        other.serverIndex = playerInfo.serverIndex;
        this._updateHorseDepth(other); // [UPDATE]

        if (other.playIdle) other.playIdle();
        else other.play('horse_idle');

        this.otherPlayers.add(other);
    }

    // [NEW] Hàm helper để set depth cho 1 con ngựa cụ thể
    _updateHorseDepth(horseObj) {
        if (!horseObj || !horseObj.active) return;

        // Depth của ngựa bằng đúng toạ độ Y để chúng che nhau đúng quy luật xa gần
        horseObj.setDepth(horseObj.y);

        // Depth của tên: Cao hơn ngựa một chút, nhưng PHẢI thấp hơn UI
        if (horseObj.nameText) {
            // Dùng DEPTH.NAME_OFFSET (ví dụ 1000) thay vì 10000
            const nameDepth = horseObj.y + (DEPTH.NAME_OFFSET || 1000);
            horseObj.nameText.setDepth(nameDepth);
        }
    }

    // [NEW] Hàm này sẽ được gọi trong update() của Scene
    updateDepths() {
        // 1. Ngựa mình
        if (this.horse) {
            this._updateHorseDepth(this.horse);
        }
        // 2. Ngựa khác
        if (this.otherPlayers) {
            this.otherPlayers.children.iterate((child) => {
                this._updateHorseDepth(child);
            });
        }
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
        if (this.horse && this.horse.baseServerY !== undefined) {
            const newY = this.getVisualY(this.horse.baseServerY);
            this.horse.y = newY;
            this._updateHorseDepth(this.horse); // [UPDATE]
        }

        this.otherPlayers.getChildren().forEach(horse => {
            if (horse.baseServerY !== undefined) {
                const newY = this.getVisualY(horse.baseServerY);
                horse.y = newY;
                this._updateHorseDepth(horse); // [UPDATE]
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
            this._updateHorseDepth(this.horse); // [UPDATE]

            if (this.horse.resetColor) this.horse.resetColor();
        }

        this.otherPlayers.getChildren().forEach(p => {
            const info = players[p.playerId];
            if (info) {
                const visualY = this.getVisualY(info.y);
                p.setPosition(info.x, visualY);
                this._updateHorseDepth(p); // [UPDATE]
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