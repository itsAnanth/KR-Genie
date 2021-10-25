import fs from 'fs';

async function init(bot) {
    const eventsFolder = fs.readdirSync('./events').filter(x => x.endsWith('js'));
    for (const file of eventsFolder) {
        let event = await import(`../../events/${file}`);
        event = event.default;
        bot.on(event.name.toString(), event.execute.bind(null, bot));
    }
}

export default init;
