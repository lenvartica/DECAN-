const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { WebSocketServer } = require('ws');

// Import bot modules
const DecaXMDBot = require('./index');
const linkedDevices = require('./linked-devices-store');
const settings = require('./settings-manager');
const db = require('./database');

class DecaXMDServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.connectedClients = new Set();
        this.bot = null;
        this.qrCode = null;
        this.botStatus = 'offline';
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeBot();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('.'));
    }

    setupRoutes() {
        // Generate pairing code
        this.app.post('/api/generate-code', async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                
                if (!phoneNumber) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number is required' 
                    });
                }

                // Validate Kenyan phone number
                if (!this.validateKenyanNumber(phoneNumber)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid Kenyan phone number format' 
                    });
                }

                // Generate unique pairing code
                const code = this.generatePairingCode();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

                // Store code information in the database
                db.run('INSERT INTO pairing_codes (code, phoneNumber, expiresAt) VALUES (?, ?, ?)', 
                    [code, this.formatPhoneNumber(phoneNumber), expiresAt.getTime()], 
                    (err) => {
                        if (err) console.error('DB Error on code insert:', err);
                    });

                // Broadcast to all connected clients
                this.broadcast({
                    type: 'code_generated',
                    code: code,
                    phoneNumber: this.formatPhoneNumber(phoneNumber),
                    expiresAt: expiresAt
                });

                res.json({ 
                    success: true, 
                    code: code,
                    expiresAt: expiresAt,
                    message: 'Code generated successfully' 
                });

            } catch (error) {
                console.error('Code generation error:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to generate code' 
                });
            }
        });

        // Validate pairing code
        this.app.post('/api/validate-code', async (req, res) => {
            try {
                const { code } = req.body;
                
                if (!code) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Code is required' 
                    });
                }

                const codeData = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM pairing_codes WHERE code = ?', [code], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!codeData) {
                    return res.status(404).json({ success: false, message: 'Invalid or expired code' });
                }

                if (codeData.used) {
                    return res.status(400).json({ success: false, message: 'Code has already been used' });
                }

                if (Date.now() > codeData.expiresAt) {
                    db.run('DELETE FROM pairing_codes WHERE code = ?', [code]);
                    return res.status(400).json({ success: false, message: 'Code has expired' });
                }

                // Mark code as used in the database
                db.run('UPDATE pairing_codes SET used = 1 WHERE code = ?', [code]);

                res.json({ 
                    success: true, 
                    phoneNumber: codeData.phoneNumber,
                    message: 'Code validated successfully' 
                });

            } catch (error) {
                console.error('Code validation error:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to validate code' 
                });
            }
        });

        // Get bot status
        this.app.get('/api/bot-status', (req, res) => {
            res.json({
                status: this.botStatus,
                qrCode: this.qrCode,
                connected: this.botStatus === 'online',
                uptime: this.bot ? this.bot.getUptime() : '0s',
                activeCodes: this.codes.size
            });
        });

        // Get QR code for WhatsApp connection
        this.app.get('/api/qr-code', (req, res) => {
            res.json({
                success: true,
                qrCode: this.qrCode,
                status: this.botStatus
            });
        });

        // Link phone to bot
        this.app.post('/api/link-phone', async (req, res) => {
            try {
                const { phoneNumber, code } = req.body;
                
                // Validate code first
                const codeData = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM pairing_codes WHERE code = ?', [code], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!codeData || codeData.used || Date.now() > codeData.expiresAt) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid or expired code' 
                    });
                }

                // Format and validate phone number
                const formattedPhone = this.formatPhoneNumber(phoneNumber);
                if (!this.validateKenyanNumber(formattedPhone)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid Kenyan phone number' 
                    });
                }

                // Link phone to bot (if bot is online)
                if (this.bot && this.botStatus === 'online') {
                    // Add the phone number to the persistent store
                    linkedDevices.addLinkedDevice(formattedPhone);

                    this.broadcast({
                        type: 'phone_linked',
                        phoneNumber: formattedPhone,
                        linkedAt: new Date()
                    });

                    res.json({ 
                        success: true, 
                        phoneNumber: formattedPhone,
                        message: 'Phone linked successfully to bot' 
                    });
                } else {
                    res.status(503).json({ 
                        success: false, 
                        message: 'Bot is not online. Please connect bot first.' 
                    });
                }

            } catch (error) {
                console.error('Phone linking error:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to link phone' 
                });
            }
        });

        // Clean expired codes
        this.app.post('/api/cleanup-codes', (req, res) => {
            db.run('DELETE FROM pairing_codes WHERE expiresAt < ?', [Date.now()], function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Cleanup failed' });
                res.json({ success: true, cleanedCount: this.changes });
            });
        });
    }

    setupWebSocket(server) {
        const wss = new WebSocketServer({ server });
        
        wss.on('connection', (ws) => {
            console.log('New WebSocket connection');
            this.connectedClients.add(ws);
            
            // Send current status to new client
            db.get('SELECT COUNT(*) as count FROM pairing_codes WHERE expiresAt > ?', [Date.now()], (err, row) => {
                ws.send(JSON.stringify({
                    type: 'status_update',
                    botStatus: this.botStatus,
                    qrCode: this.qrCode,
                    activeCodes: err ? 0 : row.count
                }));
            });

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                this.connectedClients.delete(ws);
                console.log('WebSocket connection closed');
            });
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'request_status':
                ws.send(JSON.stringify({
                    type: 'status_update',
                    botStatus: this.botStatus,
                    qrCode: this.qrCode,
                    activeCodes: this.codes.size
                }));
                break;
            
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.connectedClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }

    async initializeBot() {
        try {
            console.log('Initializing Deca XMD Bot...');
            this.botStatus = 'connecting';
            
            // Create bot instance and pass connection update handler
            this.bot = new DecaXMDBot((update) => {
                this.botStatus = update.status;
                this.qrCode = update.qr || null;

                this.broadcast({
                    type: 'status_update',
                    botStatus: this.botStatus,
                    qrCode: this.qrCode,
                    activeCodes: this.codes.size
                });
            });

            // Start the bot
            await this.bot.start();
            
        } catch (error) {
            console.error('Bot initialization error:', error);
            this.botStatus = 'error';
            this.broadcast({
                type: 'bot_error',
                error: error.message
            });
        }
    }

    generatePairingCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    validateKenyanNumber(phone) {
        const cleaned = phone.replace(/[^0-9]/g, '');
        return cleaned.startsWith('2547') && cleaned.length === 12;
    }

    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('254')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('+254')) {
            return cleaned.slice(1);
        }
        return cleaned;
    }

    start() {
        const server = this.app.listen(this.port, () => {
            console.log(`🚀 Deca XMD Server running on port ${this.port}`);
            console.log(`📱 Website: http://localhost:${this.port}`);
            console.log(`🔌 WebSocket running on the same port.`);
        });

        this.setupWebSocket(server);

        // Clean up expired codes every 5 minutes
        setInterval(() => {
            db.run('DELETE FROM pairing_codes WHERE expiresAt < ?', [Date.now()], function(err) {
                if (err) {
                    console.error('DB cleanup error:', err.message);
                } else if (this.changes > 0) {
                    console.log(`Cleaned up ${this.changes} expired codes.`);
                }
            });
        }, 5 * 60 * 1000);
    }
}

// Start the server
async function startServer() {
    await settings.loadSettings();
    await linkedDevices.loadStore();
    const server = new DecaXMDServer();
    server.start();
}

startServer();

module.exports = DecaXMDServer;
