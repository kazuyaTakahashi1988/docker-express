var express = require('express');
var router = express.Router();

// sequelizeの設定を追加
const { Sequelize } = require('sequelize');
// databaseやuser, passwordをdcoker-compose.ymlで設定したものを使う↓
const sequelize = new Sequelize('express_db', 'root', 'root', {
  host: 'express-mysql', // hostの名前をdocker-compose.ymlで設定したmy_mysqlに変更する
  dialect: 'mysql',
});

let word;

/* GET users listing. */
router.get('/', async function (req, res, next) {
  // 忘れずに上に"async"を追加する。
  // my_mysqlに接続されているかテスト
  try {
    await sequelize.authenticate();
    word = "success";
    console.log('Connection has been established successfully.');

  } catch (error) {
    word = "error";
    console.error('Unable to connect to the database:', error);
  }
  res.send('respond with a resource ' + word);
});

module.exports = router;
