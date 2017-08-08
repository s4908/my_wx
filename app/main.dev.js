/* eslint global-require: 1, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
// import { app, BrowserWindow } from 'electron';
// import MenuBuilder from './menu';
const { app, BrowserWindow } = require('electron');
const MenuBuilder = require('./menu');
const { ipcMain } = require('electron');
import {
  createWriteStream,
}                           from 'fs'
import fs from 'fs'
var request = require("request");


console.log(__dirname)
import {updateContacts, updateRooms, updateSelectedRoom, updateLoginUrl, loginSuccess} from './actions/wechat'
let mainWindow = null;
var webContents = null;
var store = null;
var isLogin = false;

ipcMain.on('sayToRoom', (event, arg) => {
  console.log(arg)
  Room.find({topic: arg.topic}).then(r => {
    r.say(arg.text)
    event.returnValue = 'ok';
  })
  event.returnValue = 'ok';
});


ipcMain.on('refreshBrowser', (event, arg) => {
  console.log("refresh");
  console.log( global.bot.puppet.browser)
  global.bot.reset()
});

ipcMain.on('wx:api', (event, args) => {
  const { endpoint, params, serialNum } = args;
  const responseChannel = `wx:api:${endpoint}:${serialNum}`;
  if(endpoint == "IS_LOGIN"){
    event.sender.send(responseChannel, {isLogin});
    return
  }
  //重新刷新 Room & Contact 資訊
  Room.findAll().then(rooms => {
    return Promise.all(rooms.map(r => r.refresh()))
  }).then(()=>{
    Contact.findAll().then(contacts => {
      return Promise.all(contacts.map(c => c.refresh()))
    })
  }).then(()=>{
    switch (endpoint) {
      case "SAY_TO_ROOM":
        Room.find({topic: params.topic}).then(r => {
          r.say(params.text, params.replyTo)
            .then(result => {event.sender.send(responseChannel, {result});})
            .catch(error => {event.sender.send(responseChannel, {error});})

        })
        break;
      case "GET_ROOM":
        console.log("GET_ROOM")
        console.log(params)
        Room.find({topic: params.topic})
          .then(result => {console.log(result); console.log(result.memberList()); event.sender.send(responseChannel, {result});})
          .catch(error => {event.sender.send(responseChannel, {error});})
        break;
      case "GET_ROOMS":
        Room.findAll()
          .then(result => {console.log(result); event.sender.send(responseChannel, {result});})
          .catch(error => {event.sender.send(responseChannel, {error});})
        break;  
      default:
        console.log("DEFAULT")
        break;
    }
  })


});
// ipcMain.on('request', (event, arg) => {
  
//   switch (arg.requestName) {
//     case "SAY_TO_ROOM":
//       console.log("SAY_TO_ROOM")
//       console.log(arg)
//       Room.find({topic: arg.topic}).then(r => {
//         console.log(r)
//         console.log(r.obj)
//         r.say(arg.text, arg.replyTo)
//           .then(_ => {event.returnValue = 'OK';})
//           .catch(_ => {})
        
//       })
//       break;
//     case "GET_ROOM":
//       console.log("GET_ROOM")
//       console.log(arg)
//       debugger
//       Room.find({topic: arg.topic}).then(r => {
//         log.info(r);
//         if(r){
//           r.refresh().then(()=> {
//             mainWindow.webContents.send('do_dispatch', updateSelectedRoom(r));
//           })
//         }
//       })
//       break;
//     case "GET_ROOMS":
//       console.log(arg);  // prints "ping"
//       Contact.findAll().then(o => {
//           log.info(o);
//           if(o) mainWindow.webContents.send('do_dispatch', updateContacts(o));
//           event.returnValue = o;
//       })  
//       Room.findAll().then(o => {
//         log.info(o);
//         if(o) mainWindow.webContents.send('do_dispatch', updateRooms(o));
//       })  
//       break;
//     default:
//       console.log("DEFAULT")
//       break;
//   }
//   event.returnValue = 'OK';
// });

ipcMain.on('updateContactsReq', (event, arg) => {
  store = arg;
  console.log(arg);  // prints "ping"
  Contact.findAll().then(o => {
      log.info(o);
      if(o) mainWindow.webContents.send('dispatch', updateContacts(o));
      event.returnValue = o;
  })  
  Room.findAll().then(o => {
    log.info(o);
    if(o) mainWindow.webContents.send('dispatch', updateRooms(o));
  })
  // store.dispatch("UPDATE_CONTACTS", ["UPDATE_CONTACT_VIA_BACKEND"])
});

// setInterval(function() {
//   if(mainWindow){
//     mainWindow.webContents.send('dispatch', updateContacts());
//   }
// }, 5000);

const {
  config,
  Wechaty,
  log,
  MediaMessage,
  Contact,
  Room,
  MsgType
} = require('wechaty');

// global.bot = Wechaty.instance(/*{ profile: config.DEFAULT_PROFILE }*/);
global.bot = Wechaty.instance({head: "phantomjs"});
config.head = "phantomjs";
console.log(config);
bot
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('login'	  , user => {
  isLogin = true;
  mainWindow.webContents.send('doDispatch', loginSuccess(isLogin));
  log.info('Bot', `${user.name()} logined`)
  bot.say('Wechaty login')
  
})
.on('error'   , e => {
  log.info('Bot', 'error: %s', e)
  bot.say('Wechaty error: ' + e.message)
})
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    mainWindow.webContents.send('doDispatch', updateLoginUrl(loginUrl));
    //QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('message', async m => {
  try {
    const room = m.room()
    let msgStr = (room ? '[' + room.topic() + ']' : '')
                + '<' + m.from().name() + '>'
                + ':' + m.toStringDigest();
    console.log(msgStr)
    let roomTopic = room && room.topic()
    mainWindow.webContents.send('wx:message', {roomTopic: roomTopic, fromName: m.from().name(), content: m.content(), raw: m})
    //if (/^(ding|ping|bing|code)$/i.test(m.content()) && !m.self()) {
    

    if(m.type() == MsgType.IMAGE) {
      saveMediaFile(m, (filename) => {
        console.log('filename: ' + filename);
        console.log(__dirname);
        var bitmap = fs.readFileSync(filename);
        // convert binary data to base64 encoded string
        let base64Image = new Buffer(bitmap).toString('base64');
        //console.log(base64)
        
        
        
        var options = { method: 'POST',
          url: 'https://vision.googleapis.com/v1/images:annotate',
          qs: { key: 'AIzaSyBwOVunxV4yR7BNqJgJIaAneLvkTrONc8o' },
          headers: 
           { 'cache-control': 'no-cache',
             'content-type': 'application/json' },
          body: 
           { requests: 
              [ { image: { content: base64Image },
                  //imageContext: {languageHints: [ "en", "zh-TW" ]},
                  features: [ { type: 'TEXT_DETECTION' } ] } ] },
          json: true };
        console.log(options);
        request(options, function (error, response, body) {
          if (error) throw new Error(error);
          mainWindow.webContents.send('wx:redEnvelope', {body})
          console.log(JSON.stringify(body, 2));
        });        
      })
    }

    if (/^(ding|ping|bing|code)$/i.test(m.content()) ) {  
      m.say('dong')
      log.info('Bot', 'REPLY: dong')

      const joinWechaty =  `Join Wechaty Developers' Community\n\n` +
                            `Wechaty is used in many ChatBot projects by hundreds of developers.\n\n` +
                            `If you want to talk with other developers, just scan the following QR Code in WeChat with secret code: wechaty,\n\n` +
                            `you can join our Wechaty Developers' Home at once`
      await m.say(joinWechaty)
      await m.say(new MediaMessage(__dirname + '/test.jpg'))
      await m.say('Scan now, because other Wechaty developers want to talk with you too!\n\n(secret code: wechaty)')
      log.info('Bot', 'REPLY: Image')
    }
  } catch (e) {
    log.error('Bot', 'on(message) exception: %s' , e)
  }
})

bot.init()




if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(console.log);
};


/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('ready', async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });
  webContents = mainWindow.webContents;
  
  webContents.loadURL(`file://${__dirname}/app.html`);
  
  
  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
});


async function saveMediaFile(message: Message, callback) {
  const filename = __dirname  + '/' + message.filename()
  console.log('IMAGE local filename: ' + filename)

  const fileStream = createWriteStream(filename)

  console.log('start to readyStream()')
  try {
    const netStream = await message.readyStream()
    netStream
      .pipe(fileStream)
      .on('close', _ => {
        console.log('finish readyStream()')
        if(callback && typeof callback === 'function') callback(filename);
      })
  } catch (e) {
    console.error('stream error:', e)
  }
}