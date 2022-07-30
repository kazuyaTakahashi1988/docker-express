'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Post.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'id'
      })
      Post.belongsTo(models.Category, {
        foreignKey: 'category_id',
        targetKey: 'id'
      })
      Post.hasMany(models.Like, {
        foreignKey: 'post_id'
      })
    }
}

Post.init({
  user_id: DataTypes.INTEGER,
  category_id: DataTypes.INTEGER,
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  image: DataTypes.STRING,
}, {
  sequelize,
  modelName: 'Post',
});
return Post;
};