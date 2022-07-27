const express = require('express');
const router = express.Router();
const Post = require('./../models').Post;
const User = require('./../models').User;
const Category = require('./../models').Category;

/* GET /posts/ page. */
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
        res.render('posts', { user: req.user, posts, count, page });
    });
});

/* GET /posts/:id page. */
router.get('/detail/:id', async (req, res, next) => {
    const user = req.user;
    // res.send(req.params["id"]);
    Post.findOne({
        where: { id: req.params["id"] },
        include: [{ model: User },{ model: Category }]
    }
    ).then(post => {
        // res.send(post);
        res.render('posts/detail', { user: req.user, post });
    });
});

module.exports = router;
