const express = require('express');
const router = express.Router();

/* GET /dashboard/ page. */
router.get('/', async (req, res, next) => {
  const user = req.user;
  // res.send(user);
  res.render('dashboard', { user });
});

module.exports = router;
