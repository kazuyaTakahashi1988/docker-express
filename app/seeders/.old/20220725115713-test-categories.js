'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const now = new Date();
    return queryInterface.bulkInsert('Categories', [
      {
        category_name: 'エンターテインメントと趣味',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '音楽、映画、本',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: 'アニメ、漫画、ゲーム',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '暮らしと生活ガイド',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '料理、レシピ',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: 'ペット、動物',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '健康、美容とファッション',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: 'スポーツ',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '旅行、海外',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '生き方と恋愛、人間関係の悩み',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '子育てと学校',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: 'マナー、冠婚葬祭',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category_name: '年中行事',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Categories', null, {});
  }
};