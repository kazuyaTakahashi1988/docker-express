const express = require('express');
const router = express.Router();
const Post = require('./../models').default.Post;

const perPage = 6; // 表示ページ数

/* GET home page. */
router.get('/', async (req, res, next) => {
  Post.findAll({
    order: [['id', 'DESC']],
    limit: perPage
  }).then(posts => {
    res.render('index', { user: req.user, posts });
  });
});

export = router;
