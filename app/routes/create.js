const express = require('express');
const router = express.Router();

const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const Post = require('./../models').Post;
const Category = require('./../models').Category;

const destDir = 'public/uploads/';
const storage = multer.diskStorage({
    destination: destDir,
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({
    storage: storage
});

/* --------------------------------------
    ▽ Q & A 記事作成 ▽
-------------------------------------- */

/* GET 作成ページ */
router.get('/post', async (req, res, next) => {
    Category.findAll({
        order: [['id', 'DESC']]
    }).then(categories => {
        res.render('create/post', {
            user: req.user,
            categories
        });
    });
});

/* POST 作成処理 */
router.post('/post', upload.single('image'), async (req, res, next) => {

    /* ▽ 画像ネーミング用　日付取得処理 ▽  */
    var nowDate = new Date();
    var Now = String(nowDate.getFullYear()) + String(nowDate.getMonth() + 1) + String(nowDate.getDate()) + String(nowDate.getHours()) + String(nowDate.getMinutes()) + String(nowDate.getSeconds());

    /* ▽ 画像圧縮 処理 ▽  */
    let image;
    if (req.file) {
        sharp(destDir + req.file.originalname)
            .resize(340)
            .toFormat("jpg")
            .jpeg({ quality: 30 })
            .toFile(destDir + Now + req.file.originalname, () => {
                fs.unlinkSync(destDir + req.file.originalname); // 元の画像を削除
            });
        image = Now + req.file.originalname;
    } else { image = ''; }

    /* ▽ 記事クリエイト 処理 ▽  */
    Post.create({
        image: image,
        title: req.body.title,
        content: req.body.content,
        user_id: req.user.id,
        category_id: req.body.category_id,
    }
    ).then(result => {
        res.redirect(302, '/posts/');
    });
});

module.exports = router;
