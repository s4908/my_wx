import Sequelize from 'sequelize';
import { db } from '../database';


export const Hist = db.define('Hist', {
  roomId: {
    type: Sequelize.INTEGER,
  },
  roomTopic: {
    type: Sequelize.STRING,
  },
  gameId: {
    type: Sequelize.INTEGER,
  },
  memberId: {
    type: Sequelize.INTEGER,
  },
  event: {
    type: Sequelize.STRING
  },
  note: {
    type: Sequelize.STRING
  }
});
//import { Game } from './game'
//import { Member } from './member'
//Betting.belongsTo(Member, {foreignKey: 'memberId', targetKey: 'id'})

// force: true will drop the table if it already exists


