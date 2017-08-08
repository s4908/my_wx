import React, { Component } from 'react';
import Home from '../components/Home';
import Sequelize from 'sequelize'
import { db } from '../database'
import { connect } from 'react-redux';
import { request } from '../index'
import _ from 'lodash'
import { updateRooms, updateSelectedRoom, loginSuccess } from '../actions/wechat'
import { Game, Room, Member, BankerQueue,Betting, Hist } from '../models'
import bootbox from 'bootbox';

const {ipcRenderer} = require('electron');
const waterFee = 0.02; //水費
const mgmtFee = 0.06; //管理費
// Member.findAll({
//   where: {

//   },
//   // include: [{ all: true }]
//   include: [
//      { model: Betting, where: { roomTopic: '玩具龍蝦洞裏鑽進被', gameId: 13 }, required: false}
//   ],
// }).then(m => {
//   console.log(m)
//   window.aa = m;
// });
// BankerQueue.findAll({
//   where: {
//     roomTopic: '玩具龍蝦洞裏鑽進被',
//     rounds: { $gt: 0 }
//   },
//   include: [{ all: true }]
// }).then(bankers => {
//   console.log(bankers)
// })
// Betting.findAll({
//   where: {
//     roomTopic: '手術室1',
//     gameId: 1
//   },
//   include: [{ all: true }]
// }).then(bettings => {
  
// })


class HomePage extends Component {
  constructor(props){
    super(props)
    this.state = {
      currentRoom: undefined,
      currentGame: undefined,
      openBankerRegistration: false,
      roomMembers: [],
      bankerQueue: [],
      betting: {},
      bet: {},
      redEnvelope: {}
    }
    //
    ipcRenderer.on('wx:message', (event, arg) => {
      window.latestMsg = arg;
      let topic = this.state.currentRoom && this.state.currentRoom.topic;
      let game = this.state.currentGame;
      //監聽搶庄
      if(arg.roomTopic === topic && this.state.openBankerRegistration){
        let matches = arg.content.match(/(\d+)[\/／](\d+)/)
        if(matches) {
          Member.findOne({where: { roomTopic: topic, name: arg.fromName } }).then(member => {
            if(member.score < 10000 || matches[1] < 200) return
            BankerQueue.create({
              memberId: member.id,
              memberName: arg.fromName,
              roomTopic: this.state.currentRoom.topic,
              maxScore: parseInt(matches[1]),
              rounds: parseInt(matches[2])
            }).then(()=> {
              this.sendMessageToRoom(`${arg.fromName} 莊，單注上限：${matches[1]}，共${matches[2]}局`);
              this._updateBankerQueue();
            })
          })
        }
      }
      if(game && arg.roomTopic === topic && 
            this.state.currentGame.status === "待下注"){
        let match = arg.content.match(/^(\d+)$/);
        let betScore = parseInt(arg.content);
        
        if(match && betScore >= 200){
          let betting = this.state.betting;
          Member.findOne({where: { roomTopic: topic, name: arg.fromName }, 
            include: [{ model: Betting, where: { roomTopic: topic, gameId: game.id }, required: false}] }
          ).then(member => {
            if(member.banker) return
            if((member.score ) < betScore * 3) {
              this.sendMessageToRoom(`${arg.fromName} 無效下注(${betScore})，積分需大於${betScore * 3}`);  
            } else if(member.score  >= betScore * 3) {
              if(betScore >= game.maxScore){
                betScore = game.maxScore;
              }
              this.setBetting(member, betScore)
              this.sendMessageToRoom(`${arg.fromName} 下注 ${betScore} 分`);
            }
            
            // let members = this.state.roomMembers;
            // let idx = members.findIndex((m) => m.obj.id === member.id)
            // if(idx >= 0){
            //   members[idx].betting = betScore;
            //   this.setState({roomMembers: members})
            //   // betting[member.id] = betScore;
            //   // this.setState({betting: betting})
            //   this.sendMessageToRoom(`${arg.fromName} 下注 ${betScore} 分`);
            // }

          })
          
        }
      }
    });
    ipcRenderer.on('wx:redEnvelope', (event, arg) => {
      window.latestRedEnvelope = arg;
      let topic = this.state.currentRoom.topic;
      let game = this.state.currentGame;
      //紅包
      //var anno = arg.body.responses[0]
      if(game == null || game.status != "待發包") return
      arg.body.responses.forEach(response => {
        var textHeight = Math.abs(response.textAnnotations[0].boundingPoly.vertices[2].y - response.textAnnotations[0].boundingPoly.vertices[0].y) / 44.5
        console.log("字距：" + textHeight)
        response.textAnnotations.forEach((a, idx) => {
          if (a.description == "元"){
            console.log(`idx: ${idx}`)
            let text_arr = response.textAnnotations.filter(a2 => {
              return a2.boundingPoly.vertices[0].y > a.boundingPoly.vertices[0].y - textHeight && 
                  a2.boundingPoly.vertices[0].y < a.boundingPoly.vertices[0].y + textHeight
            });
            let text = text_arr.map(t=>t.description).join('');
            console.log(text)
            let match = text.match(/(\d+\.\d+)元/)
            if(match){
                let name = text.replace(match[0],'');
                let point = match[1];
                console.log(`${name} => ${point}`)
                let redEnvelope = this.state.redEnvelope;
                let member = this.state.roomMembers.find(m => m.alias && m.alias == name)
                if(member) this.setRedEnvelope(member, point);
            }
            console.log('------')
          }
        })
      })

      
    });

    this.handleRoomChange = this.handleRoomChange.bind(this)
    this.sendMessageToRoom = this.sendMessageToRoom.bind(this)
  }
  refresh = _ => {
    //ipcRenderer.send('request', {requestName: "GET_ROOMS"})
    request('GET_ROOMS').then(response => {
      

      this.props.dispatch(updateRooms(response.result))
    })
  }
  // sayToRoom(room_id, text, topic) {
  //   console.log(room_id)
  //   console.log(text)
  //   console.log(topic)
  //   console.log(ipcRenderer.send('sayToRoom', {room_id, text, topic}));
  // }
  handleRoomChange(e){
    console.log(e.target.value)
    this.setState({selectedRoom: e.target.value, selectedRoomId: e.target.dataset.id})
  }
  sendMessageToRoom(text){
    return new Promise(resolve => {
      let topic = this.props.wechat.selectedRoom.obj.topic
      return request('SAY_TO_ROOM', {topic, text: text}).then(resolve)
    })
  }
  
  getRoom = _ => {
    let topic = this.state.selectedRoom;
    request('GET_ROOM', {topic}).then(response => {
      let room = response.result;
      Room.findOrCreate({where: {topic: room.obj.topic}}).spread((room2, isCreated) => {
        console.log(room2.get({
          plain: true
        }))
        this.props.dispatch(updateSelectedRoom(response.result));
        this.setState({currentRoom: room2}, () => {
          //同步遊戲
          this._updateGame();
          // Game.findOrCreate({where: {roomTopic: room2.topic, closed: false}}).spread((game, isCreated)=>{
          //   this.setState(currentGame: game)
          // })
          //同步莊家列表
          this._updateBankerQueue();
          //同步玩家資料
          this._syncMembers(room);
        });

      })

    
      
    })
    //ipcRenderer.send('request', {requestName: "GET_ROOM" , topic: topic})
  }
  _updateBankerQueue = () => {
    let topic = this.state.currentRoom.topic
    BankerQueue.findAll({
      where: {
        roomTopic: topic,
        rounds: { $gt: 0 }
      },
      include: [{ all: true }]
    }).then(bankers => {
      this.setState({bankerQueue: bankers})
    })
  }
  

  _updateRoomMembers = () => {
    return new Promise((resolve) => {
      this.getRoomMembers().then(roomMembers => {
        this.setState({roomMembers: roomMembers}, () => { resolve();})
      })
    })
  }

  getRoomMembers = () => {
    return new Promise((resolve) => {
      let topic = this.state.currentRoom.topic;
      let game = this.state.currentGame;
      let includeQuery = [];
      if (game != null){
        includeQuery.push({ model: Betting, where: { roomTopic: topic, gameId: game.id }, required: false})
      }
      Member.findAll({
        where: { roomTopic: this.state.currentRoom.topic },
        include: [
          ...includeQuery
        ],
      })
      .then(members => {
        let roomMembers = members.map(m => { 
          //let isBanker = false;
          if (this.state.currentGame && this.state.currentGame.banker == m.id) {
            m.banker = true;
          }
          return m
        })
        resolve(roomMembers);
      })
    })
  }

  _updateGame = () => {
    return new Promise((resolve) => {
      Game.findOne({where: {roomTopic: this.state.currentRoom.topic, closed: false}, include: [{ all: true }]}).then((game)=>{
        this.setState({currentGame: game},() => { this._updateRoomMembers();resolve()})
      })
    })
  }
  _syncMembers = (room) => {
    Member.findAll({where: {roomTopic: this.state.currentRoom.topic }})
    .then(members => {
      console.log(members)
      //過濾已經存在DB的資料
      let unsaved_members = room.obj.memberList.map((contact,idx) => {
        if(contact == null || contact.obj == null || contact.obj.name == null) {
          //debugger
          //有時候contact.obj會等於null
        }
        return {name: contact.obj.name, alias: contact.obj.alias, roomTopic: this.state.currentRoom.topic, score: 0}
      }).filter(m => {
        return members.findIndex(m2 => { return m.roomTopic == m2.roomTopic && m.name == m2.name}) < 0
      });
      //已存在的更新alias name
      let updateArr = [];
      room.obj.memberList.forEach(m => {
        let finded_member = members.find(m2 => { return m2.name == m.obj.name})
        if(finded_member){
          updateArr.push(finded_member.update({alias: m.obj.alias}))
        }
      })
      // members.filter(m => {
      //   return room.obj.memberList.findIndex(m2 => { return m.roomTopic == m2.roomTopic && m.name == m2.obj.name}) >= 0
      // }).forEach(m => {
      //   let member = this.state.roomMembers.find(m2=> { return m.roomTopic == m2.roomTopic && m.name == m2.name})
      //   if(member != null){
      //     member.update({alias: m.obj.alias})
      //   }
      // });
      Promise.all(updateArr).then(()=>{
        Member.bulkCreate(unsaved_members).then(this._updateRoomMembers)
      })
      

      
      
    })
  }
  addScore = (member) => {
    member.reload().then(()=>{
      //let member = this.state.roomMembers[memberIdx];
      bootbox.prompt({
          title: "請輸入加值分數",
          inputType: 'number',
          callback: (score) => {
            if(parseInt(score)){
              member.score += parseInt(score);
              member.deposit += parseInt(score);
              member.save().then(this._updateRoomMembers);
              Hist.create({
                roomId: this.state.currentRoom.id,
                memberId: member.id,
                event: "加值",
                note: score
              })
            }

          }
      });
    })
  }
  newGame = () => {
    let topic = this.state.currentRoom.topic;
    let game = this.state.currentGame;
    if( this.state.bankerQueue.length > 0){
      let banker = this.state.bankerQueue[0];
      Game.create({roomTopic: topic, banker: banker.memberId, maxScore: banker.maxScore, status: "待下注", closed: false})
        .then((game)=>{
            //this.setState({currentGame: game})
            this._updateGame().then(() => {
              banker.decrement('rounds', {by: 1}).then(() => {
                let bankerMember = this.state.roomMembers.find(m => m.banker)
                bankerMember.createBetting({roomTopic: topic, gameId: game.id, isBanker: true})
                  .then(this._updateRoomMembers)
                  .then(this._updateBankerQueue);
               
              })
              this.sendGameInfo();
              setTimeout(() => {
                this.sendMessageToRoom("開放下注")
              }, 1000);
            })
        })
    }
  }
  //停止下注
  stopBetting = () => {
    var game = this.state.currentGame;
    var batchUpdate = [];
    //game.update({status: "待下注"}).then(() => {
    game.update({status: "待發包"}).then(() => {
      this.sendMessageToRoom(`停止下注`).then(()=>{
        this._updateRoomMembers().then(() => {
          let members = this.state.roomMembers;
          let banker = this.state.roomMembers.find(m => m.banker);
          //閒家
          let players = members.filter(m => m.betting && m.banker != true);
          let total = _.sumBy(players, m => m.betting.betScore);
          if(total * 3 < banker.score ) {
            //不用改
          } else {
            var per_maximun = Math.round(banker.score / 3 / players.length);
            var maximun = Math.round(banker.score / 3);
            var total_under_maximun = _.sumBy(players.filter(m => m.betting.betScore <= per_maximun), m=>m.betting.betScore)
            var total_over_maximun = _.sumBy(players.filter(m => m.betting.betScore > per_maximun), m=>m.betting.betScore)
            var remain_quota = maximun - total_under_maximun;
            players.filter(m => m.betting.betScore > per_maximun).forEach(m=>{
              let newBetScore = Math.round(remain_quota * (m.betting.betScore / total_over_maximun))
              //console.log(newBetScore);
              batchUpdate.push(m.betting.update({betScore: newBetScore}));
            });
          }
          Promise.all(batchUpdate).then(this._updateRoomMembers).then(()=>{
            this.sendBettingInfo();
            this._updateGame();
          })
        });

      })
    });
  }
  //遊戲結算
  finalizeGame = () => {
    this._updateRoomMembers().then(()=> {
      let game = this.state.currentGame;
      //過濾有下注與庄家
      let exit = this.state.roomMembers.find(m => {
        if(m.betting != null && m.betting.redPoint == null) return true
      })
      if(exit) {
        console.log("點數未開完")
        return
      }

      let members = this.state.roomMembers.filter(m => m.banker == false && 
          m.betting != null && 
          m.betting.redPoint != null //&&
          //m.betting.closed != true
      )
      let banker = this.state.roomMembers.find(m => m.banker)
      
    
      let bulkUpdate = members.map(m => {
        let memberResult = compareRedPoint(m.betting.redPoint, banker.betting.redPoint);
        let winLose = memberResult.isWin ? 1 : -1;
        memberResult.result = m.betting.betScore * memberResult.multiple * winLose;
        memberResult.fee = Math.abs(Math.round(memberResult.result * waterFee))
        memberResult.finalResult = memberResult.result > 0 ? memberResult.result-memberResult.fee : memberResult.result
        return m.betting.update({...memberResult})
      })
      
      Promise.all(bulkUpdate).then(() => {
        let total = _.sumBy(members, m => m.betting.result);
        let finalResult = _.sumBy(members, m => {
          return m.betting.isWin ? 0-m.betting.result : 0-m.betting.result-m.betting.fee
        })
        banker.betting.update({result: 0-total, finalResult: finalResult}).then(this._updateRoomMembers);
        game.update({status: "已結算"}).then(() => {
          this._updateGame();
        });
      })

    })
  }

  closeGame = () => {
    this._updateGame().then(() => {
      Betting.findAll({
        where: {
          roomTopic: this.state.selectedRoom,
          gameId: this.state.currentGame.id,
          closed: {$not: true}
        },
        include: [{ all: true }]
      }).then(bettings => {
        let batchUpdate = []
        bettings.forEach(betting => {
          let member = betting.member;
          let finalResult = betting.finalResult;
          batchUpdate.push(member.update({score: member.score + finalResult, closed: true}));
        });
        Promise.all(batchUpdate).then(this._updateGame).then(this._updateRoomMembers).then(this.sendResultReport)
          .then(()=>{ this.state.currentGame.update({closed: true}); })
          .then(this._updateGame).then(this._updateRoomMembers)
        
      })
    })
  }

  forceTerminateGame = () => {
    let game = this.state.currentGame;
    game.destroy().then(this._updateGame);
  }

  sendRoomStatus = () => {
    let selectedRoom = this.props.wechat.selectedRoom
    let msg = '💰━━━英雄榜━━━💰\n'
    msg += this.state.roomMembers.sort((a,b) => b.score > a.score).map(m => {
      return `[${_.padEnd(m.name.slice(0,10), 10,' ')}]  ${m.score}`
    }).join("\n")
    this.sendMessageToRoom(msg)
  }
  sendBettingInfo = () => {
    this._updateRoomMembers().then(() => {
      let betList = this.state.roomMembers.filter(m => m.betting != null && m.betting.betScore != null)
      let betText = betList.map((m, idx) => {
        return `${idx+1}. [${m.name} 下注：${m.betting.betScore}]`
      }).join("\n")
      let text = 
  `💰━━━下注統計━━━💰
本局人数：${betList.length}人
本局總注：${_.sumBy(betList, m => m.betting.betScore)}分
---------有效注數---------
${betText}

━━━━━━━━━
▶以上請老闆核對
▶含庄包：${betList.length + 1 }包
▶紅包金：${betList.length + 1 + 0.2}元
━━━━━━━━━`
      this.sendMessageToRoom(text);
    })

  }
  sendGameInfo = () => {
    let game = this.state.currentGame
    this._updateGame().then(()=>{

      if(game) {
        let text = 
`👑本局庄家：${game.member.name}
💰庄錢💰${game.member.score}
🌟最大下注：${game.maxScore}
🌟最小下注：200
━━━━━━━━━━━━
🔊倍數規則
🆙━妞妞3⃣倍
🆙━8,9點2⃣倍
🆙━其它1⃣倍
━━━你媽的Club━━━
🏁🐮祝您旗開得勝🐮🏁`;
        console.log(text);
        this.sendMessageToRoom(text)
      }
    })   
  }

  sendResultReport = () => {
    return new Promise(resolve => {
      let game = this.state.currentGame;
      let members = this.state.roomMembers;
      let total = _.sumBy(members, m => { 
        if(m.betting) { return m.betting.betScore }
        return 0
      })
      let banker = members.find(m=>m.betting && m.betting.isBanker);
      let winners = members.filter(m => m.betting && m.betting.isWin);
      let winnersText = winners.map((m, idx) => {
        return `${idx+1}🈶 ${m.name}\n`+ 
          `搶: ${m.betting.redPoint} ${redPointToText(m.betting.redPoint)}\n`+ 
          `壓: ${m.betting.betScore} ${m.betting.multiple}倍  贏 ${m.betting.finalResult}\n` + 
          `---------------------------\n`
      })
      let losers = members.filter(m => m.betting && !m.betting.isWin && m.betting.isBanker != true);
      let losersText = losers.map((m, idx) => {
          return `${idx+1}🈳 ${m.name}\n`+ 
            `搶: ${m.betting.redPoint} ${redPointToText(m.betting.redPoint)}\n`+ 
            `壓: ${m.betting.betScore} ${m.betting.multiple}倍  輸 ${m.betting.finalResult}\n` + 
            //`上局${m.score} ${m.betting.multiple}倍  輸 ${m.betting.result}\n` + 
            `---------------------------\n`
        }) 
      let bankerWinScore = _.sumBy(losers, m => m.betting.result) * -1;
      let bankerLoseScore = _.sumBy(winners, m => m.betting.result) ;
      let text = 
      `🎆你媽的Club-第${game.id}局🎆\n` +
      `📡本局總下注：${total}\n` +
      `莊家：${banker.name}\n` +
      `搶：${banker.betting.redPoint} ${redPointToText(banker.betting.redPoint)}\n` +
      `輸：${bankerLoseScore} ` +
      `贏：${bankerWinScore}\n` +
      `總計：${bankerWinScore - bankerLoseScore}\n` +
      `━━━[以下玩家赢]━━━\n`+
      winnersText.join("") +
      `━━━[以下玩家输]━━━\n` +
      losersText.join("")
      this.sendMessageToRoom(text).then(resolve);
    })

  }

  toggleOpenBankerRegistration = () => {
    let { openBankerRegistration } = this.state;
    this.setState({openBankerRegistration: !openBankerRegistration}, () => {
      let { openBankerRegistration } = this.state;
      if(openBankerRegistration){
        this.sendMessageToRoom("開放搶庄")
      } else {
        this.sendMessageToRoom("結束搶庄")
      }
    })
  }
  setBetting = (member, betScore) => {
    let topic = this.state.currentRoom.topic;
    let game = this.state.currentGame;
    if(member.betting == null){
      member.createBetting({roomTopic: topic, gameId: game.id, betScore: betScore}).then(this._updateRoomMembers);
    } else {
      member.betting.update({betScore: betScore}).then(this._updateRoomMembers);
    }
    // let betting = this.state.betting;
    // betting[memberId] = betScore;
    // this.setState({betting}, this._updateRoomMembers);
  }
  setRedEnvelope = (member, result) => {
    let topic = this.state.currentRoom.topic;
    let game = this.state.currentGame;
    if(member.betting != null) {
      member.betting.update({redPoint: result}).then(this._updateRoomMembers);
    } else if(member.banker == true) {
      member.createBetting({roomTopic: topic, gameId: game.id, redPoint: result, isBanker: true}).then(this._updateRoomMembers);
    }
  }

  redEnvelopeOverTime = (member) => {
    member.betting.destroy().then(()=>{
      member.update({score: member.score - 1000}).then(this._updateRoomMembers);
      this.sendMessageToRoom(`${member.name}超時未領包，扣除一千分。`)
    })
  }

  snatchRedEnvelope = (snatcher) => {
    //被搶奪者
    var member = this.state.roomMembers.find(m => m.betting && m.banker != true && m.redPoint == null)
    if(member == null) return;
    snatcher.reload().then(()=> member.reload()).then(()=> {
      let bulk = [];
      bulk.push(snatcher.update({score: snatcher.score - 1000}));
      bulk.push(member.update({score: member.score + 1000}));
      bulk.push(member.betting.destroy());
      Promise.all(bulk).then(this._updateRoomMembers);
      this.sendMessageToRoom(`${snatcher.name}搶包，扣除 1000 分，被搶包者 ${member.name} 加 1000 分`)
    })
    // bootbox.prompt({
    //     title: "This is a prompt with select!",
    //     inputType: 'select',
    //     inputOptions: [
    //         {
    //             text: 'Choose one...',
    //             value: '',
    //         },
    //         {
    //             text: 'Choice One',
    //             value: '1',
    //         },
    //         {
    //             text: 'Choice Two',
    //             value: '2',
    //         },
    //         {
    //             text: 'Choice Three',
    //             value: '3',
    //         }
    //     ],
    //     callback: function (result) {
    //       snatcher.reload().then(member.reload).then(()=> {
    //         let bulk = [];
    //         bulk.push(snatcher.then.update({score: snatcher.score - 1000}));
    //         bulk.push(member.betting.destroy());
    //         Promise.all(bulk).then(this._updateRoomMembers);
    //       })
    //     }
    // });
  }

  snatchBankerRedEnvelope = (snatcher) => {
    this._updateRoomMembers().then(() => {
      var players = this.state.roomMembers.find(m => m.betting);
      snatcher.reload().then(()=> {
        let bulk = [];
        bulk.push(snatcher.update({score: snatcher.score - players.length * 200}));
        players.forEach(m => {
          bulk.push(member.update({score: member.score + 200}));
        })
        bulk.push(this.state.currentGame.destroy());
        Promise.all(bulk).then(this._updateGame).then(this._updateRoomMembers);
        this.sendMessageToRoom(`${snatcher.name}搶莊包，賠給所有玩家200分`)
      })
    })
  }

  componentDidMount() {
    request('IS_LOGIN').then(response => {
      this.props.dispatch(loginSuccess(response.isLogin))
    })
  }

  
  renderMain(){
    let { selectedRoom, openBankerRegistration, currentGame, currentRoom } = this.state;
    if(currentRoom){
      let currentGameStatus;
      if(currentGame == null) {
        currentGameStatus = <div>等待新的一局開始</div>
      } else {
        currentGameStatus = <div>狀態：{currentGame.status}<br/>
            莊家：{currentGame.member.name}<br/>
            最大下注：{currentGame.maxScore}
          </div>
      }
      
      return (
        <div>
          
          <button className={`btn btn-${openBankerRegistration ? 'primary' : 'danger'}`}   onClick={this.toggleOpenBankerRegistration}>
            {openBankerRegistration? "開放搶庄" : "結束搶庄"}
          </button>
          <button className="btn btn-primary"  onClick={this.sendRoomStatus}>Send Room Status</button>
          <button className="btn btn-primary"  onClick={this.sendGameInfo}>傳送本局莊家資訊</button>
          <button className="btn btn-primary"  onClick={this.sendBettingInfo}>傳送下注資訊</button>
          <button className="btn btn-primary"  onClick={this.sendResultReport}>傳送結算資訊</button>
          <h3>本局狀態</h3>
            { currentGame == null ? 
              <button className="btn btn-primary"  onClick={this.newGame}>開啟新局</button> 
              : "" }
            { currentGame && currentGame.status === "待下注" ? 
              <button className="btn btn-warning"  onClick={this.stopBetting}>停止下注</button> 
              : "" }
            { currentGame && currentGame.status === "待發包" ? 
              <button className="btn btn-warning"  onClick={this.finalizeGame}>計算結果</button> 
              : "" }
            { currentGame && currentGame.status === "已結算" ? 
              <button className="btn btn-warning"  onClick={this.finalizeGame}>重新計算</button> 
              : "" }   
            { currentGame && currentGame.status === "已結算" ? 
              <button className="btn btn-danger"  onClick={this.closeGame}>確認入帳</button> 
              : "" }   
            {
              currentGame ? 
              <button className="btn btn-danger"  onClick={this.forceTerminateGame}>強制結束本局</button> 
              : ""
            }  
            {currentGameStatus}
          <br/>
          <h3>莊家等候區</h3>
          <ol>
            {this.state.bankerQueue.map(m => <li key={m.id}>{`${m.memberName}，上限${m.maxScore}，共${m.rounds}`}</li>)}
          </ol>
          <br/>
          <h3>玩家列表<small> 新進玩家請更新列表</small></h3>
          <table className="table table-striped table-hover form-inline">
            <thead>
              <tr>
                <th>#</th>
                <th>名稱</th> 
                <th>別名</th> 
                <th>分數</th>
                <th>下注</th>
                <th>點數</th>
                <th>本局結果</th>
                <th>管理費</th>
                <th></th>
              </tr>
            </thead>  
            <tbody>
            {
              this.state.roomMembers.sort((a,b) => {
                return 2 * (b.banker - a.banker) +
                       1 * ((b.betting && 1 || 0) - (a.betting && 1 || 0))
              }).map((m,idx) => {
                return <tr key={idx} className="members">
                  <td>{idx + 1} </td>
                  <td>{m.name} {m.banker ? " (👑庄家)" : ""} </td>
                  <td>{m.alias}</td>
                  <td>{m.score}</td>
                  {/* <td><input value={this.state.betting[m.id]} data-idx={m.id} onChange={(e) => {this.setBetting(e)}} className="form-control input-xs" style={{width: '80px'}}/></td>  */}
                  <td>
                    {m.betting && m.betting.betScore} {" "}
                    {/* { this.state.currentGame && m.betting && m.betting.betScore > this.state.currentGame.maxScore ?
                      <button className="btn btn-warning btn-sm" data-idx={m.id} onClick={(e) => {this.setBetting(m.id, this.state.currentGame.maxScore)}}>設為上限</button>
                      : ""
                    } */}
                  </td> 
                  <td>
                    { this.state.currentGame && m.betting && (m.betting.betScore || m.banker == true) ?
                        <input value={m.betting.redPoint || ""} data-idx={m.id} onChange={(e) => {this.setRedEnvelope(m, e.target.value)}} className="form-control input-xs" style={{width: '80px'}}/>
                      : ""
                    }
                    { this.state.currentGame && m.betting && (m.betting.redPoint == null || m.betting.redPoint == "") 
                        && m.banker != true ?
                        <button onClick={()=> {this.redEnvelopeOverTime(m)}} className="btn btn-warning btn-xs">超時</button>
                      : ""
                    }
                    {
                      this.state.currentGame && m.betting == null ?
                      <button className="btn btn-xs btn-danger" onClick={() => this.snatchRedEnvelope(m)}>搶包</button>
                      : ""
                    }
                  </td>
                  <td>
                    { m.betting ? m.betting.finalResult + `(${m.betting.fee})` : ""}
                  </td>
                  <td>
                    { m.betting && m.betting.fee ?  `(${m.betting.fee})` : ""}
                  </td>
                  <td><button className="btn btn-primary btn-xs" onClick={() => {this.addScore(m)}}>上分</button></td>
                </tr>
              })
            }
            </tbody>
          </table>

        </div>  
      )
    } else {
      return <div/>
    }
  }

  render() {
    if(this.props.wechat.loginUrl == null && this.props.wechat.isLogin == false) {
      return <h1>連線中<button onClick={()=>ipcRenderer.send('refreshBrowser')}>Refresh</button></h1>
    }
    if(this.props.wechat.loginUrl != null && this.props.wechat.isLogin == false) {
      return <div>
        <img src={`http://chart.apis.google.com/chart?cht=qr&chs=500x500&chl=${encodeURI(this.props.wechat.loginUrl)}`} />
        <button onClick={()=>ipcRenderer.send('refreshBrowser')}>Refresh</button>
        </div>
    }
    let contact_list = this.props.wechat.contacts.map(c => {
      if(c.obj && c.obj.name){
        let rawMarkup = { __html: c.obj.name }
        return <div dangerouslySetInnerHTML={rawMarkup} />
      }else {
        return null
      }
    })

    let room_list = this.props.wechat.rooms.map((c, idx) => {
      if(c.obj && c.obj.topic){
        let rawMarkup = { __html: c.obj.topic }
        return <div dangerouslySetInnerHTML={rawMarkup} key={idx} data-id={c.id} data-topic={c.topic}/>
      }else {
        return null
      }
    })

    
    return (
      <div>
        <div className="form-inline">
          <button className="btn btn-default" onClick={this.refresh}>Refresh</button>
          {/* {contact_list}
          <hr/>
          {room_list} */}
          <select className="form-control" onChange={this.handleRoomChange} width={300}>
            {
              this.props.wechat.rooms.map((c,idx) => {
                if(c.obj && c.obj.topic){
                  let rawMarkup = { __html: c.obj.topic }
                  return <option dangerouslySetInnerHTML={rawMarkup} key={idx} value={c.topic} data-id={c.id} data-topic={c.topic}/>
                }else {
                  return null
                }
              })
            }
            
          </select>
          <button className="btn btn-default" onClick={this.getRoom}>OK</button>
        </div>  
        <hr/>
        {this.renderMain()}
        

      </div>  
    );
  }
}

function mapStateToProps(state) {
  return {
    wechat: state.wechat
  };
}

export default connect(mapStateToProps)(HomePage);


function redEnvelopeToPoint(r){
  let p = _.sum(r.toString().replace(/\D/g,'').split('').map(d => parseInt(d))) % 10
  if(p == 0 ) return 10
  return p
}
//p1必須是閒家，r1 = "1.03"
function compareRedPoint(r1, r2){
  let isWin, multiple = 1;
  let p1 = _.sum(r1.toString().replace(/\D/g,'').split('').map(d => parseInt(d))) % 10 
  let p2 = _.sum(r2.toString().replace(/\D/g,'').split('').map(d => parseInt(d))) % 10
  console.log(p1,p2)
  if(p1 >= 8 ) {p1 = 10; multiple = 2;}
  if(p2 >= 8 ) {p2 = 10; multiple = 2;}
  if(p1 == 0 ) {p1 = 10; multiple = 3;}
  if(p2 == 0 ) {p2 = 10; multiple = 3;}
  let isP1_777 = false, isP2_777 = false;
  //豹子判定
  // if(isAllSameChr(r1.toString().replace(/\D/g,'').split(''))){
  //   p1 += 100
  //   isP1_777 = true
  //   multiple = 3
  // }
  // if(isAllSameChr(r2.toString().replace(/\D/g,'').split(''))){
  //   p2 += 100
  //   isP1_777 = true
  //   multiple = 3
  // }


  if(p1 <= 2){
    isWin = false;
  }else if(p1 > p2) {
    isWin = true;
  }else if(p1 < p2) {
    isWin = false;
  }else if(p1 == p2){
    if(r1>r2){
      isWin = true
    }else if(r1<r2){
      isWin = true
    }else{
      isWin = false
      multiple = 0
    }
  }
  return {isWin, multiple}
}

function isAllSameChr(chrArr){
  if(chrArr.lenth == 0) {
    return false
  } else {
    let firstChr = chrArr[0]
    if(chrArr.find(c => c != firstChr)) return false
    return true
  }
}

function redPointToText(r){
  let text = ""
  let p1 = _.sum(r.toString().replace(/\D/g,'').split('').map(d => parseInt(d))) % 10;
  if(p1 == 0 ) {
    return "妞妞"
  }
  // if(isAllSameChr(r.toString().replace(/\D/g,'').split(''))){
  //   return "豹子"
  // }
  return "妞" + p1

}