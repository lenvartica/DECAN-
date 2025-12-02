const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

class ViewOnceHandler {
    constructor() {
        this.viewOncePath = './view_once_media';
        this.cache = new Map();
        this.ensureDirectory();
    }

    async ensureDirectory() {
        await fs.ensureDir(this.viewOncePath);
    }

    async handleViewOnceMessage(msg, sock) {
        try {
            const message = msg.message;
            let viewOnceData = null;
            let mediaType = null;

            if (message.viewOnceMessageV2) {
                const viewOnce = message.viewOnceMessageV2;
                
                if (viewOnce.message.imageMessage) {
                    mediaType = 'image';
                    viewOnceData = await this.downloadViewOnceImage(viewOnce.message.imageMessage, msg.key.id);
                } else if (viewOnce.message.videoMessage) {
                    mediaType = 'video';
                    viewOnceData = await this.downloadViewOnceVideo(viewOnce.message.videoMessage, msg.key.id);
                }
            } else if (message.viewOnceMessage) {
                const viewOnce = message.viewOnceMessage;
                
                if (viewOnce.message.imageMessage) {
                    mediaType = 'image';
                    viewOnceData = await this.downloadViewOnceImage(viewOnce.message.imageMessage, msg.key.id);
                } else if (viewOnce.message.videoMessage) {
                    mediaType = 'video';
                    viewOnceData = await this.downloadViewOnceVideo(viewOnce.message.videoMessage, msg.key.id);
                }
            }

            if (viewOnceData) {
                this.cache.set(msg.key.id, {
                    ...viewOnceData,
                    type: mediaType,
                    timestamp: Date.now(),
                    sender: msg.key.remoteJid
                });

                // Send notification
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `👁️ *View-Once ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Saved*\n\n` +
                          `📁 File: ${viewOnceData.filename}\n` +
                          `📊 Size: ${viewOnceData.size}\n` +
                          `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                          `🔧 Use !viewonce to retrieve or !viewonelist to see all saved media`
                }, { quoted: msg });

                return true;
            }

            return false;
        } catch (error) {
            console.error('View-once handler error:', error);
            return false;
        }
    }

    async downloadViewOnceImage(imageMessage, messageId) {
        try {
            const buffer = await this.downloadImageBuffer(imageMessage);
            const filename = `viewonce_image_${messageId}_${Date.now()}.jpg`;
            const filepath = path.join(this.viewOncePath, filename);
            
            await fs.writeFile(filepath, buffer);
            const stats = await fs.stat(filepath);

            return {
                filename: filename,
                filepath: filepath,
                size: this.formatFileSize(stats.size),
                buffer: buffer
            };
        } catch (error) {
            throw new Error(`Failed to download view-once image: ${error.message}`);
        }
    }

    async downloadViewOnceVideo(videoMessage, messageId) {
        try {
            const buffer = await this.downloadVideoBuffer(videoMessage);
            const filename = `viewonce_video_${messageId}_${Date.now()}.mp4`;
            const filepath = path.join(this.viewOncePath, filename);
            
            await fs.writeFile(filepath, buffer);
            const stats = await fs.stat(filepath);

            return {
                filename: filename,
                filepath: filepath,
                size: this.formatFileSize(stats.size),
                buffer: buffer
            };
        } catch (error) {
            throw new Error(`Failed to download view-once video: ${error.message}`);
        }
    }

    async downloadImageBuffer(imageMessage) {
        // This would need to be implemented with the actual Baileys download method
        // For now, return a placeholder
        return Buffer.from('placeholder');
    }

    async downloadVideoBuffer(videoMessage) {
        // This would need to be implemented with the actual Baileys download method
        // For now, return a placeholder
        return Buffer.from('placeholder');
    }

    async getViewOnceMedia(messageId) {
        const cached = this.cache.get(messageId);
        if (cached) {
            return cached;
        }
        return null;
    }

    async getViewOnceList() {
        const mediaList = [];
        
        for (const [id, data] of this.cache) {
            mediaList.push({
                id: id,
                type: data.type,
                filename: data.filename,
                size: data.size,
                timestamp: new Date(data.timestamp).toLocaleString(),
                sender: data.sender
            });
        }

        return mediaList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    async deleteViewOnceMedia(messageId) {
        const cached = this.cache.get(messageId);
        if (cached) {
            try {
                await fs.remove(cached.filepath);
                this.cache.delete(messageId);
                return true;
            } catch (error) {
                console.error('Error deleting view-once media:', error);
                return false;
            }
        }
        return false;
    }

    async cleanup() {
        try {
            // Clean up media older than 24 hours
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
            const toDelete = [];

            for (const [id, data] of this.cache) {
                if (data.timestamp < cutoffTime) {
                    toDelete.push(id);
                }
            }

            for (const id of toDelete) {
                await this.deleteViewOnceMedia(id);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    generateMediaInfo(mediaData) {
        return `📁 *${mediaData.type.toUpperCase()} FILE*\n\n` +
               `📋 Filename: ${mediaData.filename}\n` +
               `📊 Size: ${mediaData.size}\n` +
               `⏰ Saved: ${new Date(mediaData.timestamp).toLocaleString()}\n` +
               `📱 From: ${mediaData.sender}`;
    }
}

module.exports = ViewOnceHandler;
