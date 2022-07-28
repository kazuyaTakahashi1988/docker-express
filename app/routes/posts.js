const express = require('express');
const router = express.Router();

const Post = require('./../models').Post;
const User = require('./../models').User;
const Category = require('./../models').Category;

const perPage = 6; // 表示ページ数

/* --------------------------------------
    ▽ 記事一覧 ▽
-------------------------------------- */

/* Q & A 一覧 */
router.get('/', async (req, res, next) => {
    const page = req.query.page || 1; // ?page= のクエリ情報

    Post.findAndCountAll({
        order: [['id', 'DESC']],
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows; // 取得記事
        const count = Math.floor(result.count / perPage) + 1; // ページ総数
        res.render('posts', {
            user: req.user, // 認証ユーザー情報
            posts, // 取得記事情報
            count, // ページ総数（ページャー生成用）
            page, // ページ総数から何件目（ページャー生成用）
            pegePath: '', // ページのパス（ページャー生成用）
            pageTitle: 'Q & A 一覧' // ページのタイトル
        });
    });
});

/* ユーザー記事 一覧 */
router.get('/user/:id', async (req, res, next) => {
    const page = req.query.page || 1;

    let pageTitle;
    User.findOne({ where: { id: req.params["id"] } }
    ).then(userOne => {
        pageTitle = userOne.name
    }); // ページのタイトル取得

    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { user_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows;
        const count = Math.floor(result.count / perPage) + 1;
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath: `/user/${req.params["id"]}`,
            pageTitle: `ユーザー：${pageTitle}`
        });
    });
});

/* カテゴリー記事 一覧 */
router.get('/category/:id', async (req, res, next) => {
    const page = req.query.page || 1;

    let pageTitle;
    Category.findOne({ where: { id: req.params["id"] } }
    ).then(categoryOne => {
        pageTitle = categoryOne.category_name
    }); // ページのタイトル取得

    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { category_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows;
        const count = Math.floor(result.count / perPage) + 1;
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath: `/category/${req.params["id"]}`,
            pageTitle: `カテゴリー：${pageTitle}`
        });
    });
});

/* --------------------------------------
    ▽ 記事詳細 ▽
-------------------------------------- */

/* 記事 詳細 */
router.get('/detail/:id', async (req, res, next) => {
    Post.findOne({
        where: { id: req.params["id"] },
        include: [{ model: User }, { model: Category }]
    }
    ).then(post => {
        // res.send(post);
        res.render('posts/detail', {
            user: req.user,
            post
        });
    });
});

module.exports = router;
