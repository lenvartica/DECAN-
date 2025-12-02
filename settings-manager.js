const db = require('./database');

const defaultSettings = {
    botName: 'Deca XMD',
    version: '3.0.0',
    owner: '+254711225405',
    prefix: '!',
    autoRead: true,
    autoReply: true,
    youtubeEnabled: true,
    viewOnceEnabled: true,
    antiMentionEnabled: true,
    kenyanFeaturesEnabled: true,
    adultCommandsEnabled: false, // Disabled by default
};

let settings = { ...defaultSettings };

function loadSettings() {
    return new Promise((resolve, reject) => {
        db.all('SELECT key, value FROM settings', [], (err, rows) => {
            if (err) {
                console.error('Error loading settings from DB', err);
                return reject(err);
            }
            
            if (rows.length === 0) {
                // No settings in DB, insert defaults
                const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
                for (const [key, value] of Object.entries(defaultSettings)) {
                    stmt.run(key, String(value));
                }
                stmt.finalize((err) => {
                    if (err) reject(err);
                    else resolve(settings);
                });
            } else {
                // Load settings from DB
                rows.forEach(row => {
                    settings[row.key] = row.value;
                });
                resolve(settings);
            }
        });
    });
}

function get(key) {
    return settings[key];
}

function set(key, value) {
    return new Promise((resolve, reject) => {
        if (key in defaultSettings) {
            const strValue = String(value);
            db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, strValue], (err) => {
                if (err) {
                    console.error('Error saving setting to DB', err);
                    return reject(err);
                }
                settings[key] = value; // Update in-memory cache
                resolve(true);
            });
        } else {
            resolve(false); // Key does not exist in default settings
        }
    });
}

function getAll() {
    return { ...settings };
}


module.exports = {
    loadSettings,
    get,
    set,
    getAll,
};
