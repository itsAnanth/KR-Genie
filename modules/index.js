/* eslint-disable no-empty-function */
const Keyv = require('@keyvhq/keyv');
const KeyvRedis = require('@keyvhq/keyv-redis');
require('dotenv').config();
const store = new KeyvRedis(process.env.REDIS_URL);
const keyv = new Keyv({
    store,
});
const promisify = require('pify');
keyv.on('error', (...error) => console.error('keyv error: ', ...error));

class DBClient {

    constructor() {
        this.keyv = keyv;

        this.set = this.keyv.set;
        this.delete = this.keyv.delete;
        this.clear = this.keyv.clear;
        this.utils = new DBUtils(this.keyv);
        return this;
    }

    async* iterator() {
        const scan = promisify(this.keyv.options.store.redis.scan).bind(this.keyv.options.store.redis);

        async function * iterate(curs, pattern) {
            const [cursor, keys] = await scan(curs, 'MATCH', pattern);
            for (const key of keys) yield key.split(':')[1];
            if (cursor !== '0') yield * iterate(cursor, pattern);
        }

        yield * iterate(0, `${this.keyv.options.namespace}:*`);
    }

    async values() {
        const iterator = await this.iterator();
        const keyPromise = [];
        for await (const key of iterator)
            keyPromise.push(await this.keyv.get(key));
        const keys = await Promise.all(keyPromise);
        return keys;
    }

}

class DBUtils {

    constructor(optsKeyv) {
        this.keyv = optsKeyv;
        return this;
    }

    async get(id) {
        let val = await this.keyv.get(id);
        if (!val) {
            val = {
                id,
                balance: {
                    wallet: 0,
                    bank: 0,
                },
                inventory: {
                    skins: [],
                },
            };
        }
        return val;
    }

    async addKR(id, kr) {
        return this.get(id).then(value => {
            value.balance.wallet += Number(kr);
            return this.keyv.set(id, value);
        });
    }

    async balance(id) {
        return this.get(id).then(x => x.balance);
    }

    async deposit(id, amount) {
        return this.get(id).then(async x => {
            x.balance.wallet -= amount;
            x.balance.bank += amount;
            await this.keyv.set(id, x);
            return x.balance.bank;
        });
    }

    async withdraw(id, amount) {
        return this.get(id).then(async x => {
            x.balance.wallet += amount;
            x.balance.bank -= amount;
            await this.keyv.set(id, x);
            return x.balance.bank;
        });
    }

    async skinInventory(id) {
        return this.get(id).then(x => x.inventory.skins);
    }

    async addSkin(id, skin) {
        return this.get(id).then(async x => {
            if (skin instanceof Array) x.inventory.skins = x.inventory.skins.concat(skin);
            else x.inventory.skins.push(skin);
            await this.keyv.set(id, x);
            return x.inventory.skins;
        });
    }

}
const client = new DBClient;
const bench = {};
if (process.env.BENCHMARK) {
    console.debug('ENABLING BENCHMARKS!');
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(x => x != 'constructor')) {
        bench[key] = [];
        module.exports[key] = async(...args) => {
            const start = process.hrtime();
            const val = await client[key](...args);
            const time = process.hrtime(start);
            const arr = bench[key];
            arr.push(time[0] + (time[1] / 1e9));
            bench[key] = arr;
            return val;
        };
    }
    console.debug('Benchmarks: ', bench);
} else
    module.exports = client;
module.exports.bench = bench;