/**
 * ClickValidator - Client-side anti-auto-click protection
 * 
 * Prevents automated clicking and provides visual feedback for rate limiting
 */

export default class ClickValidator {
    constructor(options = {}) {
        this.maxClicksPerSecond = options.maxClicksPerSecond || 12; // Slightly lower than server
        this.throttleMs = options.throttleMs || 50; // Minimum time between clicks
        this.warningThreshold = 20; // Show warning at 10 clicks/sec

        this.clicks = [];
        this.lastClickTime = 0;
        this.isThrottled = false;
        this.warningActive = false;
    }

    /**
     * Check if a click should be allowed
     * @returns {Object} { allowed: boolean, throttled: boolean, warning: boolean }
     */
    validateClick() {
        const now = Date.now();

        // Throttle: Minimum time between clicks
        if (now - this.lastClickTime < this.throttleMs) {
            return {
                allowed: false,
                throttled: true,
                warning: false,
                message: 'Clicking too fast!'
            };
        }

        // Add current click
        this.clicks.push(now);
        this.lastClickTime = now;

        // Remove old clicks (older than 1 second)
        this.clicks = this.clicks.filter(time => now - time < 1000);

        // Check rate
        if (this.clicks.length > this.maxClicksPerSecond) {
            // Remove the click we just added
            this.clicks.pop();

            return {
                allowed: false,
                throttled: false,
                warning: true,
                message: 'Rate limit reached!'
            };
        }

        // [NEW] Auto-click detection: Check for uniform timing patterns
        if (this.clicks.length >= 20) {
            const intervals = [];
            for (let i = 1; i < Math.min(this.clicks.length, 20); i++) {
                intervals.push(this.clicks[i] - this.clicks[i - 1]);
            }

            // Calculate variance of intervals
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // If clicks are too uniform (standard deviation < 15ms), likely auto-clicker
            if (stdDev < 15 && mean < 200) {
                return {
                    allowed: false,
                    throttled: false,
                    warning: true,
                    message: 'Auto-click detected!',
                    autoClickDetected: true
                };
            }
        }

        // Show warning if approaching limit
        const showWarning = this.clicks.length >= this.warningThreshold;

        return {
            allowed: true,
            throttled: false,
            warning: showWarning,
            message: showWarning ? 'Slow down!' : null
        };
    }

    /**
     * Reset click history (e.g., when game restarts)
     */
    reset() {
        this.clicks = [];
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
