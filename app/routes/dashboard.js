const express = require('express');
const router = express.Router();

/* GET /dashboard/ page. */
router.get('/', async (req, res, next) => {
  // res.send(user);
  res.render('dashboard', { user: req.user });
});

module.exports = router;
