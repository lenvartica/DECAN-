const { WAConnection, MessageType, Presence } = require('@whiskeysockets/baileys');
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const chalk = require('chalk');
const moment = require('moment');
const NodeCache = require('node-cache');
const express = require('express');

// Import custom modules
const YouTubeDownloader = require('./youtube-downloader');
const ViewOnceHandler = require('./view-once-handler');
const AntiMention = require('./anti-mention');
const KenyanFeatures = require('./kenyan-features');
const { isLinked } = require('./linked-devices-store');
const newCommands = require('./commands');
const adultCommands = require('./adult-commands');
const settings = require('./settings-manager');

// Deca XMD WhatsApp Bot Configuration
const config = {
    botName: 'Deca XMD',
    version: '2.0.0',
    owner: '+254711225405',
    prefix: '!',
    autoRead: true,
    autoReply: true,
    youtubeEnabled: true,
    viewOnceEnabled: true,
    antiMentionEnabled: true,
    kenyanFeaturesEnabled: true,
    renderMode: process.env.RENDER === 'true'
};

// Bot Status
let botStatus = 'offline';
let startTime = new Date();
let linkedPhone = null;

// Initialize modules
const youtubeDownloader = new YouTubeDownloader();
const viewOnceHandler = new ViewOnceHandler();
const antiMention = new AntiMention();
const kenyanFeatures = new KenyanFeatures();
const messageCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Utility Functions
const getColor = (text, color) => {
    return chalk[color](text);
};

const getTime = () => {
    return moment().format('HH:mm:ss');
};

const log = (message, type = 'info') => {
    const timestamp = `[${getTime()}]`;
    const colors = {
        info: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red'
    };
    
    console.log(getColor(timestamp, 'gray'), getColor(`[${type.toUpperCase()}]`, colors[type]), message);
};

// Main Bot Class
class DecaXMDBot {
    constructor(onConnectionUpdate) {
        this.onConnectionUpdate = onConnectionUpdate;
        this.sock = null;
        this.connectionState = 'disconnected';
        this.commands = new Map();
        this.setupCommands();
    }

    // Setup Bot Commands
    setupCommands() {
        const allCommands = {
            // Basic Commands
            ping: {
                description: 'Check bot response time',
                execute: async (msg) => {
                    const start = Date.now();
                    await this.sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' }, { quoted: msg });
                    const end = Date.now();
                    return `⚡ Response time: ${end - start}ms`;
                }
            },
            help: {
                description: 'Show all available commands',
                execute: async (msg) => {
                    let helpText = `🤖 *${config.botName} v${config.version}*\n\n*Available Commands:*\n\n`;
                    for (const [cmd, info] of this.commands) {
                        helpText += `• ${info.usage || '!' + cmd}\n  ${info.description}\n\n`;
                    }
                    helpText += `👑 *Owner*: ${config.owner}\n⏰ *Uptime*: ${this.getUptime()}`;
                    return helpText;
                }
            },
            menu: {
                description: 'Show interactive menu',
                execute: (msg) => this.commands.get('help').execute(msg)
            },
            info: {
                description: 'Show bot information',
                execute: (msg) => `🤖 *${config.botName}*\n\n` +
                    `📱 *Version*: ${config.version}\n` +
                    `👑 *Owner*: NEXUS DECAN TECH\n` +
                    `📞 *Contact*: ${config.owner}\n` +
                    `⏰ *Uptime*: ${this.getUptime()}\n` +
                    `🔧 *Status*: ${botStatus}`
            },
            sticker: {
                description: 'Convert image to sticker',
                usage: '!sticker (reply to image)',
                execute: async (msg) => {
                    if (msg.message.imageMessage) {
                        const buffer = await this.sock.downloadMediaMessage(msg);
                        await this.sock.sendMessage(msg.key.remoteJid, { sticker: buffer }, { quoted: msg });
                    } else {
                        return '❌ Please reply to an image message!';
                    }
                }
            },
            uptime: {
                description: 'Show bot uptime',
                execute: (msg) => `⏰ Bot Uptime: ${this.getUptime()}`
            },
            // YouTube Command
            youtube: {
                description: 'YouTube video downloader (MP4)',
                usage: '!youtube <url>',
                execute: async (msg, args) => {
                    const url = args && args[0];
                    if (!url) return '❌ Please provide a YouTube URL!';
                    await this.sock.sendMessage(msg.key.remoteJid, { text: '🎥 Processing YouTube video...' }, { quoted: msg });
                    try {
                        const result = await youtubeDownloader.downloadVideo(url, 'highest', 'mp4');
                        await this.sock.sendMessage(msg.key.remoteJid, {
                            video: { url: result.filepath },
                            caption: `🎬 ${result.title}\n⏱️ Duration: ${youtubeDownloader.formatDuration(result.duration)}\n📊 Size: ${youtubeDownloader.formatFileSize(result.size)}`
                        }, { quoted: msg });
                        setTimeout(() => fs.remove(result.filepath).catch(() => {}), 300000);
                    } catch (error) {
                        return `❌ Download failed: ${error.message}`;
                    }
                }
            },
            // New Commands from commands.js
            ...Object.entries(newCommands).reduce((acc, [name, func]) => {
                acc[name] = { description: `The ${name} command.`, execute: (msg, args) => func(this.sock, msg, args) };
                return acc;
            }, {}),

            // Owner Commands
            settings: {
                description: 'View current bot settings (owner only).',
                usage: '!settings',
                execute: (msg) => {
                    if (msg.key.remoteJid !== settings.get('owner')) return '🔒 This command is for the bot owner only.';
                    let settingsText = '*Current Bot Settings:*\n\n';
                    for (const [key, value] of Object.entries(settings.getAll())) {
                        settingsText += `• *${key}*: ${value}\n`;
                    }
                    return settingsText;
                }
            },
            set: {
                description: 'Change a bot setting (owner only).',
                usage: '!set <key> <value>',
                execute: async (msg, args) => {
                    if (msg.key.remoteJid !== settings.get('owner')) return '🔒 This command is for the bot owner only.';
                    const [key, ...valueParts] = args;
                    const value = valueParts.join(' ');
                    if (!key || !value) return 'Usage: !set <key> <value>';

                    const success = await settings.set(key, value);
                    if (success) {
                        return `✅ Setting *${key}* has been updated to *${value}*.`;
                    } else {
                        return `❌ Unknown setting: *${key}*.`;
                    }
                }
            },
        };

        // Conditionally add adult commands if enabled
        if (settings.get('adultCommandsEnabled')) {
            Object.assign(allCommands, Object.entries(adultCommands).reduce((acc, [name, func]) => {
                acc[name] = { description: `NSFW command: ${name}.`, execute: (msg, args) => func(this.sock, msg, args) };
                return acc;
            }, {}));
        };

        for (const [commandName, commandData] of Object.entries(allCommands)) {
            this.commands.set(commandName, {
                description: commandData.description || `The ${commandName} command.`,
                usage: commandData.usage || `!${commandName}`,
                execute: commandData.execute,
            });
        }
    }

    // Get Bot Uptime
    getUptime() {
        const uptime = Date.now() - startTime;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    // Initialize WhatsApp Connection
    async connect() {
        try {
            log('Initializing Deca XMD Bot...', 'info');
            
            const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
            
            this.sock = new WAConnection({
                authState: state,
                printQRInTerminal: true,
                browser: ['Deca XMD', 'Chrome', '10.0.0']
            });

            // Event Handlers
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                let status;

                if (connection === 'open') {
                    status = 'online';
                    log('🤖 Deca XMD Bot is now online!', 'success');
                    await this.sock.sendPresenceUpdate('available');
                } else if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    status = 'offline';
                    log(`Connection closed: ${lastDisconnect?.error}`, 'warning');
                    if (shouldReconnect) {
                        log('Reconnecting...', 'info');
                        this.connect();
                    } else {
                        log('Logged out, please restart the bot!', 'error');
                    }
                } else {
                    status = 'connecting';
                }

                if (this.onConnectionUpdate) {
                    this.onConnectionUpdate({ status, qr });
                }
            });

            this.sock.ev.on('creds.update', saveCreds);

            // Message Handler
            this.sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                if (!msg.message) return;
                
                const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (!messageContent) return;
                
                // Auto Read
                if (config.autoRead) {
                    await this.sock.readMessages([msg.key]);
                }
                
                const senderJid = msg.key.remoteJid;
                if (!isLinked(senderJid)) {
                    if (messageContent.startsWith(config.prefix)) {
                        await this.sock.sendMessage(senderJid, {
                            text: '❌ This device is not linked. Please visit our website to pair your number.'
                        }, { quoted: msg });
                    }
                    return;
                }

                // Command Handler
                if (messageContent.startsWith(config.prefix)) {
                    const args = messageContent.slice(config.prefix.length).trim().split(/ +/);
                    const command = args.shift().toLowerCase();

                    if (this.commands.has(command)) {
                        try {
                            log(`Executing command: ${command} for ${senderJid}`, 'info');
                            const result = await this.commands.get(command).execute(msg, args);
                            if (result) {
                                await this.sock.sendMessage(senderJid, { text: result }, { quoted: msg });
                            }
                        } catch (error) {
                            log(`Error executing command ${command}: ${error}`, 'error');
                            await this.sock.sendMessage(senderJid, {
                                text: '❌ An error occurred while executing this command!'
                            }, { quoted: msg });
                        }
                    }
                }
                
                // Auto Reply
                if (config.autoReply && !messageContent.startsWith(config.prefix)) {
                    const greetings = ['hi', 'hello', 'hey', 'helo', 'hai'];
                    const greeting = greetings.find(g => messageContent.toLowerCase().includes(g));
                    
                    if (greeting) {
                        await this.sock.sendMessage(msg.key.remoteJid, { 
                            text: `👋 Hello! I'm ${config.botName}!\n\nType ${config.prefix}help to see available commands.` 
                        }, { quoted: msg });
                    }
                }
            });

            // Connect to WhatsApp
            await this.sock.connect();
            
        } catch (error) {
            log(`Connection error: ${error}`, 'error');
            setTimeout(() => this.connect(), 5000);
        }
    }

    // Start Bot
    async start() {
        log('🚀 Starting Deca XMD WhatsApp Bot...', 'info');
        await this.connect();
    }
}

module.exports = DecaXMDBot;

console.log(getColor('╔════════════════════════════════════════════════════════════╗', 'cyan'));
console.log(getColor('║                    🤖 DECA XMD BOT 🤖                      ║', 'cyan'));
console.log(getColor('║                Advanced WhatsApp Automation                ║', 'cyan'));
console.log(getColor('║                      Version 1.0.0                        ║', 'cyan'));
console.log(getColor('║                Created by NEXUS DECAN TECH                 ║', 'cyan'));
console.log(getColor('╚════════════════════════════════════════════════════════════╝', 'cyan'));
