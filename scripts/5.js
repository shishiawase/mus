const { Bot, listen } = require('../lib/bot.js')
const fs = require('fs')
const YT = require('../lib/youtube')
const cmd = require('node-cmd')
const log = console.log;
const ytReg = new RegExp("^/m\\s|\\s/m$", "gi");
const a = 5;

var room = JSON.parse(fs.readFileSync(`./scripts/${a}.json`, "utf8"));
var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
let b = Object.keys(bots);
if (!room.length) { room.id = bots[b[b.length - 1]]; fs.writeFileSync(`./scripts/${a}.json`, JSON.stringify(room)); }
var times = {};

var bot;

del = () => {
    bot.leave(() => {
        clearInterval(times.keep);
                clearInterval(times.check);
                Object.keys(bots).find((item) => {
                    if (bots[item] === room.id) {
                        delete bots[item];
                        fs.writeFileSync(`./conf/bots.json`, JSON.stringify(bots));
                    }
                });
                room = {}; fs.writeFileSync(`./scripts/${a}.json`, JSON.stringify(room));

                fs.unlink(`./config${a}.json`, (error) => {
                    if (!error) {
                        delete bot;
                    }
                });
        cmd.run(`pm2 delete "M${a}"`, (err, a, b) => {
            if (err) {
                log(`M${a} exit`);
            } else {
                log(`error M${a} exit`);
            }
        });
        cmd.run('pm2 restart "M"', (e, x, c) => {
            return;
        });
    })
}

randHost = () => {
    bot.getLoc(() => {
        let users = bot.users;
        let n = bot.users.length;
        let r = Math.floor(Math.random() * n);
        let name = users[r].name;
        if (name === `M${a}`) { randHost(); return; }

        bot.handOver(name);
    })
}

start = () => {

    if (times.keep) {
      clearInterval(times.keep);
      clearInterval(times.check);
    }

    times.keep = setInterval(() => bot.dm(bot.profile.name, "keep"), 60000*10);
    times.check = setInterval(() => {
        bot.getLoc(() => {
            if (!bot.room.roomId) {
                delete bot;
                logFunc();
            }
        })
    }, 60000);

    bot.join(room.id, () => {
        bot.event(["msg", "dm"], (u, m) => {
            if (m.match("/m")) {
                if (m.match(ytReg)) {
                    YT(m.replace(ytReg, ""), a, (y) => {
                        bot.music(y.title, y.link);
                    });
                }
            }
        });

        bot.event(["new-description"], (u) => {
          bot.getLoc(() => {
            if (!bot.room.description.match("/getmusic")) {
              del();
            }
          })
        });

        bot.event(["new-host"], (u, m, url, trip, e) => {
          bot.getLoc(() => {
            if (e.user === bot.profile.name) {
              if (bot.users.length > 1) {
                randHost();
              }
              else {
                del();
              }
            }
          })
        });

        bot.event(["kick", "ban"], (u, m, url, trip, e) => {
          bot.getLoc(() => {
            if (bot.lastTalk.message.match("kicked|banned")) {
              log(a + " you get a " + e.type);
              del();
            }
          })
        });
    })

  }

logFunc = () => {
    bot = new Bot('M', 'setton', 'en-US');

    if (!bot.load(a)) {
        bot.login(() => {
            log("Login ok");
            bot.save(a);
            start();
        })
    } else {
        start();
        log('reloaded');
    }
  }

  logFunc();
