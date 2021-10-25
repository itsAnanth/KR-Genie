import logger from '../modules/logger.js';
import { load } from '../modules/messageUtils.js';
import { MessageEmbed } from 'discord.js';
import data, { id, core } from '../data/index.js';
import cron from 'node-cron';
import db from '../modules/db/economy.js';

const env = process.env.NODE_ENV == 'PRODUCTION' ? 'PROD' : 'DEV';
export default {
    name: 'ready',
    execute: async(bot) => {
        //     logger.debug('Logged in', bot.user.username);

        if (env == 'PROD') {
            logger.debug('env set', 'PROD');
            await bot.user.setPresence({ activities: [{ name: 'KR fly by', type: 'WATCHING' }], status: 'online' });
            logger.info('Ready!');
            load(bot);
            await logger.init(bot);

            bot.channels.resolve(id.channels.logs).send({
                embeds: [new MessageEmbed()
                    .setDescription(`\`\`\`diff\n+ Logged in as ${bot.user.username}\n- Version : ${core.version}\`\`\`\nDatabase: KeyvHQ-Redis, KeyvHQ-Mongo\nstatus: connected <a:check:827647433445474314>`)
                    .setTimestamp()]
            }).catch(console.error);

            process.on('unhandledRejection', logger.unhandledError);
            process.on('SIGTERM', async() => {
                const presence = await bot.user.setPresence({ activities: [{ name: 'SHUTTING DOWN', type: 'WATCHING' }], status: 'dnd' });
                if (!presence) {
                    logger.info('SHUT DOWN!');
                    process.exit(0);
                } else {
                    logger.info('SHUTTING DOWN WITHOUT PRESENCE!');
                    process.exit(0);
                }
            });
            cron.schedule('30 14 * * *', () => { db.backup(bot.channels.resolve(data.id.channels['backup-dump'])); }); // Every day at 2:30 PM
        } else
            bot.user.setPresence({ activities: [{ name: 'KR fly by', type: 'WATCHING' }], status: 'online' });
    }
};
