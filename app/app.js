const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const path = require('path');

// 認証関連
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const passport = require('./auth');
const session = require('express-session');
const flash = require('connect-flash');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('./models').User;

// Router
const indexRouter = require('./routes/index');
const postsRouter = require('./routes/posts');
const likesRouter = require('./routes/likes');
const createRouter = require('./routes/create');
const dashboardRouter = require('./routes/dashboard');
const app = express();

// use 認証関連
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(session({
  secret: 'YOUR-SECRET-STRING',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// use Router
const adminAuthMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else if (req.cookies.remember_me) {
    const [rememberToken, hash] = req.cookies.remember_me.split('|');
    User.findAll({
      where: {
        rememberToken: rememberToken
      }
    }).then(users => {
      for (let i in users) {
        const user = users[i];
        const verifyingHash = crypto.createHmac('sha256', APP_KEY)
          .update(user.id + '-' + rememberToken)
          .digest('hex');
        if (hash === verifyingHash) {
          return req.login(user, () => {
            next();
          });
        }
      }
      res.redirect(302, '/login');
    });
  } else {
    res.redirect(302, '/login');
  }
};
app.use('/', indexRouter);
app.use('/posts', postsRouter);
app.use('/likes', adminAuthMiddleware, likesRouter);
app.use('/create', adminAuthMiddleware, createRouter);
app.use('/dashboard', adminAuthMiddleware, dashboardRouter);

// use view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));

/* ------------------------------------------------
  ▽ 認証関連 ▽
------------------------------------------------ */

// 暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';

// 認証判定
// const authJudge = (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     next();
//   } else {
//     res.redirect(302, '/');
//   }
// };
const authJudge = (req, res, next) => {
  if (req.cookies.remember_me) {
    const [rememberToken, hash] = req.cookies.remember_me.split('|');
    User.findAll({
      where: {
        rememberToken: rememberToken
      }
    }).then(users => {
      for (let i in users) {
        const user = users[i];
        const verifyingHash = crypto.createHmac('sha256', APP_KEY)
          .update(user.id + '-' + rememberToken)
          .digest('hex');
        if (hash === verifyingHash) {
          return req.login(user, () => {
            next();
          });
        }
      }
      res.redirect(302, '/login');
    });
  } else {
    res.redirect(302, '/login');
  }
};

/* ---------------------------
  アカウント作成 
--------------------------- */

// アカウント作成ページ
app.get('/register', authJudge, (req, res) => {
  return res.render('auth/register', {
    errors: undefined
  });
});

// バリデーション・ルール
const regiValidRules = [
  check('name')
    .not().isEmpty().withMessage('名前は項目は必須入力です。'),
  check('email')
    .not().isEmpty().withMessage('メールアドレスは項目は必須入力です。')
    .isEmail().withMessage('有効なメールアドレス形式で指定してください。'),
  check('password')
    .not().isEmpty().withMessage('パスワードはこの項目は必須入力です。')
    .isLength({ min: 8, max: 25 }).withMessage('パスワードは8文字から25文字にしてください。')
    .custom((value, { req }) => {
      if (req.body.password !== req.body.passwordConfirmation) {
        throw new Error('パスワード（確認）と一致しません。');
      }
      return true;
    })
];

app.post('/register', regiValidRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { // バリデーション失敗
    // return res.status(422).json({ errors: errors.array() });
    return res.render('auth/register', {
      errors: errors.array()
    })
  }
  // 送信されたデータ
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  // ユーザーデータを登録（仮登録）
  User.findOrCreate({
    where: { email: email },
    defaults: {
      name: name,
      email: email,
      password: bcrypt.hashSync(password, bcrypt.genSaltSync(8))
    }
  }).then(([user]) => {
    res.redirect(307, '/login');
  });
});

/* ---------------------------
  ログイン
--------------------------- */

// ログインページ
app.get('/login', authJudge, (req, res) => {
  const errorMessage = req.flash('error').join('<br>');
  res.render('auth/login', {
    errorMessage: errorMessage
  });
});

// ログイン実行
app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
    badRequestMessage: '「メールアドレス」と「パスワード」は必須入力です。'
  }),
  (req, res, next) => {
    if (!req.body.remember) {  // 次回もログインを省略しない場合
      res.clearCookie('remember_me');
      return next();
    }
    const user = req.user;
    const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
    const hash = crypto.createHmac('sha256', APP_KEY)
      .update(user.id + '-' + rememberToken)
      .digest('hex');
    user.rememberToken = rememberToken;
    user.save();
    res.cookie('remember_me', rememberToken + '|' + hash, {
      path: '/',
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
    });
    return next();
  },
  (req, res) => {
      res.redirect('/dashboard');
  }
);

// ログアウトページ
app.get('/logout', (req, res) => {
  req.session.passport.user = undefined;
  res.clearCookie('remember_me');
  res.redirect('/')
});

/* ------------------------------------------------
  ▽ catch 404 and forward to error handler ▽
------------------------------------------------ */
app.use((req, res, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
