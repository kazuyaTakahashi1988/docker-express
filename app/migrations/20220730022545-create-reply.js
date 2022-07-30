'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Replies', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          field: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade"
      },
      comment_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: "Comments",
          field: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade"
      },
      reply: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Replies');
  }
};