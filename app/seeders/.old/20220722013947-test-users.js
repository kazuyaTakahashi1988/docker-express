'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: (queryInterface, Sequelize) => {
    const now = new Date();
    return queryInterface.bulkInsert('Users', [
      {
        name: '太郎',
        email: 'taro@example.com',
        password: bcrypt.hashSync('secretsecret', bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '次郎',
        email: 'jiro@example.com',
        password: bcrypt.hashSync('secretsecret', bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '一郎',
        email: 'ichiro@example.com',
        password: bcrypt.hashSync('secretsecret', bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '二郎',
        email: 'niro@example.com',
        password: bcrypt.hashSync('secretsecret', bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '三郎',
        email: 'saburo@example.com',
        password: bcrypt.hashSync('secretsecret', bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};