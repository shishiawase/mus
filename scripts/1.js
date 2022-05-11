const { Bot } = require('../lib/bot.js')
const fs = require('fs')
const YT = require('../lib/youtube')
const cmd = require('node-cmd')
const log = console.log;
const ytReg = new RegExp("^/m\\s|\\s/m$", "gi");
const a = process.argv[2];

var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
var times = { mode: false, exit: false };
var userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

var bot;

del = () => {
    if (!times.exit) { setTimeout(() => del(), 2000); return; }

    bot.leave(() => {
        fs.unlinkSync(`./conf/${a}.json`);
        Object.keys(bots).find((item) => {
            if (item === a) {
                bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
                delete bots[item];
                fs.writeFileSync(`./conf/bots.json`, JSON.stringify(bots));
            }
        });

        cmd.run(`pm2 delete "M${a}"`, (err, a, b) => {
            if (!err) {
                log(`M${a} exit`);
            } else {
                log(`error M${a} exit`);
            }
        });
    });
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
let curPl = {};

shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

plRand = (u) => {
    clearTimeout(times.play);

    if (!curPl.ids) {
        curPl.n = u;
        curPl.len = Object.keys(userPlaylist[u].yt).length;
        curPl.ids = Object.keys(userPlaylist[u].yt);
        shuffle(curPl.ids);
        curPl.count = 0;
    }

    if (curPl.count < curPl.len) {
        let ids = curPl.ids[curPl.count];
        let t = userPlaylist[u].yt[ids].time + 5000;

        YT("https://youtu.be/" + ids, a, (y) => {
            bot.music(y.title, y.link, () => {
                curPl.count++;
                curPl.id = ids;
                times.play = setTimeout(() => plRand(u), t);
            })
        }); return;
    }

    curPl.count = 0;
    plRand(u);
}

plStop = () => {
    times.mode = false;
    curPl = {};

    clearTimeout(times.play);
    delete times.play;
}

plDel = (u) => {
    let title = userPlaylist[u].yt[curPl.id].title;

    delete userPlaylist[u].yt[curPl.id];
    fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
    bot.print(title + " 🗑️");
}

plRule = (u, y) => {
    userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

    if (!userPlaylist[u]) { userPlaylist[u] = { yt: {}, count: 0 }; }
    if (!userPlaylist[u].yt[y.id]) {
        userPlaylist[u].yt[y.id] = { title: y.title, time: y.time*1000 };
        fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
    }
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

    bot.join(a, () => {
        setTimeout(() => times.exit = true, 8500);

        bot.event(["msg", "dm"], (u, m, url, trip, e) => {
            let user = trip || u; let len;
            if (m.startsWith('/')) {
                if (userPlaylist[user]) {
                    len = Object.keys(userPlaylist[user].yt).length;
                    userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));
                }
            }

            if (m.match("/m")) {
                if (m.match(ytReg)) {
                    YT(m.replace(ytReg, ""), a, (y) => {

                        if (y.id) { plRule(user, y); len = Object.keys(userPlaylist[user].yt).length; }
                        if (times.mode) {
                            clearTimeout(times.play);
                            bot.music(y.title, y.link, () => times.play = setTimeout(() => plRand(curPl.n), y.time*1000+15000));
                        } else { bot.music(y.title, y.link); }
                        if (len === 25) { bot.dm(u, "Вам доступен режим плейлиста.\n/i - количество песен.\n/p - включить режим.\n/s - остановить режим.\n/d - удалить текущий трек.\n/n - следующий."); }
                    });
                }
            }

            if (m.match("^/i$")) {
                if (len >= 25) { bot.print(u + " - всего песен [" + len + "]."); }
            }

            if (m.match("^/p$")) {
                if (len >= 25) {
                    if (times.mode) { bot.print("[playlist mode] - уже активен."); return; }
                    times.mode = true;
                    curPl = {};

                    plRand(user);
                    bot.print("playlist mode ✔️");
                }
            }

            if (times.mode) {

                if (m.match("^/s$")) {
                    if (len >= 25) { plStop(); bot.print("playlist mode ❌"); }
                }

                if (m.match("^/d$")) {
                    if (len >= 25) {
                        if (user === curPl.n) { plDel(user); }
                    }
                }

                if (m.match("^/n$")) {
                    if (len >= 25) {
                        if (user === curPl.n) { plRand(user); }
                    }
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

    if (!bot.load(`./conf/${a}`)) {
        bot.login(() => {
            log("Login ok");
            bot.save(`./conf/${a}`);
            start();
        })
    } else {
        start();
        log('reloaded');
    }
  }

  logFunc();
