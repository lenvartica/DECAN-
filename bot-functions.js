// Additional bot functions for Deca XMD

class BotFunctions {
    constructor(sock, youtubeDownloader, viewOnceHandler, antiMention, kenyanFeatures) {
        this.sock = sock;
        this.youtubeDownloader = youtubeDownloader;
        this.viewOnceHandler = viewOnceHandler;
        this.antiMention = antiMention;
        this.kenyanFeatures = kenyanFeatures;
    }

    async generateMainMenu() {
        return `🤖 *DECA XMD MAIN MENU* 🤖\n\n` +
               `📱 *Bot Information*\n` +
               `• !menu - Show this menu\n` +
               `• !info - Bot information\n` +
               `• !uptime - Bot uptime\n` +
               `• !ping - Test response\n\n` +
               `🎥 *YouTube Services*\n` +
               `• !youtube <url> - Download video\n` +
               `• !ytmp3 <url> - Download audio\n\n` +
               `👁️ *View-Once Media*\n` +
               `• !viewonce - View saved media\n` +
               `• !viewonelist - List all media\n\n` +
               `🇰🇪 *Kenyan Features*\n` +
               `• !kenyanmenu - Kenyan features\n` +
               `• !kenyatime - Kenya time\n` +
               `• !weather <city> - Weather\n` +
               `• !kenyanews - Latest news\n\n` +
               `🛡️ *Security*\n` +
               `• !antispam - Anti-spam stats\n` +
               `• !linkphone <number> - Link phone\n\n` +
               `🎮 *Fun Commands*\n` +
               `• !sticker - Convert to sticker\n` +
               `• !quote - Random quote\n` +
               `• !joke - Random joke\n\n` +
               `👑 *Owner: ${+254711225405}*` +
               `🚀 *Version: 2.0.0*`;
    }

    async handleYouTubeDownload(msg, url) {
        try {
            await this.sock.sendMessage(msg.key.remoteJid, { 
                text: '🎥 Processing YouTube video...' 
            }, { quoted: msg });

            const videoInfo = await this.youtubeDownloader.getVideoInfo(url);
            
            const infoText = `🎬 *Video Information*\n\n` +
                            `📋 Title: ${videoInfo.title}\n` +
                            `⏱️ Duration: ${this.youtubeDownloader.formatDuration(videoInfo.duration)}\n` +
                            `👀 Views: ${videoInfo.viewCount.toLocaleString()}\n` +
                            `📺 Channel: ${videoInfo.channel}\n` +
                            `📅 Upload: ${videoInfo.uploadDate}\n\n` +
                            `📥 Choose format:\n` +
                            `1. 📹 Video (MP4)\n` +
                            `2. 🎵 Audio (MP3)\n\n` +
                            `Reply with 1 or 2 to continue`;

            await this.sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg });
            
            // Store video info for later use
            this.youtubeDownloader.currentVideo = { url, info: videoInfo };
            
        } catch (error) {
            await this.sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Error: ${error.message}` 
            }, { quoted: msg });
        }
    }

    async handleViewOnceDownload(msg) {
        try {
            const saved = await this.viewOnceHandler.handleViewOnceMessage(msg, this.sock);
            if (saved) {
                await this.sock.sendMessage(msg.key.remoteJid, { 
                    text: '✅ View-once media saved successfully!' 
                }, { quoted: msg });
            }
        } catch (error) {
            console.error('View-once error:', error);
        }
    }

    async handleAntiMention(msg) {
        try {
            const isSpamming = await this.antiMention.checkMentionSpam(msg);
            if (isSpamming) {
                const action = isSpamming.action;
                const message = await this.antiMention.generateAntiMentionMessage(action, msg.key.participant || msg.key.remoteJid);
                
                await this.sock.sendMessage(msg.key.remoteJid, { text: message }, { quoted: msg });
                
                if (action === 'block') {
                    // Block user from group (if admin)
                    // Implementation depends on group permissions
                    await this.sock.sendMessage(msg.key.remoteJid, { 
                        text: '🚫 User has been temporarily blocked for spam!' 
                    });
                }
            }
        } catch (error) {
            console.error('Anti-mention error:', error);
        }
    }

    async handleKenyanGreeting(msg) {
        const greeting = this.kenyanFeatures.getKenyanGreeting();
        const slang = this.kenyanFeatures.getRandomKenyanSlang();
        
        await this.sock.sendMessage(msg.key.remoteJid, { 
            text: `${greeting}\n${slang}! 🇰🇪` 
        }, { quoted: msg });
    }

    async processMessageReaction(msg, reaction) {
        // Handle message reactions for interactive features
        if (reaction.key && reaction.key.id) {
            const cachedMessage = messageCache.get(reaction.key.id);
            if (cachedMessage && cachedMessage.type === 'youtube_download') {
                // Handle YouTube download format selection
                if (reaction.text === '1️⃣') {
                    await this.downloadYouTubeVideo(msg.key.remoteJid, 'video');
                } else if (reaction.text === '2️⃣') {
                    await this.downloadYouTubeVideo(msg.key.remoteJid, 'audio');
                }
            }
        }
    }

    async downloadYouTubeVideo(jid, format) {
        try {
            if (!this.youtubeDownloader.currentVideo) {
                await this.sock.sendMessage(jid, { 
                    text: '❌ No video information available!' 
                });
                return;
            }

            await this.sock.sendMessage(jid, { 
                text: `📥 Downloading ${format}...` 
            });

            const result = await this.youtubeDownloader.downloadVideo(
                this.youtubeDownloader.currentVideo.url, 
                format === 'video' ? 'highest' : 'highestaudio',
                format === 'video' ? 'mp4' : 'mp3'
            );

            if (result.success) {
                // Send the downloaded file
                const messageType = format === 'video' ? 'video' : 'audio';
                await this.sock.sendMessage(jid, {
                    [messageType]: { url: result.filepath },
                    caption: `🎥 ${result.title}\n📊 ${result.size}`
                });

                // Clean up after sending
                setTimeout(() => {
                    fs.remove(result.filepath);
                }, 300000); // Remove after 5 minutes
            }

        } catch (error) {
            await this.sock.sendMessage(jid, { 
                text: `❌ Download failed: ${error.message}` 
            });
        }
    }

    async handleGroupJoin(msg) {
        // Welcome message for new group members
        if (msg.type === 'add') {
            const welcomeMessage = `🎉 Welcome to the group!\n\n` +
                                 `🤖 I'm ${config.botName}\n` +
                                 `📋 Type !menu to see available commands\n` +
                                 `🇰🇪 Karibu sana! Welcome!`;
            
            await this.sock.sendMessage(msg.key.remoteJid, { text: welcomeMessage });
        }
    }

    async handleGroupLeave(msg) {
        // Goodbye message for leaving members
        if (msg.type === 'remove') {
            const goodbyeMessage = `👋 Goodbye!\n\n` +
                                 `🌟 Thanks for being with us\n` +
                                 `🚀 Safe travels!`;
            
            await this.sock.sendMessage(msg.key.remoteJid, { text: goodbyeMessage });
        }
    }

    async handleScheduledMessages() {
        // Send scheduled messages (e.g., daily greetings, news)
        const hour = new Date().getHours();
        
        if (hour === 7) { // Morning greeting
            const morningGreeting = `🌅 Good morning Kenya! 🇰🇪\n\n` +
                                  `${this.kenyanFeatures.getKenyanGreeting()}\n` +
                                  `📰 Today's news: !kenyanews\n` +
                                  `🌤️ Weather: !weather nairobi`;
            
            // Send to all active groups
            // Implementation depends on group management
        }
    }

    async handleRenderMode() {
        // Render-specific configurations
        if (config.renderMode) {
            // Set up Express server for health checks
            const app = express();
            app.get('/', (req, res) => {
                res.json({
                    status: 'online',
                    bot: config.botName,
                    version: config.version,
                    uptime: this.getUptime()
                });
            });
            
            app.listen(process.env.PORT || 3000);
        }
    }

    getUptime() {
        const uptime = Date.now() - startTime;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    async cleanup() {
        // Clean up temporary files and cache
        await this.youtubeDownloader.cleanup();
        await this.viewOnceHandler.cleanup();
        messageCache.flushAll();
    }
}

module.exports = BotFunctions;
