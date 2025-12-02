const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bot_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const initScript = `
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS linked_devices (
            jid TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS pairing_codes (
            code TEXT PRIMARY KEY,
            phoneNumber TEXT NOT NULL,
            expiresAt INTEGER NOT NULL,
            used INTEGER DEFAULT 0
        );
    `;
    
    db.exec(initScript, (err) => {
        if (err) {
            console.error('Error initializing database tables', err.message);
        } else {
            console.log('Database tables initialized successfully.');
        }
    });
}

module.exports = db;
