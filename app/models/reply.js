'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reply extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Reply.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'id'
      })
    }
  }
  Reply.init({
    user_id: DataTypes.INTEGER,
    comment_id: DataTypes.INTEGER,
    reply: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Reply',
  });
  return Reply;
};