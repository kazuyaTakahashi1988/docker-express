/* ------------------------------------------------
/*
/*  ▽ set up ▽
/*
/* ------------------------------------------------ */

const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const path = require('path');

// 認証関連 ミドルウェア
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const passport = require('./auth');
const session = require('express-session');
const flash = require('connect-flash');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('./models').User;
const { send } = require('process');
const app = express();

// use 認証関連 ミドルウェア
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

/* ---------------------------
  ▽ Router ミドルウェア ▽
--------------------------- */

/* 「次回から省略」済みユーザーへの処理 */
const autoAuthMW = (req, res, next) => {
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
      next();
    });
  } else {
    next();
  }
};

/* 認証必須ページの処理 */
const authMustMW = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.cookie('authRedirectPATH', req.originalUrl);
    return res.render('auth/login', {
      errorMessage: undefined
    });
  }
}

/* login・registerアクセス時、認証済みならTOP redirect */
const authJudgeMW = (req, res, next) => {
  if (req.isAuthenticated()) {
    res.redirect(302, '/');
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
            res.redirect(302, '/');
          });
        }
      }
      next();
    });
  } else {
    next();
  }
};

/* ---------------------------
  ▽ Router ▽
--------------------------- */
const indexRouter = require('./routes/index');
const postsRouter = require('./routes/posts');
const likesRouter = require('./routes/likes');
const createRouter = require('./routes/create');
const dashboardRouter = require('./routes/dashboard');
app.use('/', autoAuthMW, indexRouter);
app.use('/posts', autoAuthMW, postsRouter);
app.use('/likes', autoAuthMW, authMustMW, likesRouter);
app.use('/create', autoAuthMW, authMustMW, createRouter);
app.use('/dashboard', autoAuthMW, authMustMW, dashboardRouter);

/* ---------------------------
  ▽ ejs setup ▽
--------------------------- */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));


/* ------------------------------------------------
/*
/*  ▽ 認証関連 処理 ▽
/*
/* ------------------------------------------------ */

// 暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';

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

/* ---------------------------
  ▽ アカウント作成 ▽
--------------------------- */

// 作成ページ
app.get('/register', authJudgeMW, (req, res) => {
  return res.render('auth/register', {
    errors: undefined
  });
});

// 作成実行
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
  // ユーザーデータを登録
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
  ▽ ログイン認証 ▽
--------------------------- */

// 認証ページ
app.get('/login', authJudgeMW, (req, res) => {
  const errorMessage = req.flash('error').join('<br>');
  res.render('auth/login', {
    errorMessage: errorMessage
  });
});

// 認証実行
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
    if (req.cookies.authRedirectPATH) {
      res.redirect(req.cookies.authRedirectPATH);
    } else {
      res.redirect('/dashboard');
    }
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
