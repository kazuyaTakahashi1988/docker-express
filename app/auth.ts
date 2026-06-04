import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import db from "./models";

const User = db.User;

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    (email, password, done) => {
      User.findOne({ where: { email: email } })
        .then((user) => {
          if (user && bcrypt.compareSync(password, user.password)) {
            return done(null, user); // ログイン成功
          }
          throw new Error();
        })
        .catch(() => {
          // エラー処理
          return done(null, false, { message: "認証情報と一致するレコードがありません。" });
        });
    },
  ),
);

// Session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

export = passport;
