const data = require('../../data'),
    devs = data.devs,
    staff = data.staff,
    logger = require('../../modules/logger'),
    items = require('../../data/items'),
    db = require('../../modules'),
    { createEmbed } = require('../../modules/messageUtils');
module.exports = {
    name: 'additem',
    dev: true,
    execute: async(message, args) => {
        if (!(devs.includes(message.author.id) || staff.includes(message.author.id))) return;
        if (!args[0]) return;
        const target = await message.client.users.fetch(args[0].replace(/\D/g, '')).catch(() => {});
        if (!target) return message.channel.send(createEmbed(message.author, 'RED', 'Unknown user'));
        args.shift();
        const item = args.join(' ').toLowerCase();
        const found = await items.items.find(x => x.name.toLowerCase() == item);
        if (found == undefined) return message.channel.send(createEmbed(message.author, 'RED', 'Unknown item'));
        await db.utils.addItem(target.id, found.id);
        message.channel.send(`Successfully added \`${item}\` to \`${target.username}\``);
        logger.commandsLog(message.author, 'additem', `**${message.author.tag}** added \`${item}\` to **${target.tag}**`, message.guild, args.join(' '), `Item: ${item}`);
    },
};