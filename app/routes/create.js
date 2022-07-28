const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');

const Post = require('./../models').Post;
const User = require('./../models').User;
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
    if (req.file) {
        res.json(req.file);
        sharp(req.file.originalname)
            .resize(64)
            .toFile(destDir + 'resized' + req.file.originalname, (err, info) => {
                if (err) {
                    throw err;
                }
                console.log(info);
            });
        console.log("file: ", req.file);
        res.send(req.body);
    } else throw 'error';
    res.send(req.body);
    // Post.create({
    //     title: req.body.title,
    //     content: req.body.content,
    //     user_id: req.user.id,
    //     category_id: req.body.category_id,
    // }
    // ).then(result => {
    //     res.redirect(302, `/posts/detail/${result.id}`);
    // });
});

module.exports = router;
