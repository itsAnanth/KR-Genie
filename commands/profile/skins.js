const Skins = require('../../modules/skins');
const db = require('../../modules');

const { MessageEmbed } = require('discord.js');
module.exports = {
    name: 'skins',
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
        let footer;
        let pageNumber;
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
            skinsarr.push(`${Skins.emoteColorParse(skin.rarity)} [${skin.name}](${await link})${count == 1 ? '' : ` x ${count}`}`);
        }
        /**
         * Creates an embed with skinsarr starting from an index.
         * @param {number} start The index to start from.
         */
        const generateEmbed = start => {
            const current = skinsarr.slice(start, start + 10);
            const embed = new MessageEmbed()
                .setAuthor(`Requested by ${message.author.username}`, message.author.displayAvatarURL({ dynamic: true }))
                .setTitle(`${user.username}'s Skins`)
                .setDescription(`Showing skins ${start + 1}-${start + current.length} out of ${skinsarr.length}`)
                .setFooter(footer);
            current.forEach(g => embed.addField('\u200b', g));
            return embed;
        };
        if (skinsarr.length < 10) {
            footer = '1 out of 1';
            message.channel.send(generateEmbed(0));
            return;
        }

        const page = args.shift();
        if (!page) {
            let lastPage = skinsarr.length / 10;
            if (!Number.isInteger(lastPage)) lastPage = parseInt(lastPage.toFixed(0)) + 1;
            footer = `1 out of ${lastPage}`;
            message.channel.send(generateEmbed(0));
        } else {
            let lastPage = skinsarr.length / 10;
            if (!Number.isInteger(lastPage)) lastPage = parseInt(lastPage.toFixed(0)) + 1;
            footer = `${page} out of ${lastPage}`;
            pageNumber = page - 1;
            const currentindex = parseInt(pageNumber * 10);
            console.log(currentindex);
            if (currentindex > skinsarr.length) return;
            message.channel.send(generateEmbed(currentindex));
        }
    },
};
