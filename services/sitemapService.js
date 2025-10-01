/**
 * Sitemap Service for FixMySpine
 * 
 * This service handles automatic sitemap updates when:
 * - New business listings are added
 * - Existing listings are updated
 * - Listings are approved/rejected
 * - Categories or locations are modified
 */

const generateSitemap = require('../scripts/generate-sitemap');
const fs = require('fs');
const path = require('path');

class SitemapService {
    constructor() {
        this.isUpdating = false;
        this.updateQueue = [];
    }

    /**
     * Trigger sitemap regeneration
     * @param {string} reason - Reason for the update (for logging)
     * @param {boolean} immediate - Whether to update immediately or queue it
     */
    async updateSitemap(reason = 'Manual update', immediate = false) {
        console.log(`🗺️  Sitemap update requested: ${reason}`);
        
        if (this.isUpdating) {
            if (immediate) {
                console.log('⏳ Sitemap is currently updating, queuing immediate update...');
                this.updateQueue.push({ reason, immediate: true });
                return;
            } else {
                console.log('⏳ Sitemap is currently updating, queuing request...');
                this.updateQueue.push({ reason, immediate: false });
                return;
            }
        }

        try {
            this.isUpdating = true;
            console.log(`🚀 Starting sitemap update: ${reason}`);
            
            const result = await generateSitemap.generateSitemap();
            
            if (result.success) {
                console.log(`✅ Sitemap updated successfully: ${reason}`);
                console.log(`📊 Total URLs: ${result.totalUrls}`);
            } else {
                console.error(`❌ Sitemap update failed: ${reason}`, result.error);
            }
            
        } catch (error) {
            console.error(`💥 Sitemap update error: ${reason}`, error);
        } finally {
            this.isUpdating = false;
            
            // Process queued updates
            if (this.updateQueue.length > 0) {
                const nextUpdate = this.updateQueue.shift();
                console.log(`🔄 Processing queued sitemap update: ${nextUpdate.reason}`);
                setTimeout(() => {
                    this.updateSitemap(nextUpdate.reason, nextUpdate.immediate);
                }, 1000); // Small delay to prevent rapid successive updates
            }
        }
    }

    /**
     * Schedule a delayed sitemap update
     * Useful for batching multiple rapid changes
     * @param {string} reason - Reason for the update
     * @param {number} delayMs - Delay in milliseconds (default: 30 seconds)
     */
    scheduleUpdate(reason = 'Scheduled update', delayMs = 30000) {
        console.log(`⏰ Scheduling sitemap update in ${delayMs/1000}s: ${reason}`);
        
        setTimeout(() => {
            this.updateSitemap(reason, false);
        }, delayMs);
    }

    /**
     * Force immediate sitemap regeneration
     * @param {string} reason - Reason for the update
     */
    async forceUpdate(reason = 'Force update') {
        console.log(`⚡ Force updating sitemap: ${reason}`);
        await this.updateSitemap(reason, true);
    }

    /**
     * Check if sitemap exists and is recent
     * @param {number} maxAgeHours - Maximum age in hours (default: 24)
     * @returns {object} - { exists: boolean, isRecent: boolean, lastModified: Date|null }
     */
    checkSitemapStatus(maxAgeHours = 24) {
        const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
        
        try {
            if (!fs.existsSync(sitemapPath)) {
                return { exists: false, isRecent: false, lastModified: null };
            }
            
            const stats = fs.statSync(sitemapPath);
            const lastModified = stats.mtime;
            const ageHours = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60);
            const isRecent = ageHours <= maxAgeHours;
            
            return {
                exists: true,
                isRecent: isRecent,
                lastModified: lastModified,
                ageHours: ageHours
            };
        } catch (error) {
            console.error('Error checking sitemap status:', error);
            return { exists: false, isRecent: false, lastModified: null, error: error.message };
        }
    }

    /**
     * Initialize sitemap service
     * Checks if sitemap exists and generates if needed
     */
    async initialize() {
        console.log('🗺️  Initializing sitemap service...');
        
        const status = this.checkSitemapStatus(24); // 24 hours
        
        if (!status.exists) {
            console.log('📝 Sitemap not found, generating initial sitemap...');
            await this.updateSitemap('Initial sitemap generation', true);
        } else if (!status.isRecent) {
            console.log(`🕒 Sitemap is ${Math.round(status.ageHours)} hours old, updating...`);
            await this.updateSitemap('Stale sitemap update', false);
        } else {
            console.log(`✅ Sitemap is up to date (${Math.round(status.ageHours)} hours old)`);
        }
    }
}

// Create singleton instance
const sitemapService = new SitemapService();

module.exports = sitemapService;
