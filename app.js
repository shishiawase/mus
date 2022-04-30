const { Bot, listen } = require('./lib/bot.js')
const fs = require('fs')
const cmd = require('node-cmd')
const log = console.log;

var bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
var times = {};
var stat = false;

var bot = new Bot('finder', 'setton', 'en-US');

start = () => {

  if (times.head) {
    clearInterval(times.head);
    clearInterval(times.finder);
  }

  times.head = setInterval(() => {
    bot.getProfile((x) => {
      if (!x) {
          fs.unlink(`./configfinder.json`, (error) => {
              if (!error) {
                  delete bot;
                  log("Profile undefined, try login...");
                  logFunc();
              }
          });
      }
    });
  }, 60000*10);

  times.finder = setInterval(() => {
    bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));

    bot.getLounge(() => {
      bot.rooms.forEach((room) => {
        if (!Object.values(bots).includes(room.roomId)) {
        if (room.language === "ru-RU") {
          if (room.music === true) {
            if (room.description.match("/getmusic")) {
              if (room.total !== room.limit) {
                if (!stat) { stat = true; check('1', room.name, room.roomId); }
              }
            }
          }
        }
        }
      })
    })
  }, 5000);

  log('finder started...');

}

check = (num, name, id) => {
  bots = JSON.parse(fs.readFileSync("./conf/bots.json", "utf8"));
  let k = Object.keys(bots);
  if(k.includes(num)) {
    num++; check(num, name, id); log('check num:' + num);
    return;
  }
  scr(num, name, id);
}

scr = (num, name, id) => {
    log(Object.keys(bots));
    log(num);
    bots[num] = id;
    fs.writeFileSync("./conf/bots.json", JSON.stringify(bots));

  cmd.run(`pm2 start node --name "M${num}" -- ./scripts/1.js ${Number(num)}`, (err, a, b) => {
    if (!err) {
      log('Bot ' + num + ' join to - ' + name);
      stat = false;
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
