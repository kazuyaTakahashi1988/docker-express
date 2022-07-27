const express = require('express');
const router = express.Router();

const Post = require('./../models').Post;
const User = require('./../models').User;
const Category = require('./../models').Category;

/* --------------------------------------
    ▽ 記事一覧 ▽
-------------------------------------- */

/* GET 記事 一覧 */
router.get('/', async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 6;
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows; // 取得記事
        const count = Math.floor(result.count / perPage) + 1; // ページ数
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath: '',
            pageName: ''
        });
    });
});

/* GET ユーザー記事 一覧 */
router.get('/user/:id', async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 6;
    let pageName;
    User.findOne({ where: { id: req.params["id"] } }
    ).then(userOne => {
        pageName = userOne.name
    });
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { user_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows; // 取得記事
        const count = Math.floor(result.count / perPage) + 1; // ページ数
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath: `/user/${req.params["id"]}`,
            pageName
        });
    });
});

/* GET カテゴリー記事 一覧 */
router.get('/category/:id', async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 6;
    let pageName;
    Category.findOne({ where: { id: req.params["id"] } }
    ).then(categoryOne => {
        pageName = categoryOne.category_name
    });
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { category_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows; // 取得記事
        const count = Math.floor(result.count / perPage) + 1; // ページ数
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath: `/category/${req.params["id"]}`,
            pageName
        });
    });
});

/* --------------------------------------
    ▽ 記事詳細 ▽
-------------------------------------- */

/* GET 記事 詳細 */
router.get('/detail/:id', async (req, res, next) => {
    const user = req.user;
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
