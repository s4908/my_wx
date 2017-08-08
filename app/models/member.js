import Sequelize from 'sequelize'
import {db, sync_force} from '../database'
//import { Room } from './room'


export const Member = db.define('member', {
  name: {
    type: Sequelize.STRING, unique: 'compositeIndex'
  },
  alias: {
    type: Sequelize.STRING
  },
  roomTopic: { 
    type: Sequelize.STRING,  unique: 'compositeIndex'
  },
  score: {
    type: Sequelize.INTEGER, default: 0
  },
  deposite: {
    type: Sequelize.INTEGER, default: 0
  }
},{
  getterMethods: {
    banker() {
      if(this.isBanker != undefined){
        return this.isBanker 
      }else{
        return false
      }
    }
  },

  setterMethods: {
    banker(value) {
      this.isBanker = value;
    },
  }
});

//Member.belongsTo(Room, {foreignKey: 'roomTopic', targetKey: 'topic'})
//Member.hasMany(Betting)
// force: true will drop the table if it already exists
