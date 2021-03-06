const { Bot } = require('../lib/bot.js')
const fs = require('fs')
const { YT, PL } = require('../lib/youtube')
const cmd = require('node-cmd')
const log = console.log;
const ytReg = new RegExp("^/m\\s|\\s/m$", "gi");
const a = process.argv[2];
const PasteClient = require("pastebin-api").default;
const client = new PasteClient("p2iwxBhoQFSkE877cypALjbt5aF3_6DI");

var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
var times = { mode: false, exit: false };
var userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

var bot;

del = () => {
    if (!times.exit) { setTimeout(() => del(), 2000); return; }
    l = JSON.parse(fs.readFileSync("./conf/l.json", "utf8"));
    delete l[bot.room.roomId]
    fs.writeFileSync(`./conf/l.json`, JSON.stringify(l));

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

pasteList = async(yt, u, callback) => {
    const token = await client.login("drrrdrrrdrrr", "9zgz4uo8atvk2020");

    let text = `???????????? ?????????? ???????????????????????? - ${u}.\n?????????? ?????????????? ?????????????????? ?????????? ??????????: "/d 1 5 19" (???????????? 3 ?????????? ?? ?????????????? 1, 5, 19).\n\n\n\n ??? | ??????????\n\n`;

    Object.keys(yt).forEach((x, i) => {
        let b;
        let t = '' + (i + 1);

        if (t.length === 1) { b = '.   '; }
        else if (t.length === 2) { b = '.  '; }
        else b = '. ';

        text += (t + b + yt[x].title + '\n');
    });

    try {
        const url = await client.createPaste({
            userKey: token,
            code: text,
            expireDate: '10M',
            name: `${u}.txt`,
            publicity: 0,
        });
        return callback('https://pastebin.com/raw/' + url.substring(url.indexOf('com/') + 4));
    } catch {
        return callback(false);
    }
}

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

plMode = (u) => {
    clearTimeout(times.play);

    if (!curPl.l) {
        curPl.u = u;
        curPl.n = u.name; curPl.t = u.title; curPl.l = u.yt; curPl.len = u.yt.length;
        shuffle(curPl.l);
        curPl.c = 0;
        bot.print('playlist: ' + curPl.t + '\nauthor: ' + curPl.n + '\n[' + u.yt.length + ']');
    }

    if (curPl.c < curPl.len) {
        let l = curPl.l[curPl.c];

        YT("https://youtu.be/" + l, a, (y) => {
            let t = y.time*1000+5000;

            bot.music(y.title, y.link, () => {
                curPl.c++;
                times.play = setTimeout(() => plMode(u), t);
            })
        }); return;
    }

    curPl.c = 0;
    plMode(u);
}

plStop = () => {
    times.mode = false; times['mode+'] = false;
    curPl = {};

    clearTimeout(times.play);
    delete times.play;
}

plDel = (u, m) => {
    if (!m.match("^/d$")) {
        let num = m.substring(2).split(/\s/).filter(x => x !== '');

        num.forEach(x => Object.keys(userPlaylist[u].yt).find((i, ind) => {
            if ((x - 1) === ind) { delete userPlaylist[u].yt[i]; }
        }));
        fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
        bot.print('?????????? ?????????????? ???????');
        return;
    }
    if (times['mode+']) { return; }
    if (!times.mode) { return; }

    let title = userPlaylist[u].yt[curPl.id].title;

    delete userPlaylist[u].yt[curPl.id];
    fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
    bot.print(title + " ???????");
}

plRule = (u, y) => {
    userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

    if (!userPlaylist[u]) { userPlaylist[u] = { yt: {}, count: 0 }; }
    if (!userPlaylist[u].yt[y.id]) {
        userPlaylist[u].yt[y.id] = { title: y.title, time: y.time*1000 };
        fs.writeFileSync(`./conf/userPlaylist.json`, JSON.stringify(userPlaylist));
    }
}

up = () => {
    let l = JSON.parse(fs.readFileSync("./conf/l.json", "utf8"));
    let users = bot.users.map(x => x.name);
    l[bot.room.roomId] = {'title': bot.room.name, 'users': users, 'cookie': bot.cookie};
    fs.writeFileSync(`./conf/l.json`, JSON.stringify(l));
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
        up();


        bot.event(["msg", "dm"], (u, m, url, trip, e) => {
            let user = trip || u; let len;
            if (m.startsWith('/')) {
                if (userPlaylist[user]) {
                    len = Object.keys(userPlaylist[user].yt).length;
                    userPlaylist = JSON.parse(fs.readFileSync("./conf/userPlaylist.json", "utf8"));

                    if (m.match("^/i$")) {
                        if (len >= 25) {
                            pasteList(userPlaylist[user].yt, u, (link) => {
                                if (!link) { link = ''; }
                                bot.print(u + " - ?????????? ?????????? [" + len + "].", link);
                            });
                        }
                    }

                    if (m.match("^/p$")) {
                        if (len >= 25) {
                            if (times.mode) { bot.print("[playlist mode] - ?????? ??????????????."); return; }
                            times.mode = true;
                            curPl = {};

                            plRand(user);
                            bot.print("playlist mode ??????");
                        }
                    }

                    if (m.match("^/d")) {
                        if (len >= 25) {
                            if ((user === curPl.n) || (m.match(/\d/))) { plDel(user, m); }
                        }
                    }

                    if (times.mode) {

                        if (m.match("^/n$")) {
                            if (times['mode+']) { plMode(curPl.u); return; }
                            if (len >= 25) {
                                if (user === curPl.n) { plRand(user); }
                            }
                        }
                    }
                }

                if (m.match("/m")) {
                    if (m.match(ytReg)) {
                        YT(m.replace(ytReg, ""), a, (y) => {

                            if (y.id) { plRule(user, y); len = Object.keys(userPlaylist[user].yt).length; }
                            if (times.mode) {
                                clearTimeout(times.play);
                                if (times['mode+']) { bot.music(y.title, y.link, () => times.play = setTimeout(() => plMode(curPl.u), y.time*1000+15000)); }
                                else { bot.music(y.title, y.link, () => times.play = setTimeout(() => plRand(curPl.n), y.time*1000+15000)); }
                            } else { bot.music(y.title, y.link); }
                            if (len === 25) { bot.dm(u, "?????? ???????????????? ?????????? ??????????????????.\n/i - ???????????????????? ??????????.\n/p - ???????????????? ??????????.\n/s - ???????????????????? ??????????.\n/d - ?????????????? ?????????????? ????????.\n/n - ??????????????????."); }
                        });
                    }
                }

                if (m.match("^/s$")) {
                    if (times.mode) { plStop(); bot.print("playlist mode ???"); }
                }

                if (m.match("^/pl")) {
                    if (times.mode) { bot.print("[playlist mode] - ?????? ??????????????."); return; }
                    times['mode+'] = true; times.mode = true;
                    curPl = {};

                    bot.print("playlist mode ??????");
                    PL(m.substring(3), (y) => {
                        plMode(y);
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
    });

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
