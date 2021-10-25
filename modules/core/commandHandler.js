import fs from 'fs';
import { Collection } from 'discord.js';

async function init(bot) {
    bot.commands = new Collection();
    const commandFolders = fs.readdirSync('./commands');
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            let command = await import(`../../commands/${folder}/${file}`);
            command = command.default;
            command.module = folder;
            bot.commands.set(command.name, command);
        }
    }
}

export default init;
