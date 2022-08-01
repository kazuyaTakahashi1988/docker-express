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
        const posts = result.rows; // 取得記事
        const count = Math.ceil(result.count / perPage); // ページ総数
        const pegePath = '/posts';
        const pageTitle = 'Q & A 一覧'
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
        const posts = result.rows;
        const count = Math.ceil(result.count / perPage);
        const pegePath = `/posts/user/${req.params["id"]}`;
        const pageTitle = `ユーザー：${userOne.name}`;
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath,
            pageTitle
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
        const posts = result.rows;
        const count = Math.ceil(result.count / perPage);
        const pegePath = `/posts/category/${req.params["id"]}`;
        const pageTitle = `カテゴリー：${categoryOne.category_name}`;
        res.render('posts', {
            user: req.user,
            posts,
            count,
            page,
            pegePath,
            pageTitle
        });
    });

});

/* --------------------------------------
    ▽ 記事詳細 ▽
-------------------------------------- */

/* GET 詳細 */
router.get('/detail/:id', async (req, res, next) => {

    const comments = await Comment.findAll({
        order: [['id', 'DESC']],
        where: { post_id: req.params["id"] },
        include: [{ model: User }, { model: Reply, include: [{ model: User }] }]
    });

    Post.findOne({
        where: { id: req.params["id"] },
        include: [{ model: User }, { model: Category }, { model: Like }]
    }).then( async ( post ) => {
        // res.send(post);
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
            post,
            comments,
            judge
        });
    });

});

module.exports = router;
