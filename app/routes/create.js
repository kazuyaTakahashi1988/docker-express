const express = require('express');
const router = express.Router();

const Post = require('./../models').Post;
const User = require('./../models').User;
const Category = require('./../models').Category;

/* --------------------------------------
    ▽ Q & A 記事作成 ▽
-------------------------------------- */

/* GET 作成ページ */
router.get('/post', async (req, res, next) => {
    Category.findAll({
        order: [['id', 'DESC']]
    }).then(categories => {
        res.render('create/post', {
            user: req.user,
            categories
        });
    });
});
/* POST 作成処理 */
router.post('/post', async (req, res, next) => {
    // res.send(req.body);
    Post.create({
        title: req.body.title,
        content: req.body.content,
        user_id: req.user.id,
        category_id: req.body.category_id,
    }
    ).then(result => {
        res.redirect(302, `/posts/detail/${result.id}`);
    });
});

module.exports = router;
