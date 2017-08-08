import { Room } from './room';
import { Member } from './member';
import { Game } from './game';
import { BankerQueue } from './bankerQueue';
import { Betting } from './betting';
import { Hist } from './hist';
import Sequelize from 'sequelize';
import {db} from '../database';
let sync_force = true;


Member.hasOne(Betting)


BankerQueue.belongsTo(Member, {foreignKey: 'memberId', targetKey: 'id' });

Game.belongsTo(Room, { foreignKey: 'roomTopic', targetKey: 'topic' });
Game.belongsTo(Member, { foreignKey: 'banker', targetKey: 'id' });
Game.hasMany(Betting)

Betting.belongsTo(Room, { foreignKey: 'roomTopic', targetKey: 'topic' });
Betting.belongsTo(Game, { foreignKey: 'gameId', targetKey: 'id' });
Betting.belongsTo(Member, { foreignKey: 'memberId', targetKey: 'id' });

db.sync({force: false})
// Member.sync({force: sync_force})
// Room.sync({force: sync_force})
// Game.sync({force: sync_force})
// BankerQueue.sync({force: sync_force})
// Betting.sync({force: sync_force})

export { Member, Room, Game, BankerQueue, Betting, Hist };

