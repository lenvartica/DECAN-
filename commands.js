const axios = require('axios');

// Helper function for making API requests
async function fetchFromAPI(url, params = {}) {
    try {
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error(`API request failed: ${error.message}`);
        return null;
    }
}

// --- Group Management Commands ---

async function promote(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) return 'This command can only be used in groups.';
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const botIsAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin;

    if (!botIsAdmin) return 'I need to be an admin to promote members.';

    const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
    if (!target) return 'Please mention a user to promote.';

    await sock.groupParticipantsUpdate(msg.key.remoteJid, [target], 'promote');
    return `👑 @${target.split('@')[0]} has been promoted to admin.`;
}

async function demote(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) return 'This command can only be used in groups.';
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const botIsAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin;

    if (!botIsAdmin) return 'I need to be an admin to demote members.';

    const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
    if (!target) return 'Please mention a user to demote.';

    await sock.groupParticipantsUpdate(msg.key.remoteJid, [target], 'demote');
    return `👤 @${target.split('@')[0]} has been demoted.`;
}

async function kick(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) return 'This command can only be used in groups.';
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const botIsAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin;

    if (!botIsAdmin) return 'I need to be an admin to kick members.';

    const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
    if (!target) return 'Please mention a user to kick.';

    await sock.groupParticipantsUpdate(msg.key.remoteJid, [target], 'remove');
    return `👢 @${target.split('@')[0]} has been kicked from the group.`;
}

async function groupInfo(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) return 'This command can only be used in groups.';
    const metadata = await sock.groupMetadata(msg.key.remoteJid);
    return `*Group Info*:
- *Name*: ${metadata.subject}
- *Members*: ${metadata.participants.length}
- *Admins*: ${metadata.participants.filter(p => p.admin).length}`;
}

// --- Fun & Games Commands ---

async function joke(sock, msg, args) {
    const data = await fetchFromAPI('https://v2.jokeapi.dev/joke/Any?type=single');
    return data ? data.joke : 'Could not fetch a joke at this time.';
}

async function quote(sock, msg, args) {
    const data = await fetchFromAPI('https://api.quotable.io/random');
    return data ? `"${data.content}" - ${data.author}` : 'Could not fetch a quote at this time.';
}

async function meme(sock, msg, args) {
    const data = await fetchFromAPI('https://meme-api.com/gimme');
    if (data && data.url) {
        await sock.sendMessage(msg.key.remoteJid, { image: { url: data.url }, caption: data.title });
    } else {
        return 'Could not fetch a meme at this time.';
    }
}

// --- Utility Tools Commands ---

async function weather(sock, msg, args) {
    const city = args.join(' ');
    if (!city) return 'Please provide a city name.';
    // Note: You need an API key for OpenWeatherMap
    const apiKey = process.env.WEATHER_API_KEY || '';
    if (!apiKey) return 'Weather API key is not configured.';

    const data = await fetchFromAPI(`https://api.openweathermap.org/data/2.5/weather`, { q: city, appid: apiKey, units: 'metric' });
    if (data && data.weather) {
        return `*Weather in ${data.name}*:
- *Condition*: ${data.weather[0].description}
- *Temperature*: ${data.main.temp}°C
- *Humidity*: ${data.main.humidity}%`;
    }
    return 'Could not fetch weather data for that city.';
}

async function translate(sock, msg, args) {
    const lang = args[0];
    const text = args.slice(1).join(' ');
    if (!lang || !text) return 'Usage: !translate <language_code> <text>';

    const data = await fetchFromAPI(`https://api.mymemory.translated.net/get`, { q: text, langpair: `en|${lang}` });
    return data ? data.responseData.translatedText : 'Translation failed.';
}

// --- Search Commands ---

async function google(sock, msg, args) {
    const query = args.join(' ');
    if (!query) return 'Please provide a search query.';
    // This is a simplified search link. A proper implementation would use a search API.
    return `Here is a Google search link for your query: https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

module.exports = {
    promote, demote, kick, groupInfo,
    joke, quote, meme,
    weather, translate,
    google,
};
