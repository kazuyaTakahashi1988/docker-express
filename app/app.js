var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var path = require('path');

var cookieParser = require('cookie-parser');
var crypto = require('crypto');
var passport = require('./auth');
var session = require('express-session');
var flash = require('connect-flash');

var { check, validationResult } = require('express-validator');
var nodemailer = require('nodemailer');
var bcrypt = require('bcryptjs');
var User = require('./models').User;

// Router
var indexRouter = require('./routes/index');
var dashboardRouter = require('./routes/dashboard');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

// 認証関連
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

// Router 指定
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/dashboard', dashboardRouter);

/* ------------------------------------------------
  認証関連
------------------------------------------------ */

app.use(cookieParser());
// 暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';

/* ---------------------------
  アカウント作成 
--------------------------- */

// 認証判定
const authJudge = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.redirect(302, '/');
  }
};

// バリデーション・ルール
const registrationValidationRules = [
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

// アカウント作成ページ
app.get('/register', authJudge, (req, res) => {
  return res.render('auth/register', {
    errors: undefined
  });
});
app.post('/register', registrationValidationRules, (req, res) => {
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
  res.redirect('/')
});


/* ------------------------------------------------
  catch 404 and forward to error handler
------------------------------------------------ */
app.use(function (req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
