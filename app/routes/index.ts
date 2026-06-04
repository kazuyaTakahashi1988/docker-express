import express from "express";
import db from "./../models";

const router = express.Router();
const Post = db.Post;

const perPage = 6; // 表示ページ数

/* GET home page. */
router.get("/", async (req, res) => {
  Post.findAll({ order: [["id", "DESC"]], limit: perPage }).then((posts) => {
    res.render("index", { user: req.user, posts });
  });
});

export = router;
