const moment = require('moment-timezone');
const axios = require('axios');

class KenyanFeatures {
    constructor() {
        this.timezone = 'Africa/Nairobi';
        this.mpesaRates = {
            'Safaricom': { rate: 0.85, name: 'M-PESA Safaricom' },
            'Airtel': { rate: 0.82, name: 'Airtel Money' },
            'Telkom': { rate: 0.80, name: 'T-Kash' }
        };
        this.kiswahiliPhrases = [
            'Habari zako!', 'Karibu!', 'Asante sana!',
            'Niaje!', 'Mambo vipi?', 'Sema!',
            'Niaje sana!', 'Poa sana!', 'Chonjo!'
        ];
        this.kenyanSlang = [
            'Niaje', 'Mambo', 'Poa', 'Chonjo', 'Sema', 'Vipi',
            'Mchezaji', 'Msupa', 'Mwenyezi', 'Mdundiko', 'Mchizi'
        ];
    }

    getKenyanTime() {
        return moment().tz(this.timezone).format('HH:mm:ss');
    }

    getKenyanDate() {
        return moment().tz(this.timezone).format('DD-MM-YYYY');
    }

    getKenyanGreeting() {
        const hour = parseInt(this.getKenyanTime().split(':')[0]);
        
        if (hour < 12) {
            return 'Habari za asubuhi! 🌅';
        } else if (hour < 17) {
            return 'Habari za mchana! ☀️';
        } else if (hour < 20) {
            return 'Habari za jioni! 🌆';
        } else {
            return 'Habari za usiku! 🌙';
        }
    }

    getRandomKiswahiliGreeting() {
        return this.kiswahiliPhrases[Math.floor(Math.random() * this.kiswahiliPhrases.length)];
    }

    getRandomKenyanSlang() {
        return this.kenyanSlang[Math.floor(Math.random() * this.kenyanSlang.length)];
    }

    formatKenyanCurrency(amount) {
        return `KES ${amount.toLocaleString('en-KE')}`;
    }

    async getMpesaRate(provider = 'Safaricom') {
        const rate = this.mpesaRates[provider];
        if (!rate) return null;
        
        return {
            provider: rate.name,
            rate: rate.rate,
            example: `100 KES = ${(100 * rate.rate).toFixed(2)} USD`
        };
    }

    async getKenyanNews() {
        try {
            // Mock implementation - would integrate with actual Kenyan news API
            const news = [
                {
                    title: 'Latest Kenyan News Update',
                    source: 'Standard Media',
                    time: '2 hours ago',
                    summary: 'Breaking news from Kenya...'
                },
                {
                    title: 'Business News Kenya',
                    source: 'Business Daily',
                    time: '3 hours ago',
                    summary: 'Market updates and business news...'
                }
            ];
            
            return news;
        } catch (error) {
            return [];
        }
    }

    async getKenyanWeather(city = 'Nairobi') {
        try {
            // Mock implementation - would integrate with actual weather API
            const weatherData = {
                'Nairobi': { temp: 22, condition: 'Partly Cloudy', humidity: 65 },
                'Mombasa': { temp: 28, condition: 'Sunny', humidity: 75 },
                'Kisumu': { temp: 24, condition: 'Cloudy', humidity: 70 },
                'Eldoret': { temp: 20, condition: 'Clear', humidity: 60 }
            };
            
            const weather = weatherData[city] || weatherData['Nairobi'];
            
            return {
                city: city,
                temperature: `${weather.temp}°C`,
                condition: weather.condition,
                humidity: `${weather.humidity}%`,
                time: this.getKenyanTime()
            };
        } catch (error) {
            return null;
        }
    }

    getKenyanHolidays() {
        const holidays = [
            { date: '01-01', name: 'New Year\'s Day' },
            { date: '12-12', name: 'Jamhuri Day' },
            { date: '20-10', name: 'Mashujaa Day' },
            { date: '01-06', name: 'Madaraka Day' },
            { date: '10-10', name: 'Huduma Day' },
            { date: '25-12', name: 'Christmas Day' },
            { date: '26-12', name: 'Boxing Day' }
        ];
        
        const today = this.getKenyanDate();
        const todayHoliday = holidays.find(h => h.date === today.slice(5));
        
        return {
            today: todayHoliday,
            upcoming: holidays.filter(h => h.date > today.slice(5)).slice(0, 3)
        };
    }

    async getKenyanFootballScores() {
        try {
            // Mock implementation - would integrate with actual sports API
            const scores = [
                { team1: 'Gor Mahia', team2: 'Tusker', score: '2-1', time: 'FT' },
                { team1: 'AFC Leopards', team2: 'Kakamega Homeboyz', score: '1-1', time: '75\'' },
                { team1: 'Bandari', team2: 'Kariobangi Sharks', score: '0-0', time: 'HT' }
            ];
            
            return scores;
        } catch (error) {
            return [];
        }
    }

    getKenyanProvinces() {
        return [
            'Nairobi', 'Coast', 'North Eastern', 'Eastern', 
            'Central', 'Rift Valley', 'Nyanza', 'Western'
        ];
    }

    getKenyanCounties() {
        return [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
            'Thika', 'Kitale', 'Garissa', 'Malindi', 'Lamu',
            'Kakamega', 'Kisii', 'Bungoma', 'Webuye', 'Machakos'
        ];
    }

    formatKenyanPhoneNumber(phone) {
        // Format Kenyan phone numbers
        if (phone.startsWith('254')) {
            return phone;
        } else if (phone.startsWith('0')) {
            return '254' + phone.slice(1);
        } else if (phone.startsWith('+254')) {
            return phone.slice(1);
        }
        return phone;
    }

    isKenyanNumber(phone) {
        const formatted = this.formatKenyanPhoneNumber(phone);
        return formatted.startsWith('2547') && formatted.length === 12;
    }

    getKenyanProviders() {
        return [
            'Safaricom', 'Airtel', 'Telkom Kenya', 'Jamii Telecom'
        ];
    }

    async getMpesaTransactionStatus(transactionId) {
        // Mock implementation - would integrate with actual M-PESA API
        return {
            transactionId: transactionId,
            status: 'Completed',
            amount: 1000,
            recipient: '+254712345678',
            time: this.getKenyanTime(),
            reference: 'DECA' + Math.random().toString(36).substring(2, 8).toUpperCase()
        };
    }

    generateKenyanMenu() {
        return `🇰🇪 *KENYAN FEATURES MENU* 🇰🇪\n\n` +
               `⏰ *Time & Date*\n` +
               `• !kenyatime - Current Kenya time\n` +
               `• !kenyadate - Current Kenya date\n` +
               `• !greeting - Kenyan greeting\n\n` +
               `💰 *M-PESA Services*\n` +
               `• !mpesastatus - Check transaction status\n` +
               `• !rates - M-PESA exchange rates\n\n` +
               `📰 *News & Info*\n` +
               `• !kenyanews - Latest Kenyan news\n` +
               `• !weather [city] - Weather update\n` +
               `• !holidays - Kenyan holidays\n\n` +
               `⚽ *Sports*\n` +
               `• !fplscores - Football scores\n\n` +
               `💬 *Kenyan Chat*\n` +
               `• !swahili - Random Swahili phrase\n` +
               `• !slang - Kenyan slang\n\n` +
               `📞 *Utilities*\n` +
               `• !formatnumber - Format Kenyan number\n` +
               `• !providers - Mobile providers\n\n` +
               `🌍 *Kenyan Geography*\n` +
               `• !counties - List of counties\n` +
               `• !provinces - List of provinces`;
    }

    async processKenyanCommand(command, args = []) {
        switch (command.toLowerCase()) {
            case 'kenyatime':
                return `⏰ Current Kenya Time: ${this.getKenyanTime()}`;
                
            case 'kenyadate':
                return `📅 Today's Date: ${this.getKenyanDate()}`;
                
            case 'greeting':
                return `${this.getKenyanGreeting()}\n${this.getRandomKiswahiliGreeting()}`;
                
            case 'swahili':
                return `💬 Random Swahili: ${this.getRandomKiswahiliGreeting()}`;
                
            case 'slang':
                return `🔥 Kenyan Slang: ${this.getRandomKenyanSlang()}`;
                
            case 'weather':
                const city = args[0] || 'Nairobi';
                const weather = await this.getKenyanWeather(city);
                if (weather) {
                    return `🌤️ *Weather in ${weather.city}*\n\n` +
                           `🌡️ Temperature: ${weather.temperature}\n` +
                           `☁️ Condition: ${weather.condition}\n` +
                           `💧 Humidity: ${weather.humidity}\n` +
                           `⏰ Time: ${weather.time}`;
                }
                return '❌ Weather data not available';
                
            case 'kenyanews':
                const news = await this.getKenyanNews();
                if (news.length > 0) {
                    let newsText = '📰 *Latest Kenyan News*\n\n';
                    news.forEach((item, index) => {
                        newsText += `${index + 1}. *${item.title}*\n` +
                                   `   📺 ${item.source}\n` +
                                   `   ⏰ ${item.time}\n` +
                                   `   📝 ${item.summary}\n\n`;
                    });
                    return newsText;
                }
                return '❌ News not available';
                
            case 'holidays':
                const holidays = this.getKenyanHolidays();
                let holidayText = '🎉 *Kenyan Holidays*\n\n';
                
                if (holidays.today) {
                    holidayText += `🎊 Today: ${holidays.today.name}\n\n`;
                }
                
                holidayText += '📅 Upcoming:\n';
                holidays.upcoming.forEach((holiday, index) => {
                    holidayText += `${index + 1}. ${holiday.date} - ${holiday.name}\n`;
                });
                
                return holidayText;
                
            case 'fplscores':
                const scores = await this.getKenyanFootballScores();
                if (scores.length > 0) {
                    let scoreText = '⚽ *Kenyan Football Scores*\n\n';
                    scores.forEach((match, index) => {
                        scoreText += `${index + 1}. ${match.team1} ${match.score} ${match.team2}\n` +
                                     `   ⏰ ${match.time}\n\n`;
                    });
                    return scoreText;
                }
                return '❌ No scores available';
                
            case 'rates':
                let ratesText = '💱 *M-PESA Exchange Rates*\n\n';
                for (const [provider, data] of Object.entries(this.mpesaRates)) {
                    ratesText += `💰 ${data.name}\n` +
                                `   Rate: 1 USD = ${(1/data.rate).toFixed(2)} KES\n` +
                                `   ${data.example}\n\n`;
                }
                return ratesText;
                
            case 'counties':
                const counties = this.getKenyanCounties();
                return `🏘️ *Kenyan Counties*\n\n${counties.join(', ')}`;
                
            case 'provinces':
                const provinces = this.getKenyanProvinces();
                return `🌍 *Kenyan Provinces*\n\n${provinces.join(', ')}`;
                
            case 'providers':
                const providers = this.getKenyanProviders();
                return `📱 *Kenyan Mobile Providers*\n\n${providers.join(', ')}`;
                
            case 'formatnumber':
                const phone = args[0];
                if (phone) {
                    const formatted = this.formatKenyanPhoneNumber(phone);
                    const isKenyan = this.isKenyanNumber(phone);
                    return `📞 *Phone Number Formatter*\n\n` +
                           `Original: ${phone}\n` +
                           `Formatted: ${formatted}\n` +
                           `Kenyan: ${isKenyan ? '✅ Yes' : '❌ No'}`;
                }
                return '❌ Please provide a phone number';
                
            default:
                return '❌ Unknown Kenyan command. Type !kenyanmenu for options.';
        }
    }
}

module.exports = KenyanFeatures;
