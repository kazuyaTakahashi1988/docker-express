import express from "express";
import db from "./../models";

const router = express.Router();

import multer from "multer";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { check, validationResult } from "express-validator";
import { createUploadMiddleware, saveImageBuffer } from "../utils/imageStorage";

const User = db.User;

/* --------------------------------------
    ▽ 画像UPロード ▽
-------------------------------------- */

const upload = createUploadMiddleware(multer);

/* --------------------------------------
    ▽ バリデーション・ルール ▽
-------------------------------------- */

const profileValidRules = [
  check("name").not().isEmpty().withMessage("名前の項目は必須入力です。"),
  check("email")
    .not()
    .isEmpty()
    .withMessage("メールアドレスの項目は必須入力です。")
    .isEmail()
    .withMessage("有効なメールアドレス形式で指定してください。"),
]; // profile

const passwordValidRules = [
  check("currentpassword")
    .not()
    .isEmpty()
    .withMessage("現在のパスワードの項目は必須入力です。")
    .custom((value, { req }) => {
      if (!bcrypt.compareSync(req.body.currentpassword, req.user.password)) {
        throw new Error("現在のパスワードが一致しません。");
      }
      return true;
    }),
  check("password")
    .not()
    .isEmpty()
    .withMessage("新しいパスワードの項目は必須入力です。")
    .isLength({ min: 8, max: 25 })
    .withMessage("パスワードは8文字から25文字にしてください。")
    .custom((value, { req }) => {
      if (req.body.password !== req.body.passwordConfirmation) {
        throw new Error("新しいパスワード（確認）と一致しません。");
      }
      return true;
    }),
]; // password

/* --------------------------------------
    ▽ ダッシュボード ▽
-------------------------------------- */

/* GET /dashboard/ page. */
router.get("/", async (req, res) => {
  res.render("dashboard", { user: req.user, errors: "" });
});

/* post プロフィール更新 */
router.post("/profile", upload.single("image"), profileValidRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // バリデーション失敗
    return res.render("dashboard", { user: req.user, errors: errors.array() });
  }

  /* ▽ 保存画像ネーミング ▽  */
  const now = new Date();
  let saveImageName = `UserImage-${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${Math.random().toString(36).slice(-10)}.jpg`;

  /* ▽ 画像圧縮処理 ▽  */
  if (req.file) {
    const imageBuffer = await sharp(req.file.buffer)
      .resize(80)
      .toFormat("jpg")
      .jpeg({ quality: 20 }) // 圧縮率 0〜100
      .toBuffer();
    await saveImageBuffer(saveImageName, imageBuffer);
  } else {
    saveImageName = "";
  }

  User.findOne({ where: { id: req.user.id } }).then((result) => {
    result.name = req.body.name;
    req.user.name = result.name;
    result.email = req.body.email;
    req.user.email = result.email;
    if (saveImageName) {
      result.image = saveImageName;
      req.user.image = result.image;
    }
    result.save();
    return res.redirect(302, "/dashboard");
  });
});

/* post パスワード更新 */
router.post("/password", passwordValidRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // バリデーション失敗
    return res.render("dashboard", { user: req.user, errors: errors.array() });
  }

  User.findOne({ where: { id: req.user.id } }).then((result) => {
    if (result && bcrypt.compareSync(req.body.currentpassword, result.password)) {
      result.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8));
      req.user.password = result.password;
      result.save();
      return res.redirect(302, "/dashboard");
    }
    return res.redirect(302, "/dashboard");
  });
});

/* post アカウントを削除 */
router.post("/deleat", async (req, res) => {
  const userId = req.user.id;
  req.session.passport.user = undefined;
  res.clearCookie("remember_me");
  User.findOne({ where: { id: userId } }).then((user) => {
    user.destroy();
    return res.redirect(302, "/");
  });
});

export = router;
