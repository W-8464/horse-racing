/**
 * ClickValidator - Client-side anti-auto-click protection
 * 
 * Prevents automated clicking and provides visual feedback for rate limiting
 */

export default class ClickValidator {
    constructor(options = {}) {
        this.maxClicksPerSecond = options.maxClicksPerSecond || 30; // Slightly lower than server
        this.throttleMs = options.throttleMs || 50; // Minimum time between clicks
        this.warningThreshold = options.warningThreshold || 20; // Show warning at 10 clicks/sec

        this.clicks = []; // For rate limiting (last 1 second)
        this.clickHistory = []; // For auto-click detection (last 35 clicks)
        this.lastClickTime = 0;
        this.isThrottled = false;
        this.warningActive = false;

        // Penalty timer for auto-click detection
        this.isPenalized = false;
        this.penaltyEndTime = 0;
    }

    /**
     * Check if a click should be allowed
     * @returns {Object} { allowed: boolean, throttled: boolean, warning: boolean }
     */
    validateClick() {
        const now = Date.now();

        // Check if player is currently penalized
        if (this.isPenalized) {
            const remainingTime = Math.ceil((this.penaltyEndTime - now) / 1000);
            if (remainingTime > 0) {
                return {
                    allowed: false,
                    penalized: true,
                    remainingTime: remainingTime,
                    message: `Penalty: ${remainingTime}s`
                };
            } else {
                // Penalty expired
                this.isPenalized = false;
                this.penaltyEndTime = 0;
            }
        }

        // Throttle: Minimum time between clicks
        if (now - this.lastClickTime < this.throttleMs) {
            return {
                allowed: false,
                throttled: true,
                warning: false
            };
        }

        // Add current click
        this.clicks.push(now);
        this.clickHistory.push(now); // Also add to history for auto-click detection
        this.lastClickTime = now;

        // Remove old clicks (older than 1 second) for rate limiting
        this.clicks = this.clicks.filter(time => now - time < 1000);

        // Keep only last 35 clicks in history for auto-click detection
        if (this.clickHistory.length > 35) {
            this.clickHistory.shift();
        }

        // Auto-click detection will handle fast clicking patterns
        // No need for separate rate limit check here

        // [FIXED] Auto-click detection: Cần 35 clicks liên tiếp để phát hiện
        if (this.clickHistory.length >= 35) {
            const intervals = [];
            for (let i = 1; i < this.clickHistory.length; i++) {
                intervals.push(this.clickHistory[i] - this.clickHistory[i - 1]);
            }

            // Calculate variance of intervals
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // Phát hiện auto-click nếu:
            // 1. Độ lệch chuẩn < 5ms (clicks quá đều)
            // 2. Tốc độ nhanh (mean < 200ms)
            if (stdDev < 5 && mean <= 200) {
                // Set 5-second penalty
                this.isPenalized = true;
                this.penaltyEndTime = now + 5000; // 5 seconds from now

                return {
                    allowed: false,
                    throttled: false,
                    warning: true,
                    message: 'Auto-click detected!',
                    autoClickDetected: true,
                    penaltyTime: 5
                };
            }
        }

        // No warning for normal clicks
        return {
            allowed: true,
            throttled: false,
            warning: false
        };
    }

    /**
     * Reset click history (e.g., when game restarts)
     */
    reset() {
        this.clicks = [];
        this.clickHistory = [];
        this.lastClickTime = 0;
        this.isThrottled = false;
        this.warningActive = false;
    }

    /**
     * Get current click rate
     */
    getClickRate() {
        const now = Date.now();
        const recentClicks = this.clicks.filter(time => now - time < 1000);
        return recentClicks.length;
    }

    /**
     * Check if currently being throttled
     */
    isCurrentlyThrottled() {
        return Date.now() - this.lastClickTime < this.throttleMs;
    }
}
