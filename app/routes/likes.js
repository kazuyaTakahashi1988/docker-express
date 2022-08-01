const express = require('express');
const router = express.Router();
const Like = require('./../models').Like;
const Post = require('./../models').Post;
const User = require('./../models').User;

const perPage = 6; // 表示ページ数

/* GET home page. */
router.get('/', async (req, res, next) => {
    const page = req.query.page || 1; // ?page= のクエリ情報
    Like.findAndCountAll({
        where: { user_id: req.user.id },
        order: [['id', 'DESC']],
        offset: (page - 1) * perPage,
        limit: perPage,
        include: [{ model: Post, include: [{ model: User }] }]
    }).then(result => {
        const count = Math.ceil(result.count / perPage); // ページ総数
        const pegePath = '/likes';
        const pageTitle = 'お気に入り 一覧';
        let posts = []; // 取得記事
        result.rows.forEach(post => {
            posts.push(post.Post);
        });
        res.render('posts', {
            user: req.user, // 認証ユーザー情報
            posts, // 取得記事情報
            count, // ページ総数（ページャー生成用）
            page, // ページ総数から何件目（ページャー生成用）
            pegePath, // ページのパス（ページャー生成用）
            pageTitle // ページのタイトル
        });
    });

});

module.exports = router;
