import Sequelize from 'sequelize'

const { app } = require('electron').remote;

console.log("userDataPath: " + app.getPath('userData'));
const db = new Sequelize({
  dialect: 'sqlite',

  // SQLite only
  storage: `${app.getPath('userData')}/databaseQAQ.db`
});

db
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
const sync_force = false
export { db, sync_force}