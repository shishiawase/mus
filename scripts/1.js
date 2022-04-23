const { Bot, listen } = require('../lib/bot.js')
const fs = require('fs')
const YT = require('../lib/youtube')
const cmd = require('node-cmd')
const log = console.log;
const ytReg = new RegExp("^/m\\s|\\s/m$", "gi");
const a = `${process.argv[2]}`;

var room = JSON.parse(fs.readFileSync(`./scripts/${a}.json`, "utf8"));
var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
let b = Object.keys(bots);
if (!room.length) { room.id = bots[b[b.length - 1]]; fs.writeFileSync(`./scripts/${a}.json`, JSON.stringify(room)); }
var times = {};
var userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

var bot;

del = () => {
    bot.leave(() => {
        clearInterval(times.keep);
        clearInterval(times.check);

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
        Object.keys(bots).find((item) => {
            if (bots[item] === room.id) {
                delete bots[item];
                fs.writeFileSync(`./conf/bots.json`, JSON.stringify(bots));
                room = {}; fs.writeFileSync(`./scripts/${a}.json`, JSON.stringify(room));
            }
        });
    })
}

randHost = (e) => {
    let us = bot.room.users || [];
    let u = us.find(x => x.name === bot.profile.name);

    bot.getLoc(() => {
      if (bot.room.host === u.id) {
        if (bot.users.length > 1) {
            let users = bot.users;
            let n = bot.users.length;
            let r = Math.floor(Math.random() * n);
            let name = users[r].name;
            if (name === `M`) { randHost(); return; }

            bot.handOver(name);
        } else {
            del();
        }
      }
    })
}

// USER PLAYLIST
pl = (name, num) => {
    clearTimeout(times.play);

    let len = Object.keys(userPlaylist[name].yt).length;
    if (num === len) {
        userPlaylist[name].count = 0;
        fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
        bot.print("Плейлист завершён.");
        return;
    }

    let ids = Object.keys(userPlaylist[name].yt);
    let t = userPlaylist[name].yt[ids[num]].time + 5000;

    YT("https://youtu.be/" + ids[num], a, (y) => {
        bot.music(y.title, y.link, () => {
            userPlaylist[name].count = num;
            fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
            num++;
            times.play = setTimeout(() => pl(name, num), t);
        })
    });
}

plRand = (u) => {
    clearTimeout(times.play);

    let len = Object.keys(userPlaylist[u].yt).length;
    let r = Math.floor(Math.random() * len);
    let ids = Object.keys(userPlaylist[u].yt);
    let t = userPlaylist[u].yt[ids[r]].time + 5000;

    YT("https://youtu.be/" + ids[r], a, (y) => {
        bot.music(y.title, y.link, () => {
            times.play = setTimeout(() => plRand(u), t);
        })
    });
}

plStop = () => {
    if (times.play) {
        clearTimeout(times.play);
        delete times.play;
        bot.print("Плейлист остановлен.");
    }
}

plRule = (u, y) => {
    if (!userPlaylist[u]) { userPlaylist[u] = { yt: {}, count: 0 }; }
    if (!userPlaylist[u].yt[y.id]) {
        userPlaylist[u].yt[y.id] = { title: y.title, time: y.time*1000 };
        fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
    }
}

plAddRule = (u, t, len) => {
    if (userPlaylist[t].count === 0) { bot.print(`Режим плейлиста запущен.\n${u} - количество песен [${len}].`); pl(t, 0); return; }
    bot.print(`Плейлист запущен с последней проигранной песни.\n[${userPlaylist[t].count}/${len}]`);
    pl(t, userPlaylist[t].count);
}

start = () => {

    if (times.keep) {
      clearInterval(times.keep);
      clearInterval(times.check);
    }

    times.keep = setInterval(() => bot.getLoc(() => bot.dm(bot.profile.name, "keep")), 60000*10);
    times.check = setInterval(() => {
        bot.getLoc(() => {
            if (!bot.room.roomId) {
                delete bot;
                logFunc();
            }
        });
        randHost();
    }, 60000);

    bot.join(room.id, () => {
        bot.event(["msg", "dm"], (u, m, url, trip, e) => {
            if (m.match("/m")) {
                if (m.match(ytReg)) {
                    YT(m.replace(ytReg, ""), a, (y) => {
                        log(y);

                        if (y.id) {
                            if (trip) { plRule(trip, y); }
                            else { plRule(u, y); }
                        }

                        plStop();
                        bot.music(y.title, y.link);
                        let len = Object.keys(userPlaylist[trip].yt).length || Object.keys(userPlaylist[u].yt).length || 0;
                        if (len === 25) { bot.dm(u, "Вам доступен режим плейлиста.\n/i - количество песен.\n/p - включить режим.\n/r - плейлист вразброс.\n/s - остановить режим."); }
                    });
                }
            }

            if (m.match("^/i$")) {
                let len = Object.keys(userPlaylist[trip].yt).length || Object.keys(userPlaylist[u].yt).length || 0;

                if (len >= 25) { bot.print(u + " - всего песен [" + len + "]."); }
            }

            if (m.match("^/p$")) {
                let len = Object.keys(userPlaylist[trip].yt).length || Object.keys(userPlaylist[u].yt).length || 0;

                if (len >= 25) {
                    if (trip) { plAddRule(u, trip, len); }
                    else { plAddRule(u, u, len); }
                }
            }

            if (m.match("^/r$")) {
                let len = Object.keys(userPlaylist[trip].yt).length || Object.keys(userPlaylist[u].yt).length || 0;

                if (len >= 25) {
                    if (trip) { plRand(trip); }
                    else { plRand(u); }
                    bot.print("Режим плейлиста(рандом) запущен.");
                }
            }

            if (m.match("^/s$")) {
                let len = Object.keys(userPlaylist[trip].yt).length || Object.keys(userPlaylist[u].yt).length || 0;

                if (len >= 25) { plStop(); }
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
            randHost();
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
