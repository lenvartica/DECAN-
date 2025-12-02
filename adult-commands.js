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

// --- Adult (NSFW) Commands ---

async function nsfw(sock, msg, args) {
    const subreddits = ['nsfw', 'pussy', 'rearpussy', 'gonewild', 'ass', 'boobs'];
    const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    const data = await fetchFromAPI(`https://meme-api.com/gimme/${randomSubreddit}`);
    
    if (data && data.url) {
        await sock.sendMessage(msg.key.remoteJid, {
            image: { url: data.url },
            caption: `🔞 ${data.title}`,
            nsfw: true // Mark the message as NSFW
        });
    } else {
        return 'Could not fetch NSFW content at this time. Please try again later.';
    }
}

async function randomHentai(sock, msg, args) {
    const data = await fetchFromAPI('https://api.waifu.pics/nsfw/waifu');
    
    if (data && data.url) {
        await sock.sendMessage(msg.key.remoteJid, {
            image: { url: data.url },
            caption: 'Here is your random hentai image.',
            nsfw: true
        });
    } else {
        return 'Could not fetch hentai content at this time.';
    }
}

async function e621(sock, msg, args) {
    const query = args.join(' ');
    if (!query) return 'Please provide a search query for e621.';

    // Note: e621 API requires a User-Agent header
    try {
        const response = await axios.get(`https://e621.net/posts.json?tags=${encodeURIComponent(query)}&limit=5`, {
            headers: { 'User-Agent': 'DecaXMD-Bot/1.0' }
        });
        const posts = response.data.posts;
        if (posts && posts.length > 0) {
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: randomPost.file.url },
                caption: `*e621 Result for*: ${query}\n*Rating*: ${randomPost.rating.toUpperCase()}`,
                nsfw: true
            });
        } else {
            return 'No results found for that query on e621.';
        }
    } catch (error) {
        return 'Failed to fetch from e621 API.';
    }
}

module.exports = {
    nsfw,
    hentai: randomHentai,
    e621,
};
