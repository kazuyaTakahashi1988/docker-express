const express = require('express');
const router = express.Router();

const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const Post = require('./../models').Post;
const Comment = require('./../models').Comment;
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

    /* ▽ 保存画像ネーミング ▽  */
    const nowDate = new Date();
    let saveImageName = "PostImage-".concat(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), nowDate.getHours(), nowDate.getMinutes(), nowDate.getSeconds(), Math.random().toString(36).slice(-10), '.jpg');

    /* ▽ 画像圧縮処理 ▽  */
    if (req.file) {
        await sharp(destDir + req.file.originalname)
            .resize(340)
            .toFormat("jpg")
            .jpeg({ quality: 20 }) // 圧縮率 0〜100
            .toFile(destDir + saveImageName, () => {
                fs.unlinkSync(destDir + req.file.originalname); // 元の画像を削除
            });
    } else {
        saveImageName = '';
    }

    /* ▽ 記事クリエイト処理 ▽  */
    Post.create({
        image: saveImageName,
        title: req.body.title,
        content: req.body.content,
        user_id: req.user.id,
        category_id: req.body.category_id,
    }
    ).then(result => {
        res.redirect(302, `/posts/detail/${result.id}`);
    });
});

/* --------------------------------------
    ▽ コメント作成 ▽
-------------------------------------- */

/* GET 作成ページ */
router.get('/comment/:id', async (req, res, next) => {
    Post.findOne({
        where: { id: req.params["id"] }
    }
    ).then(post => {
        if (post) {
            res.render('create/comment', {
                user: req.user,
                post
            });
        } else {
            res.redirect(302, '/posts/');
        }
    });
});

/* POST 作成処理 */
router.post('/comment/', async (req, res, next) => {
    /* ▽ コメントクリエイト処理 ▽  */
    Comment.create({
        post_id: req.body.post_id,
        comment: req.body.comment,
        user_id: req.user.id,
    }
    ).then(result => {
        res.redirect(302,  `/posts/detail/${req.body.post_id}`);
    });
});


/* --------------------------------------
    ▽ CKEditor 画像アップロード処理 ▽
-------------------------------------- */

/* POST */
router.post('/CKEditorUpload', upload.single('upload'), async (req, res, next) => {

    /* ▽ 保存画像ネーミング ▽  */
    const nowDate = new Date();
    let saveImageName = "CKEditorImage-".concat(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), nowDate.getHours(), nowDate.getMinutes(), nowDate.getSeconds(), Math.random().toString(36).slice(-10), '.jpg');

    /* ▽ 画像圧縮処理 ▽  */
    if (req.file) {
        await sharp(destDir + req.file.originalname)
            .toFormat("jpg")
            .jpeg({ quality: 20 }) // 圧縮率 0〜100
            .toFile(destDir + saveImageName, () => {
                fs.unlinkSync(destDir + req.file.originalname); // 元の画像を削除
            });
    } else {
        saveImageName = '';
    }
    /* ▽ ckeditor.jsに返却するデータを生成する ▽ */
    const CKEditorFuncNum = req.query.CKEditorFuncNum;
    const imgaePath = `/uploads/${saveImageName}`;
    // $msg = 'アップロードが完了しました';
    const sendTxt = `<script>window.parent.CKEDITOR.tools.callFunction(${CKEditorFuncNum}, '${imgaePath}', 'アップロード成功')</script>`;

    /* ▽ HTMLを返す ▽ */
    res.header('Content-Type', 'text/html;charset=utf-8');
    res.send(sendTxt);
});

module.exports = router;
