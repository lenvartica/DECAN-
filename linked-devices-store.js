const db = require('./database');

let linkedDevices = new Set();

function loadStore() {
    return new Promise((resolve, reject) => {
        db.all('SELECT jid FROM linked_devices', [], (err, rows) => {
            if (err) {
                console.error('Error loading linked devices from DB', err);
                return reject(err);
            }
            linkedDevices = new Set(rows.map(r => r.jid));
            resolve();
        });
    });
}

function addLinkedDevice(phoneNumber) {
    const jid = `${phoneNumber}@s.whatsapp.net`;
    if (!linkedDevices.has(jid)) {
        db.run('INSERT OR IGNORE INTO linked_devices (jid) VALUES (?)', [jid], (err) => {
            if (err) {
                console.error('Error adding linked device to DB', err);
            } else {
                linkedDevices.add(jid);
                console.log(`[Store] Added new linked device: ${jid}`);
            }
        });
    }
}

function isLinked(jid) {
    return linkedDevices.has(jid);
}

function getLinkedDevices() {
    return [...linkedDevices];
}

module.exports = {
    loadStore,
    addLinkedDevice,
    isLinked,
    getLinkedDevices,
};
