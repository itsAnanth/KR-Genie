const { MessageEmbed } = require('discord.js'),
    Skins = require('../../modules/skins'),
    { emotes, devs, staff, testers } = require('../../data'),
    db = require('../../modules'),
    notify = require('../../modules/notification'),
    { createEmbed } = require('../../modules/messageUtils'),
    marketDB = require('../../mongo/market/market'),
    comma = require('../../modules/comma');

module.exports = {
    name: 'buyskin',
    aliases: [],
    cooldown: 10,
    description: 'Use this command to buy skins from the market',
    expectedArgs: 'k/buyskin (amount) (skin name)',
    execute: async(message, args) => {
        if (!(devs.includes(message.author.id) || staff.includes(message.author.id) || testers.includes(message.author.id))) return;
        const user = await db.utils.get(message.author.id);
        if (!args[0]) return message.reply('What are paying for the skin lmao');
        // const price = parse(args[0], user.balance);
        if (isNaN(args[0])) return message.channel.send(createEmbed(message.author, 'RED', 'Provide the item ID, don\'t try to break me nerd'));
        // if (!args[1]) return message.reply('Which skin are you buying');
        const listings = await marketDB.utils.getListing(1);
        // const arg = args.splice(1).join(' ').toLowerCase();
        // const foundSkin = await listings.find(x => x.name.toLowerCase() == arg);
        // if (foundSkin == undefined) return message.channel.send(createEmbed(message.author, 'RED', 'That skin has not been listed'));
        const foundSkin = await listings.find(x => x.id == parseInt(args[0]));
        // console.log(foundSkin);
        if (foundSkin == undefined) return message.channel.send(createEmbed(message.author, 'RED', 'Unknown skin'));
        if (foundSkin.price > user.balance.wallet) return message.channel.send(createEmbed(message.author, 'RED', `You do not have ${emotes.kr}${foundSkin.price} in your wallet`));
        if (foundSkin.userID == message.author.id) return message.reply(createEmbed(message.author, 'RED', 'Dude what? you can\'t buy your own skin'));
        await user.inventory.skins.push(foundSkin.index);
        user.balance.wallet -= parseInt(foundSkin.price);
        const market = await marketDB.utils.get(1);
        const itemIndex = market.items.findIndex(x => x.id == foundSkin.id);
        market.items.splice(itemIndex, 1);
        await marketDB.set(1, market);
        await db.set(message.author.id, user);
        await db.utils.addKrToBank(foundSkin.userID, foundSkin.price);
        message.reply(new MessageEmbed()
            .setTitle('Succesfully Bought Skin!')
            .setColor('GREEN')
            .setDescription(`${Skins.emoteColorParse(foundSkin.rarity)} ${foundSkin.name} was bought for ${emotes.kr} ${foundSkin.price}`)
            .setFooter('Thank you for the purchase'),
        );
        const target = await message.client.users.fetch(`${foundSkin.userID}`).catch(() => {});
        notify(target, 'Bought Skin', `${message.author.tag} purchased your skin, ${Skins.emoteColorParse(foundSkin.rarity)}${foundSkin.name} for ${emotes.kr}${comma(foundSkin.price)}`, 'GREEN', 'stonks');
    },
};
