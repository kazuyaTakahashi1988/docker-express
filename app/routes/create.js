const express = require('express');
const router = express.Router();

const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const User = require('./../models').User;
const Post = require('./../models').Post;
const Category = require('./../models').Category;
const Comment = require('./../models').Comment;
const Reply = require('./../models').Reply;
const Like = require('./../models').Like;

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
    }).then(result => {
        res.render('create/post', {
            user: req.user,
            categories: result
        });
    });

});

/* POST 作成処理 */
router.post('/post', upload.single('image'), async (req, res, next) => {

    /* ▽ 保存画像ネーミング ▽  */
    const now = new Date();
    let saveImageName =
        "PostImage-".concat(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), Math.random().toString(36).slice(-10), '.jpg');

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
    }).then(result => {
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
    }).then(result => {
        if (result) {
            res.render('create/comment', {
                user: req.user,
                post: result
            });
        } else {
            res.redirect(302, '/posts/');
        }
    });

});

/* POST 作成処理 */
router.post('/comment/:id', async (req, res, next) => {

    /* ▽ コメントクリエイト処理 ▽  */
    Comment.create({
        post_id: req.params["id"],
        comment: req.body.comment,
        user_id: req.user.id,
    }).then(result => {
        res.redirect(302, `/posts/detail/${result.post_id}`);
    });

});

/* --------------------------------------
    ▽ リプライ作成 ▽
-------------------------------------- */

/* GET 作成ページ */
router.get('/reply/:id', async (req, res, next) => {

    Comment.findOne({
        where: { id: req.params["id"] },
        include: [{ model: User }]
    }).then(result => {
        // res.send(result);
        if (result) {
            res.render('create/reply', {
                user: req.user,
                comment: result
            });
        } else {
            res.redirect(302, '/posts/');
        }
    });

});

/* POST 作成処理 */
router.post('/reply/:id', async (req, res, next) => {

    /* ▽ リプライクリエイト処理 ▽  */
    Reply.create({
        comment_id: req.params["id"],
        reply: req.body.reply,
        user_id: req.user.id,
    }).then(result => {
        res.redirect(302, `/posts/detail/${req.body.post_id}`);
    });

});

/* --------------------------------------
    ▽ お気に入り作成 ▽
-------------------------------------- */

/* POST お気に入り登録 処理 */
router.post('/like/:id', async (req, res, next) => {

    /* ▽ お気に入り登録処理 ▽  */
    Like.findOrCreate({
        where: {post_id: req.params["id"], user_id: req.user.id },
        defaults: {
            post_id: req.params["id"],
            user_id: req.user.id
        }
    }).then(created => {
        if (created) { // データが新規作成された場合
            Like.findAndCountAll({
                where: { post_id: req.params["id"] }
            }).then(result => {
                return res.json({ likeCount: result.count })
            });
        } else {
            return res.json({ likeCount: 'erroor01' })
        }
    });

});

/* POST お気に入り解除 処理 */
router.post('/unlike/:id', async (req, res, next) => {

    /* ▽ お気に入り解除処理 ▽  */
    Like.findOne({
        where: {
            post_id: req.params["id"],
            user_id: req.user.id
        },
    }).then( async ( resolt ) => {
        await resolt.destroy();
        Like.findAndCountAll({
            where: { post_id: req.params["id"] }
        }).then(result => {
            return res.json({ likeCount: result.count })
        });
    }).catch((err) => {
        res.status(404).json({ likeCount: 'erroor' });
    });


});

/* --------------------------------------
    ▽ CKEditor 画像アップロード処理 ▽
-------------------------------------- */

/* POST */
router.post('/CKEditorUpload', upload.single('upload'), async (req, res, next) => {

    /* ▽ 保存画像ネーミング ▽  */
    const now = new Date();
    let saveImageName =
        "CKEditorImage-".concat(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), Math.random().toString(36).slice(-10), '.jpg');

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
    const imagePath = `/uploads/${saveImageName}`;
    const sendText = `<script>window.parent.CKEDITOR.tools.callFunction(${CKEditorFuncNum}, '${imagePath}', 'アップロード成功')</script>`;

    /* ▽ HTMLを返す ▽ */
    res.header('Content-Type', 'text/html;charset=utf-8');
    res.send(sendText);

});

module.exports = router;
