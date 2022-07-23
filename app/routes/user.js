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
  // User.findOne({ where: { rememberToken: req.session.passport.user.rememberToken } }).then(users => {
  // });
  // res.send(users);
  res.render('user', { title: req.session.passport.user.id + req.session.passport.user.name });
});

module.exports = router;
