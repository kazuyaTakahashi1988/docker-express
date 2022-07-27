const express = require('express');
const router = express.Router();

const Post = require('./../models').Post;

/* GET home page. */
router.get('/', async (req, res, next) => {
  const user = req.user;
  Post.findAll({
    order: [['id', 'DESC']],
    limit: 6
  }).then(posts => {
    res.render('index', { user, posts });
  });
});

module.exports = router;
