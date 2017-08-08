import Sequelize from 'sequelize'
import {db, sync_force} from '../database'


export const Betting = db.define('betting', {
  roomTopic: { 
    type: Sequelize.STRING,
    unique: 'compositeIndex',
    allowNull: false
  },
  gameId: { 
    type: Sequelize.INTEGER,
    unique: 'compositeIndex'
  },
  memberId: { 
    type: Sequelize.INTEGER, 
    unique: 'compositeIndex',
    allowNull: false
  },
  betScore: {
    type: Sequelize.INTEGER
  },
  redPoint: {
    type: Sequelize.STRING
  },
  isBanker: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  isWin: {
    type: Sequelize.BOOLEAN
  },
  multiple: {
    type: Sequelize.INTEGER
  },
  result: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  finalResult: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  fee: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  note: {
    type: Sequelize.STRING
  },
  closed: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});
//import { Game } from './game'
//import { Member } from './member'
//Betting.belongsTo(Member, {foreignKey: 'memberId', targetKey: 'id'})

// force: true will drop the table if it already exists


