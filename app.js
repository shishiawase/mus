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
    let o = Object.keys(bots);

    bot.getLounge(() => {
      bot.rooms.forEach((room) => {
        if (!o.includes(room.roomId)) {
        if (room.language === "en-US") {
          if (room.music === true) {
            if (room.description.match("/getmusic")) {
              if (room.total !== room.limit) {
                if (!stat) { stat = true; scr(room.name, room.roomId); }
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

scr = (name, id) => {
    log(Object.keys(bots));
    bots[id] = name;
    fs.writeFileSync("./conf/bots.json", JSON.stringify(bots));

  cmd.run(`pm2 start node --name "M${id}" -- ./scripts/1.js ${id}`, (err, a, b) => {
    if (!err) {
      log('Bot ' + id + ' join to - ' + name);
      stat = false;
    } else {
      log('error join');
    }
  })
}

logFunc = () => {
  if (!bot.load('./finder')) {
      bot.login(() => {
          log("Login ok");
          bot.save('./finder');
          start();
      })
  } else {
      start();
      log('reloaded');
  }
}

logFunc();
