import Sequelize from 'sequelize'
import {db, sync_force} from '../database'

export const Room = db.define('room', {
  topic: { type: Sequelize.STRING, allowNull: false, unique: true },
});

// force: true will drop the table if it already exists
Room.sync({force: sync_force}).then(() => {
  // Table created
  // return Room.create({
  //   topic: 'test'
  // });
});

