import { rewards } from '../../modules/db/vote.js';
import { MessageEmbed, MessageButton, MessageActionRow } from 'discord.js';
import fetch from 'node-fetch';
import { core, emotes } from '../../data/index.js';
const ku = '616588768358694913';
import { config } from 'dotenv';

config();

export default {
    name: 'vote',
    aliases: ['upvote'],
    cooldown: 5,
    description: 'Shows the latest updates made to the bot',
    expectedArgs: 'k/info',
    execute: async(message, _, bot) => {
        const url = `https://top.gg/api/bots/${ku}/check?userId=${message.author.id}`;
        const res = await fetch(url, { method: 'GET', headers: { Authorization: process.env.TOPGG_TOKEN } });
        const text = await res.text();
        const isVoted = JSON.parse(text).voted;
        console.log(isVoted);
        if (isVoted !== 1) {
            const voteEmbed = new MessageEmbed()
                .setColor(core.embed)
                .setAuthor(message.author.username, message.author.displayAvatarURL({ dynamic: true }))
                .setDescription(`Vote our bots in top.gg for some ${emotes.kr}`)
                .setFooter('Run the command again once you have voted');
            const btns = [
                new MessageButton().setStyle('LINK').setURL('https://top.gg/bot/616588768358694913/vote').setLabel('Vote')
            ];

            message.reply({ embeds: [voteEmbed], components: [new MessageActionRow().addComponents(...btns) ] });
        } else
            rewards(message.author.id, message);
    }
};
