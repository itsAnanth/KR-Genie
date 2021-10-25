import { config } from 'dotenv';
config();
const env = process.env.NODE_ENV == 'PRODUCTION' ? 'PROD' : 'DEV';
// const env = 'PROD';
/* eslint-disable space-before-function-paren */
import { Client, Intents } from 'discord.js';
import memory from './modules/init-cache.js';
import logger from './modules/logger.js';
import { handleEvents, handleCommands } from './modules/core/index.js';
import Cache from './modules/Cache.js';

const intents = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    bot = new Client({ disableMentions: 'everyone', intents: intents });
global.cache = new Cache();
global.logger = logger;
memory();

(async function() {
    await handleCommands(bot);
    await handleEvents(bot);
})();


bot.login(env == 'PROD' ? process.env.TOKEN : process.env.TEST_TOKEN);

