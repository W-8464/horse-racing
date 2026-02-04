/**
 * RateLimiter - Anti-Auto-Click Protection
 * 
 * Tracks player click patterns and detects suspicious behavior:
 * - Too many clicks per second
 * - Too uniform timing (bot-like behavior)
 * - Sustained high-speed clicking
 */

class RateLimiter {
    constructor(options = {}) {
        // Configurable thresholds
        this.maxClicksPerSecond = options.maxClicksPerSecond || 15; // Max 15 clicks/sec
        this.maxClicksPerWindow = options.maxClicksPerWindow || 50; // Max 50 clicks in 5 seconds
        this.windowSize = options.windowSize || 5000; // 5 second window
        this.uniformityThreshold = options.uniformityThreshold || 5; // Max 5ms variance for bot detection
        this.warningThreshold = options.warningThreshold || 0.8; // Warn at 80% of limit

        // Player tracking: playerId -> { clicks: [], warnings: 0, blocked: false }
        this.players = new Map();
    }

    /**
     * Record a click and check if it should be allowed
     * @param {string} playerId - Socket ID of the player
     * @returns {Object} { allowed: boolean, reason: string, warning: boolean }
     */
    recordClick(playerId) {
        const now = Date.now();

        // Initialize player if new
        if (!this.players.has(playerId)) {
            this.players.set(playerId, {
                clicks: [],
                warnings: 0,
                blocked: false,
                lastWarningTime: 0
            });
        }

        const player = this.players.get(playerId);

        // If player is blocked, reject
        if (player.blocked) {
            return {
                allowed: false,
                reason: 'BLOCKED_AUTO_CLICK',
                warning: false
            };
        }

        // Add current click
        player.clicks.push(now);

        // Remove clicks outside the window
        player.clicks = player.clicks.filter(time => now - time < this.windowSize);

        // Check 1: Clicks per second (last 1 second)
        const recentClicks = player.clicks.filter(time => now - time < 1000);
        if (recentClicks.length > this.maxClicksPerSecond) {
            player.warnings++;

            // Block after 3 warnings
            if (player.warnings >= 3) {
                player.blocked = true;
                return {
                    allowed: false,
                    reason: 'EXCESSIVE_CLICK_RATE',
                    warning: false
                };
            }

            return {
                allowed: false,
                reason: 'RATE_LIMIT_EXCEEDED',
                warning: true,
                warningCount: player.warnings
            };
        }

        // Check 2: Total clicks in window
        if (player.clicks.length > this.maxClicksPerWindow) {
            player.warnings++;

            if (player.warnings >= 3) {
                player.blocked = true;
                return {
                    allowed: false,
                    reason: 'EXCESSIVE_TOTAL_CLICKS',
                    warning: false
                };
            }

            return {
                allowed: false,
                reason: 'WINDOW_LIMIT_EXCEEDED',
                warning: true,
                warningCount: player.warnings
            };
        }

        // Check 3: Bot detection - too uniform timing
        if (player.clicks.length >= 10) {
            const intervals = [];
            for (let i = 1; i < Math.min(player.clicks.length, 20); i++) {
                intervals.push(player.clicks[i] - player.clicks[i - 1]);
            }

            // Calculate variance
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // If clicks are too uniform (low variance), likely a bot
            if (stdDev < this.uniformityThreshold && mean < 100) {
                player.warnings += 2; // More serious offense
                player.blocked = true;

                return {
                    allowed: false,
                    reason: 'BOT_PATTERN_DETECTED',
                    warning: false
                };
            }
        }

        // Check 4: Warning threshold (soft limit)
        const warningLimit = this.maxClicksPerSecond * this.warningThreshold;
        if (recentClicks.length > warningLimit && now - player.lastWarningTime > 2000) {
            player.lastWarningTime = now;
            return {
                allowed: true,
                reason: 'APPROACHING_LIMIT',
                warning: true,
                warningCount: player.warnings
            };
        }

        // All checks passed
        return {
            allowed: true,
            reason: 'OK',
            warning: false
        };
    }

    /**
     * Reset player's click history (e.g., when game restarts)
     */
    resetPlayer(playerId) {
        if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            player.clicks = [];
            player.warnings = 0;
            player.blocked = false;
            player.lastWarningTime = 0;
        }
    }

    /**
     * Remove player from tracking (on disconnect)
     */
    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    /**
     * Get player stats for debugging/monitoring
     */
    getPlayerStats(playerId) {
        if (!this.players.has(playerId)) {
            return null;
        }

        const player = this.players.get(playerId);
        const now = Date.now();
        const recentClicks = player.clicks.filter(time => now - time < 1000);

        return {
            totalClicks: player.clicks.length,
            clicksLastSecond: recentClicks.length,
            warnings: player.warnings,
            blocked: player.blocked
        };
    }

    /**
     * Reset all players (e.g., server restart)
     */
    resetAll() {
        this.players.clear();
    }
}

module.exports = RateLimiter;
