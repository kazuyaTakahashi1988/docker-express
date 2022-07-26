var express = require('express');
var router = express.Router();


const adminAuthMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect(302, '/login');
  }
};

/* GET user page. */
router.get('/', adminAuthMiddleware, async (req, res, next) => {
  // Category.findOne({ where: { rememberToken: req.session.passport.user.rememberToken } }).then(users => {
  // });
  // res.send(posts);
  res.render('dashboard', { user: req.user });
});

module.exports = router;
