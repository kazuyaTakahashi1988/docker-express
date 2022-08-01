const express = require('express');
const router = express.Router();

const User = require('./../models').User;
const Post = require('./../models').Post;
const Category = require('./../models').Category;
const Comment = require('./../models').Comment;
const Reply = require('./../models').Reply;
const Like = require('./../models').Like;

const perPage = 6; // 表示ページ数

/* --------------------------------------
    ▽ 記事一覧 ▽
-------------------------------------- */

/* GET 一覧（Q & A） */
router.get('/', async (req, res, next) => {
    const page = req.query.page || 1; // ?page= のクエリ情報

    Post.findAndCountAll({
        order: [['id', 'DESC']],
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        res.render('posts', {
            user: req.user, // 認証ユーザー情報
            posts: result.rows, // 取得記事情報
            count: Math.ceil(result.count / perPage), // ページ総数（ページャー生成用）
            pegePath: '/posts', // ページのパス（ページャー生成用）
            pageTitle: 'Q & A 一覧', // ページのタイトル
            page // ?page= のクエリ情報（ページャー生成用）
        });
    });

});

/* GET 一覧（ユーザー） */
router.get('/user/:id', async (req, res, next) => {

    const userOne = await User.findOne({
        where: { id: req.params["id"] }
    });

    const page = req.query.page || 1;
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { user_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        res.render('posts', {
            user: req.user,
            posts: result.rows,
            count: Math.ceil(result.count / perPage),
            pegePath: `/posts/user/${req.params["id"]}`,
            pageTitle: `ユーザー：${userOne.name}`,
            page,
        });
    });

});

/* GET 一覧（カテゴリー） */
router.get('/category/:id', async (req, res, next) => {

    const categoryOne = await Category.findOne({
        where: { id: req.params["id"] }
    });

    const page = req.query.page || 1;
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        where: { category_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        res.render('posts', {
            user: req.user,
            posts: result.rows,
            count: Math.ceil(result.count / perPage),
            pegePath: `/posts/category/${req.params["id"]}`,
            pageTitle: `カテゴリー：${categoryOne.category_name}`,
            page
        });
    });

});

/* --------------------------------------
    ▽ 記事詳細 ▽
-------------------------------------- */

/* GET 詳細 */
router.get('/detail/:id', async (req, res, next) => {
    const page = req.query.page || 1; // ?page= のクエリ情報

    const postResult = await Post.findOne({
        where: { id: req.params["id"] },
        include: [{ model: User }, { model: Category }, { model: Like }]
    });

    Comment.findAndCountAll({
        order: [['id', 'DESC']],
        where: { post_id: req.params["id"] },
        offset: (page - 1) * perPage,
        limit: perPage,
        include: [{ model: User }, { model: Reply, include: [{ model: User }] }]
    }).then(async (result) => {
        let judge = false; // Likeしたかの判定
        if (req.user) {
            judge = await Like.findOne({
                where: {
                    post_id: req.params["id"],
                    user_id: req.user.id
                }
            });
        }
        res.render('posts/detail', {
            user: req.user,
            post: postResult,
            comments: result.rows,
            count: Math.ceil(result.count / perPage),
            pegePath: `/posts/detail/${req.params["id"]}`,
            page,
            judge
        });
    });

});

module.exports = router;
