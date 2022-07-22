var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var crypto = require('crypto');
var logger = require('morgan');

var passport = require('./auth');
var session = require('express-session');
var flash = require('connect-flash');

// Router
var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

// formでPOSTデータを取得する場合、以下のコード必要
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


const authMiddleware = (req, res, next) => {
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
            // セキュリティ的はここで remember_me を再度更新すべき
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

app.use(cookieParser());
// 暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/user', userRouter);

// ログインフォーム
app.get('/login', (req, res) => {
  const errorMessage = req.flash('error').join('<br>');
  res.render('login/form', {
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
    res.redirect('/user');
  }
);

// ログアウトのページ
app.get('/logout', (req, res) => {
  req.session.passport.user = undefined;
  res.redirect('/')
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
