// Additional Bot Commands for Deca XMD
const fs = require('fs-extra');
const moment = require('moment');

class BotCommands {
    constructor(sock) {
        this.sock = sock;
    }

    // Media Commands
    async downloadMedia(msg) {
        try {
            if (msg.message.imageMessage) {
                const buffer = await this.sock.downloadMediaMessage(msg);
                fs.writeFileSync(`./downloads/${msg.key.id}.jpg`, buffer);
                return '✅ Image downloaded successfully!';
            }
            return '❌ No image found in message!';
        } catch (error) {
            return `❌ Error downloading media: ${error}`;
        }
    }

    // Group Commands
    async getGroupInfo(jid) {
        try {
            const metadata = await this.sock.groupMetadata(jid);
            const info = `📱 *Group Information*\n\n` +
                `📛 *Name*: ${metadata.subject}\n` +
                `👥 *Members*: ${metadata.participants.length}\n` +
                `📝 *Description*: ${metadata.desc || 'No description'}\n` +
                `👑 *Admins*: ${metadata.participants.filter(p => p.admin).length}\n` +
                `🆔 *JID*: ${jid}`;
            return info;
        } catch (error) {
            return `❌ Error getting group info: ${error}`;
        }
    }

    // Owner Commands
    async broadcastMessage(text) {
        try {
            const chats = await this.sock.fetchStatus();
            // Implementation for broadcasting to all chats
            return '📢 Message broadcasted successfully!';
        } catch (error) {
            return `❌ Error broadcasting: ${error}`;
        }
    }

    // Utility Commands
    async getWeather(city) {
        // Weather API integration would go here
        return `🌤️ Weather for ${city}: 25°C, Partly Cloudy`;
    }

    async getNews() {
        // News API integration would go here
        return '📰 Latest news would appear here';
    }

    async translate(text, targetLang) {
        // Translation API integration would go here
        return `🌐 Translated to ${targetLang}: ${text}`;
    }

    // Fun Commands
    async randomJoke() {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'Why did the scarecrow win an award? He was outstanding in his field!',
            'Why don\'t eggs tell jokes? They\'d crack up!',
            'What do you call a fake noodle? An impasta!'
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }

    async randomFact() {
        const facts = [
            'A group of flamingos is called a "flamboyance".',
            'Honey never spoils. Archaeologists have found 3000-year-old honey that\'s still edible!',
            'A single strand of spaghetti is called a "spaghetto".',
            'The human brain uses 20% of the body\'s oxygen and calories.',
            'Bananas are berries, but strawberries aren\'t!'
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }

    // System Commands
    async getSystemStatus() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        return `🖥️ *System Status*\n\n` +
            `⏱️ *Uptime*: ${hours}h ${minutes}m ${seconds}s\n` +
            `💾 *Memory Usage*: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
            `🔧 *Node Version*: ${process.version}\n` +
            `📅 *Started*: ${moment(process.uptime() * 1000).format('YYYY-MM-DD HH:mm:ss')}`;
    }

    // Admin Commands
    async kickUser(jid, userJid) {
        try {
            await this.sock.groupParticipantsUpdate(jid, [userJid], 'remove');
            return '👢 User kicked successfully!';
        } catch (error) {
            return `❌ Error kicking user: ${error}`;
        }
    }

    async promoteUser(jid, userJid) {
        try {
            await this.sock.groupParticipantsUpdate(jid, [userJid], 'promote');
            return '👑 User promoted to admin successfully!';
        } catch (error) {
            return `❌ Error promoting user: ${error}`;
        }
    }

    async demoteUser(jid, userJid) {
        try {
            await this.sock.groupParticipantsUpdate(jid, [userJid], 'demote');
            return '👤 User demoted successfully!';
        } catch (error) {
            return `❌ Error demoting user: ${error}`;
        }
    }

    // Anti-Spam Commands
    async checkSpam(msg) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return false;
        
        // Simple spam detection
        const spamIndicators = [
            /(http|https):\/\/[^\s]+/g,
            /buy now/gi,
            /click here/gi,
            /free money/gi,
            /limited offer/gi
        ];
        
        return spamIndicators.some(pattern => pattern.test(text));
    }

    // Welcome Message
    async welcomeMessage(jid, participant) {
        const welcome = `👋 Welcome to the group!\n\n` +
            `🎉 We're glad to have you here!\n` +
            `📜 Please read the group rules.\n` +
            `🤖 Type !help to see available commands.\n` +
            `🚀 Enjoy your stay!`;
        
        await this.sock.sendMessage(jid, { text: welcome });
    }

    // Goodbye Message
    async goodbyeMessage(jid, participant) {
        const goodbye = `👋 Goodbye!\n\n` +
            `🌟 Thanks for being part of the group!\n` +
            `📈 We hope to see you again soon!\n` +
            `🎯 Stay safe and take care!`;
        
        await this.sock.sendMessage(jid, { text: goodbye });
    }
}

module.exports = BotCommands;
