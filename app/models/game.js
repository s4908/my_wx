import Sequelize from 'sequelize'
import {db, sync_force} from '../database'
import { Room } from './room'
import { Member } from './member'

export const Game = db.define('game', {
  roomTopic: { 
    type: Sequelize.STRING, 
    allowNull: false
  },
  banker: { type: Sequelize.INTEGER, allowNull: false },
  maxScore: { type: Sequelize.INTEGER, allowNull: false },
  status: { type: Sequelize.STRING, defaultValue: "待下注" },
  closed: { type: Sequelize.BOOLEAN }
});


// force: true will drop the table if it already exists
