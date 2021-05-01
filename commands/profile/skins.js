const Skins = require('../../modules/skins'),
    db = require('../../modules'),
    Paginator = require('../../modules/paginate');

module.exports = {
    name: 'skins',
    aliases: ['skinsinv'],
    cooldown: 5,
    description: 'Shows the list of skins owned by an user',
    expectedArgs: 'k/skins [ID / @user]',
    execute: async(message, args) => {
        const skinsarr = [];
        let user;
        if (!args[0] || (Number.isInteger(parseInt(args[0])) && args[0].length < 5))
            user = message.author;
        else {
            const target = await message.client.users.fetch(args.shift().replace(/\D/g, '')).catch(() => {});
            if (!target) return message.reply('No user found!');
            else user = target;
        }
        const dupes = new Map();
        const data = (await db.utils.skinInventory(user.id)).map(x => Skins.allSkins[x]).sort((a, b) => a.rarity - b.rarity).reverse()
            .filter(x => {
                const count = dupes.get(x.index) || 0;
                dupes.set(x.index, count + 1);
                return !count;
            });
        for (const skin of data) {
            const link = Skins.getMarketLink(skin);
            const count = dupes.get(skin.index);
            skinsarr.push(`${Skins.emoteColorParse(skin.rarity)} [${skin.name}](${link})${count == 1 ? '' : ` x ${count}`}`);
        }

        const generateEmbed = (start, count) => skinsarr.slice(start, start + count).join('\n');

        let page = args.shift();
        const max = Math.ceil(skinsarr.length / 10);
        if (!Number.isInteger(page)) page = 1;
        if (page <= 0) return message.reply('Page no. has to be greater than 0, nitwit');
        if (page > max) page = max;

        const paginator = new Paginator(message.client, message.channel, {
            page,
            max,
            embed: {
                color: 'GREEN',
            },
            count: 10,
            maxValues: skinsarr.length,
        }, generateEmbed);

        await paginator.start();
        return new Promise((resolve) => {
            paginator.on('end', resolve);
        });
    },
};

