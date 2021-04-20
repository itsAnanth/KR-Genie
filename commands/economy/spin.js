const skinfetcher = require('../../scripts/skins');
const skins = require('../../data/skins');
const dependencies = require('../../data');
const { MessageEmbed } = require('discord.js');
module.exports = {
    name: 'spin',
    cooldown: 10,
    execute: async(message) => {
        // if (!dependencies.betaTesters.testers.includes(message.author.id)) return message.reply('This command is only available for Beta Testers , contact EJ BEAN#3961 to be a part of beta test!')
        const { wallet } = await dependencies.economy.balance(message.author.id);
        if (wallet < 500) return message.channel.send('you do not have 500kr to do a heroic spin (beta)');
        const rarity = Math.floor(Math.random() * 1000)
        let randomskin;
        if (rarity <= 9){
            randomskin = skinfetcher.sorted[6][Math.floor(Math.random() * skinfetcher.sorted[6].length)]
        } else if (rarity > 9 && rarity <= 48){
            randomskin = skinfetcher.sorted[5][Math.floor(Math.random() * skinfetcher.sorted[5].length)]
        } else if (rarity > 48 && rarity <= 140){
            randomskin = skinfetcher.sorted[4][Math.floor(Math.random() * skinfetcher.sorted[4].length)]
        } else if (rarity > 140 && rarity <= 280){
            randomskin = skinfetcher.sorted[3][Math.floor(Math.random() * skinfetcher.sorted[3].length)]
        } else if (rarity > 280 && rarity <= 500){
            randomskin = skinfetcher.sorted[2][Math.floor(Math.random() * skinfetcher.sorted[2].length)]
        } else if (rarity > 500 && rarity <= 1000){
            randomskin = skinfetcher.sorted[1][Math.floor(Math.random() * skinfetcher.sorted[1].length)]
        }

        const preview = skinfetcher.getPreview(randomskin);
        const weaponRarity = skinfetcher.textColorParse(randomskin.rarity);
        const color = skinfetcher.colorParse(randomskin.rarity);
        let weap;
        if (randomskin.weapon) weap = randomskin.weapon;
        else weap = '';
        const type = skinfetcher.getWeaponByID(weap);
        console.log(color);
        let season;
        if (randomskin.seas) season = randomskin.seas;
        else season = '1';
        let creator;
        if (randomskin.creator) creator = randomskin.creator;
        else creator = 'krunker.io';
        const skininfo = { name: randomskin.name.toLowerCase(), id: randomskin.id, rarity: randomskin.rarity, color: color, link: preview, seas: season, class: randomskin.weapon };
        message.channel.send(new MessageEmbed()
            .setAuthor(message.author.username, message.author.displayAvatarURL({ dynamic: false }))
            .setTitle(`${dependencies.emotes.kr} Heroic Spin`)
            .setColor(`${color}`)
            .setDescription(`You unboxed **${randomskin.name}**! | **${await type}**`)
            .addFields(
                { name: 'Rarity', value: `${await weaponRarity}`, inline: true },
                { name: 'Creator', value: `${creator}`, inline: true },
                { name: 'Season', value: `${season}`, inline: true },
            )
            .setImage(preview)
            .setFooter('Feeding your gambling addiction ™'));
        await dependencies.economy.addKR(message.author.id, -500);
        await dependencies.economy.addSkin(message.author.id, skininfo);
    },
};
