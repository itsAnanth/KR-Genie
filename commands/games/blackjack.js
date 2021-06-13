import db               from '../../modules/db/economy.js';
import comma            from '../../modules/comma.js';
import Deck             from '52-deck';
import { emotes }       from '../../data/index.js';
import { EventEmitter } from 'events';
import { MessageEmbed } from 'discord.js';
import messageUtils     from '../../modules/messageUtils.js';

// Game class
class Game extends EventEmitter {
    constructor({deck, hand, dealer, channel}) {
        super();
        this.deck       = deck;
        this.hand       = hand;
        this.dealer     = dealer;
        this.channel    = channel;
        this.hide       = true;
        return this;
    }

    start() {
        if (this.hand.values.includes(21) && this.dealer.hiddenValues.includes(21)) this.emit('push');
        else if (this.hand.values.includes(21)) this.emit('win', 'blackjack');
        else if (this.dealer.hiddenValues.includes(21)) this.emit('lose', 'blackjack');
    }

    hit() {
        const newCard = this.deck.shift();
        this.hand.cards.push(newCard);
        this.hand.values = cardsToValues(this.hand.cards, false);
        this.channel.send(new MessageEmbed()
            .setColor('YELLOW')
            .setDescription(`\`\`\`You drew: ${cardToStr(newCard)}\`\`\``)
        );

        if (this.hand.values.includes(21)) {
            if (this.dealer.hiddenValues.includes(21)) this.emit('push');
            else this.emit('win');
        } else if (this.hand.values[0] > 21) this.emit('lose', 'bust');
        else this.emit('continue');
    }

    stand() {
        const   playerHighest = this.hand.values[this.hand.values.length - 1],
                dealerHighest = this.dealer.hiddenValues[this.dealer.hiddenValues.length - 1];

        if (playerHighest == dealerHighest) this.emit('push');
        else if (playerHighest < dealerHighest) this.emit('lose', '');
        else if (dealerHighest >= 17) this.emit('win', '');
        else {
            const newCard = this.deck.shift()
            this.dealer.cards.push(newCard);
            this.dealer.hiddenValues = cardsToValues(this.dealer.cards, false);
            this.channel.send(new MessageEmbed()
                .setColor('YELLOW')
                .setDescription(`\`\`\`Dealer drew: ${cardToStr(newCard)}\`\`\``)
            );

            if (this.dealer.hiddenValues[0] > 21) this.emit('win', 'bust');
            else this.stand();
        }
    }
}

// Game command
export default {
    name:           'bjack',
    aliases:        ['bj', 'blackjack'],
    cooldown:       5,
    description:    'A standard game of Blackjack',
    expectedArgs:   'k/bj [amount]',
    execute: async(message, args) => {
        if (!args[0]) return message.reply(messageUtils.createEmbed(message.author, 'RED', 'You need to bet something nerd...'));

        // Set up funds
        const balance   = await db.utils.balance(message.author.id);
        var bet         = messageUtils.parse(args[0], balance);

        if (isNaN(bet))                 return message.reply(messageUtils.createEmbed(message.author, 'RED', 'Provide a valid bet, don\'t try to break me'));
        else if (balance.wallet <= 0)   return message.reply(messageUtils.createEmbed(message.author, 'RED', 'lmao empty wallet'));
        else if (bet > balance.wallet)  return message.reply(messageUtils.createEmbed(message.author, 'RED', `You do not have ${comma(args)} in your wallet`));
        else if (bet <= 0)              return message.reply(messageUtils.createEmbed(message.author, 'RED', 'What is this? A charity?'));
        else {
            await db.utils.addKR(message.author.id, -1 * bet);
            message.reply(messageUtils.createEmbed(message.author, 'ORANGE', `${emotes.kr} ${comma(args)} has been subtracted from your wallet`));
        }
        
        // Deal cards
        const   deck    = Deck.shuffle([...Deck.newDeck(), ...Deck.newDeck()]),
                hand    = { cards: deck.splice(0, 2) },
                dealer  = { cards: deck.splice(0, 2) },
                channel = message.channel;
        hand.values         = cardsToValues(hand.cards, false);
        dealer.publicValues = cardsToValues(dealer.cards, true);
        dealer.hiddenValues = cardsToValues(dealer.cards, false);

        const game  = new Game({ deck, hand, dealer, channel });
        const embed = new MessageEmbed({
            color: 'GOLD',
            author: {
                name: `${message.author.tag} (${message.author.id})`,
                icon_url: message.author.avatarURL({ dynamic: true }),
            },
            description: `You bet ${emotes.kr} ${bet}`,
            fields: [
                {
                    name:   'Your Hand:',
                    value:  `\`\`\`${cardsToStr(hand.cards, false)}\`\`\` \nTotal: ${valuesToStr(hand.values)}`,
                    inline: true,
                },
                {
                    name:   'Dealer\'s Hand:',
                    value:  `\`\`\`${cardsToStr(dealer.cards, true)}\`\`\` \nTotal: ${valuesToStr(dealer.publicValues)}`,
                    inline: true,
                },
            ],
            footer: {
                text: `Use "hit" and "stand" to play`,
            },
        });
        const   gameMsg     = await message.channel.send(embed),
                collector   = message.channel.createMessageCollector(m => m.author.id == message.author.id && ['hit', 'stand'].includes(m.content.toLowerCase()), { time: 120000 });

        // Start game
        game.start();
        var ended = false;

        // Player Events
        collector.on('collect', async(recvMsg) => {
            switch (recvMsg.content.toLowerCase()) {
                case 'hit':
                    game.hit();
                    break;
                case 'stand':
                    game.stand();
                    break;
            }
        });

        // Game Events
        game.on('win', reason => {
            embed.setColor('GREEN');
            embed.addField('You win!', `${reason == 'blackjack' ? '**You got blackjack!** ' : reason == 'bust' ? '**Dealer bust!** ' : ''}You win ${emotes.kr} **${2 * bet}**`);
            game.emit('end', 2 * bet);
        });
        game.on('lose', reason => {
            embed.setColor('RED');
            embed.addField('You lose...', `${reason == 'blackjack' ? '**Dealer got blackjack...** ' : reason == 'bust' ? '**Bust!** ' : ''}Better luck next time`);
            game.emit('end', 0);
        });
        game.on('push', () => {
            embed.setColor('BLUE');
            embed.addField('Push', `You get back your bet (${emotes.kr} **${bet}**)`);
            game.emit('end', bet);
        });
        game.on('continue', () => {
            updateEmbed(game, gameMsg, embed);
        });
        game.once('end', async(amount) => {
            game.hide = false;
            ended = true;
            await db.utils.addKR(message.author.id, parseInt(amount));
            collector.stop();
        });
        
        // Game end
        await new Promise((res) => {
            collector.on('end', async() => {
                if (ended) await updateEmbed(game, gameMsg, embed);
                else {
                    await db.utils.addKR(message.author.id, parseInt(bet));
                    return gameMsg.edit('Time\'s up! Game aborted.');
                }
                res();
            });
        });
    },
};

// Utils
const cardsToStr = (cards, hidden) => {
    var str = '';
    if (!hidden) {
        cards.forEach(card => {
            str += `${cardToStr(card)}\n`;
        });
    } else str = `${cardToStr(cards[0])} \nUnknown`;
    return str;
};

const cardToStr = (card) => {
    return `${returnCardEmotes(card.suite)} ${card.text}`;
};

const returnCardEmotes = (suite) => {
    switch (suite) {
        case 'spades':      return '♠️';
        case 'hearts':      return '♥️';
        case 'clubs':       return '♣️';
        case 'diamonds':    return '♦️';
    }
};

const cardsToValues = (cards, hidden) => {
    if (!hidden) {
        if (!cards.some(card => card.text == 'A')) return [cards.reduce((sum, card) => sum += card.value, 0)];
    
        const tempCards = cards.slice();
        tempCards.splice(tempCards.findIndex(card => card.text == 'A'), 1);
        var values = [];
        cardsToValues(tempCards, hidden).forEach(otherValue => { 
            values.push(otherValue + 1);
            if (otherValue + 11 <= 21) values.push(otherValue + 11);
        });
        values.sort((a, b) => a - b).reduce((c, d) => {
            if (c.indexOf(d) == -1) c.push(d);
            return c;
        }, []);
        return values;
    } else {
        if (cards[0].text == 'A') return [1, 11];
        else return [parseInt(cards[0].value)];
    }
};

const valuesToStr = (values) => { return `**${values.join('**, **')}**`; };

const updateEmbed = async(game, gameMsg, embed) => {
    embed.fields = [];
    embed.addFields(
        {
            name:   'Your Hand:',
            value:  `\`\`\`${cardsToStr(game.hand.cards, false)}\`\`\` \nTotal: ${valuesToStr(game.hand.values)}`,
            inline: true,
        },
        {
            name:   'Dealer\'s Hand:',
            value:  `\`\`\`${cardsToStr(game.dealer.cards, game.hide)}\`\`\` \nTotal: ${valuesToStr(game.hide ? game.dealer.publicValues : game.dealer.hiddenValues)}`,
            inline: true,
        },
    );
    if (gameMsg.editable) gameMsg.edit(embed);
};