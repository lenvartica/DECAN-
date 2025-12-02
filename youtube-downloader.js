const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class YouTubeDownloader {
    constructor() {
        this.downloadPath = './downloads';
        this.tempPath = './temp';
        this.ensureDirectories();
    }

    async ensureDirectories() {
        await fs.ensureDir(this.downloadPath);
        await fs.ensureDir(this.tempPath);
    }

    async getVideoInfo(url) {
        try {
            const info = await ytdl.getInfo(url);
            const formats = info.formats;
            
            const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio);
            const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
            
            return {
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                thumbnail: info.videoDetails.thumbnails[0]?.url,
                description: info.videoDetails.description,
                viewCount: info.videoDetails.viewCount,
                uploadDate: info.videoDetails.uploadDate,
                channel: info.videoDetails.author.name,
                formats: {
                    video: videoFormats.sort((a, b) => (b.quality || 0) - (a.quality || 0)).slice(0, 3),
                    audio: audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0)).slice(0, 2)
                }
            };
        } catch (error) {
            throw new Error(`Failed to get video info: ${error.message}`);
        }
    }

    async downloadVideo(url, quality = 'highest', format = 'mp4') {
        try {
            const info = await ytdl.getInfo(url);
            const filename = `${this.sanitizeFilename(info.videoDetails.title)}_${Date.now()}.${format}`;
            const filepath = path.join(this.downloadPath, filename);

            let stream;
            
            if (format === 'mp3') {
                // Audio only download
                stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
                await this.convertToMp3(stream, filepath);
            } else {
                // Video download
                stream = ytdl(url, { quality: quality });
                await this.saveStream(stream, filepath);
            }

            return {
                success: true,
                filename: filename,
                filepath: filepath,
                size: (await fs.stat(filepath)).size,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds
            };
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    async convertToMp3(stream, outputPath) {
        return new Promise((resolve, reject) => {
            const tempFile = path.join(this.tempPath, `temp_${Date.now()}.mp4`);
            const writeStream = fs.createWriteStream(tempFile);
            
            stream.pipe(writeStream);
            
            writeStream.on('finish', () => {
                ffmpeg(tempFile)
                    .toFormat('mp3')
                    .audioBitrate(192)
                    .on('end', () => {
                        fs.remove(tempFile);
                        resolve();
                    })
                    .on('error', (err) => {
                        fs.remove(tempFile);
                        reject(err);
                    })
                    .save(outputPath);
            });
            
            writeStream.on('error', reject);
        });
    }

    async saveStream(stream, outputPath) {
        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(outputPath);
            stream.pipe(writeStream);
            
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    async cleanup() {
        try {
            // Clean up temp files older than 1 hour
            const files = await fs.readdir(this.tempPath);
            const now = Date.now();
            
            for (const file of files) {
                const filepath = path.join(this.tempPath, file);
                const stats = await fs.stat(filepath);
                
                if (now - stats.mtimeMs > 3600000) { // 1 hour
                    await fs.remove(filepath);
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = YouTubeDownloader;
