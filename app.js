const { Bot, listen } = require('./lib/bot.js')
const fs = require('fs')
const cmd = require('node-cmd')
const log = console.log;

var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
var times = {};

var bot = new Bot('finder', 'setton', 'en-US');

start = () => {

  if (times.head) {
    clearInterval(times.head);
    clearInterval(times.finder);
  }

  times.head = setInterval(() => {
    if (!bot.profile) {
      log("Profile undefined, try login...");
      logFunc();
    }
  }, 60000*10);

  times.finder = setInterval(() => {
    bot.getLounge(() => {
      bot.rooms.forEach((room) => {
        if (room.language === "ru-RU") {
          if (room.music === true) {
            if (room.description.match("/getmusic")) {
              if (room.total !== room.limit) {
                check(room.name, room.roomId);
              }
            }
          }
        }
      })
    })
  }, 5000);

  log('finder started...');

}

check = (name, id) => {
  bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
  let n = Object.keys(bots).length;
  if (n < 1 || !n) { scr(1, name, id); }
  else {
    n++;
    let arr = Object.values(bots);

    if ((n !== 6) && !arr.includes(id)) { scr(n, name, id); }
  }
}

scr = (num, name, id) => {
  bots[num] = id;
  fs.writeFileSync("./conf/bots.json", JSON.stringify(bots));

  cmd.run(`pm2 start node --name "M${num}" -- ./scripts/${num}.js`, (err, a, b) => {
    if (!err) {
      log('Bot ' + num + ' join to - ' + name);
    } else {
      log('error join');
    }
  })
}

logFunc = () => {
  if (!bot.load('finder')) {
      bot.login(() => {
          log("Login ok");
          bot.save('finder');
          start();
      })
  } else {
      start();
      log('reloaded');
  }
}

logFunc();
