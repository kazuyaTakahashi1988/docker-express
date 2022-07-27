const express = require('express');
const router = express.Router();
const Post = require('./../models').Post;

/* GET /posts/ page. */
router.get('/', async (req, res, next) => {
    const user = req.user;
    const page = req.query.page || 1;
    const perPage = 6;
    Post.findAndCountAll({
        order: [['id', 'DESC']],
        offset: (page - 1) * perPage,
        limit: perPage
    }).then(result => {
        const posts = result.rows; // 取得記事
        const count = Math.floor(result.count / perPage) + 1; // ページ数
        res.render('posts', { user, posts, count, page });
    });
});

module.exports = router;
