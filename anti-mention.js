const crypto = require('crypto');

class AntiMention {
    constructor() {
        this.mentionSpam = new Map();
        this.blockedUsers = new Set();
        this.warnedUsers = new Map();
        this.settings = {
            maxMentions: 5,
            maxMentionsPerMinute: 3,
            maxMentionsPerHour: 10,
            warningThreshold: 2,
            blockDuration: 300000, // 5 minutes
            cleanupInterval: 60000 // 1 minute
        };
        
        this.startCleanup();
    }

    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.settings.cleanupInterval);
    }

    async checkMentionSpam(msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const message = msg.message;
            
            if (!message) return false;

            let mentionCount = 0;
            
            // Check for mentions in different message types
            if (message.extendedTextMessage) {
                mentionCount = message.extendedTextMessage.contextInfo?.mentionedJid?.length || 0;
            } else if (message.conversation) {
                // Check for @ mentions in text
                const matches = message.conversation.match(/@\d+/g);
                mentionCount = matches ? matches.length : 0;
            }

            if (mentionCount === 0) return false;

            const now = Date.now();
            const userSpam = this.mentionSpam.get(sender) || {
                mentions: [],
                totalMentions: 0,
                lastReset: now
            };

            // Add current mention
            userSpam.mentions.push({
                count: mentionCount,
                timestamp: now,
                messageId: msg.key.id
            });
            userSpam.totalMentions += mentionCount;

            // Check spam conditions
            const isSpamming = this.evaluateSpam(userSpam, sender);
            
            this.mentionSpam.set(sender, userSpam);

            return isSpamming;
        } catch (error) {
            console.error('Anti-mention error:', error);
            return false;
        }
    }

    evaluateSpam(userSpam, sender) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;

        // Count mentions in different time windows
        const mentionsLastMinute = userSpam.mentions
            .filter(m => m.timestamp > oneMinuteAgo)
            .reduce((sum, m) => sum + m.count, 0);

        const mentionsLastHour = userSpam.mentions
            .filter(m => m.timestamp > oneHourAgo)
            .reduce((sum, m) => sum + m.count, 0);

        // Check spam thresholds
        const tooManyMentions = userSpam.totalMentions > this.settings.maxMentions;
        const tooManyPerMinute = mentionsLastMinute > this.settings.maxMentionsPerMinute;
        const tooManyPerHour = mentionsLastHour > this.settings.maxMentionsPerHour;

        if (tooManyMentions || tooManyPerMinute || tooManyPerHour) {
            return this.handleSpam(sender, userSpam);
        }

        return false;
    }

    handleSpam(sender, userSpam) {
        const warnings = this.warnedUsers.get(sender) || 0;
        
        if (warnings >= this.settings.warningThreshold) {
            this.blockUser(sender);
            return {
                action: 'block',
                reason: 'Excessive mention spam',
                duration: this.settings.blockDuration
            };
        } else {
            this.warnUser(sender, warnings + 1);
            return {
                action: 'warn',
                reason: 'Too many mentions',
                warningCount: warnings + 1
            };
        }
    }

    blockUser(sender) {
        this.blockedUsers.add(sender);
        setTimeout(() => {
            this.blockedUsers.delete(sender);
        }, this.settings.blockDuration);
    }

    warnUser(sender, warningCount) {
        this.warnedUsers.set(sender, warningCount);
    }

    isUserBlocked(sender) {
        return this.blockedUsers.has(sender);
    }

    getUserWarnings(sender) {
        return this.warnedUsers.get(sender) || 0;
    }

    async getSpamReport() {
        const report = {
            totalUsers: this.mentionSpam.size,
            blockedUsers: this.blockedUsers.size,
            warnedUsers: this.warnedUsers.size,
            topSpammers: []
        };

        // Get top spammers
        const spammers = Array.from(this.mentionSpam.entries())
            .map(([user, data]) => ({
                user,
                totalMentions: data.totalMentions,
                recentMentions: data.mentions.filter(m => Date.now() - m.timestamp < 3600000).length
            }))
            .sort((a, b) => b.totalMentions - a.totalMentions)
            .slice(0, 5);

        report.topSpammers = spammers;
        return report;
    }

    cleanup() {
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        // Clean old mention data
        for (const [user, data] of this.mentionSpam) {
            data.mentions = data.mentions.filter(m => m.timestamp > oneHourAgo);
            
            if (data.mentions.length === 0) {
                this.mentionSpam.delete(user);
                this.warnedUsers.delete(user);
            }
        }
    }

    async generateAntiMentionMessage(action, sender) {
        const messages = {
            warn: [
                '⚠️ Warning: Please reduce mention usage!',
                '🚨 Too many mentions detected!',
                '⛔ Mention spam detected - please slow down!'
            ],
            block: [
                '🚫 User blocked for mention spam!',
                '🛑 Anti-spam protection activated!',
                '🔒 User temporarily blocked for spam!'
            ]
        };

        const messageType = action === 'block' ? 'block' : 'warn';
        const randomMessage = messages[messageType][Math.floor(Math.random() * messages[messageType].length)];
        
        return `${randomMessage}\n\n` +
               `👤 User: ${sender}\n` +
               `⏰ Time: ${new Date().toLocaleString()}\n` +
               `🔧 Action: ${action}`;
    }

    getSettings() {
        return this.settings;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    resetUser(sender) {
        this.mentionSpam.delete(sender);
        this.warnedUsers.delete(sender);
        this.blockedUsers.delete(sender);
    }

    async getStatistics() {
        const now = Date.now();
        const last24Hours = now - 86400000;
        const lastHour = now - 3600000;

        let totalMentions24h = 0;
        let totalMentions1h = 0;
        let activeUsers = 0;

        for (const [user, data] of this.mentionSpam) {
            const mentions24h = data.mentions.filter(m => m.timestamp > last24Hours);
            const mentions1h = data.mentions.filter(m => m.timestamp > lastHour);
            
            if (mentions24h.length > 0) activeUsers++;
            totalMentions24h += mentions24h.reduce((sum, m) => sum + m.count, 0);
            totalMentions1h += mentions1h.reduce((sum, m) => sum + m.count, 0);
        }

        return {
            totalUsers: this.mentionSpam.size,
            activeUsers: activeUsers,
            blockedUsers: this.blockedUsers.size,
            warnedUsers: this.warnedUsers.size,
            totalMentions24h: totalMentions24h,
            totalMentions1h: totalMentions1h
        };
    }
}

module.exports = AntiMention;
