import Sequelize from 'sequelize'
import {db, sync_force} from '../database'
import { Room } from './room'
import { Member } from './member'

export const BankerQueue = db.define('bankerQueue', {
  memberId: {
    type: Sequelize.INTEGER, allowNull: false
  },
  memberName: {
    type: Sequelize.STRING, allowNull: false
  },
  roomTopic: { 
    type: Sequelize.STRING, allowNull: false
  },
  maxScore: {
    type: Sequelize.INTEGER, default: 0, validate: {min: 1000, max: 99999}, allowNull: false
  },
  rounds: {
    type: Sequelize.INTEGER, default: 1, validate: {max: 3}, allowNull: false
  }
});

//BankerQueue.belongsTo(Room, {foreignKey: 'roomTopic', targetKey: 'topic'})

//BankerQueue.hasOne(Member, {foreignKey: 'memberId'})

// force: true will drop the table if it already exists
