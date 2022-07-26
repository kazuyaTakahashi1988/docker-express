var express = require('express');
var router = express.Router();

var Post = require('./../models').Post;

/* GET home page. */
router.get('/', async (req, res, next) => {
  Post.findAll({
    order: [['id', 'DESC']],
    limit: 6
  }).then(posts => {
    res.render('index', { user: req.user, posts });
  });
});

module.exports = router;
