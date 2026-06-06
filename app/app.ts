/* ------------------------------------------------
/*
/*  ▽ set up ▽
/*
/* ------------------------------------------------ */

import createError from "http-errors";
import express from "express";
import * as fs from "fs";
import logger from "morgan";
import * as path from "path";

// 認証関連 ミドルウェア
import cookieParser from "cookie-parser";
import * as crypto from "crypto";
import passport from "./auth";
import session from "express-session";
import flash from "connect-flash";
import { check, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import db from "./models";
import createRouter from "./routes/create";
import dashboardRouter from "./routes/dashboard";
import indexRouter from "./routes/index";
import likesRouter from "./routes/likes";
import postsRouter from "./routes/posts";
import {
  fetchStoredImage,
  getStoredImageUrl,
  shouldRedirectStoredImageRequests,
} from "./utils/imageStorage";

const User = db.User;
const app = express();
const isLiveReloadEnabled = process.env.LIVE_RELOAD === "true";
const sourceRoot = process.cwd();
const publicDir = isLiveReloadEnabled
  ? path.join(sourceRoot, "public")
  : path.join(__dirname, "public");
const viewsDir = isLiveReloadEnabled
  ? path.join(sourceRoot, "views")
  : path.join(__dirname, "views");
const liveReloadServerId = `${Date.now()}-${process.pid}`;

const decodeHtmlEntity = (entity: string) => {
  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
  };
  const normalizedEntity = entity.toLowerCase();

  if (
    normalizedEntity === "&nbsp;" ||
    normalizedEntity === "&#160;" ||
    normalizedEntity === "&#xa0;"
  ) {
    return " ";
  }

  return namedEntities[normalizedEntity] || "";
};

const toPlainText = (html: unknown, maxLength?: number) => {
  const text = String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:[a-zA-Z][a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, decodeHtmlEntity)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return typeof maxLength === "number" ? text.slice(0, maxLength) : text;
};

const formatDateTime = (value: unknown) => {
  const date = new Date(value as string | number | Date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`;
};

// use 認証関連 ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-local-env",
    resave: true,
    saveUninitialized: true,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use((req, res, next) => {
  res.locals.uploadUrl = getStoredImageUrl;
  res.locals.plainText = toPlainText;
  res.locals.formatDateTime = formatDateTime;
  res.locals.siteHost =
    process.env.SITE_HOST || "https://dockerexpress-720570741774.asia-northeast1.run.app";
  res.locals.defaultOgpImageUrl =
    process.env.DEFAULT_OGP_IMAGE_URL ||
    "https://storage.googleapis.com/project-fa900d56-8f52-4a54-867-dockerexpress-uploads/images/common/ogp.png";
  res.locals.buildPushCount = process.env.BUILD_PUSH_COUNT || "unknown";
  next();
});
app.use(express.static(publicDir));
app.get("/uploads/:fileName", async (req, res, next) => {
  try {
    if (shouldRedirectStoredImageRequests()) {
      return res.redirect(302, getStoredImageUrl(req.params.fileName));
    }

    const image = await fetchStoredImage(req.params.fileName);
    if (image === undefined) {
      return next();
    }
    if (image === null) {
      return next(createError(404));
    }
    res.type(image.contentType);
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(image.body);
  } catch (error) {
    return next(error);
  }
});
app.use(express.static(publicDir));

/* ---------------------------
  ▽ ejs setup ▽
--------------------------- */
app.set("views", viewsDir);
app.set("view engine", "ejs");
app.set("view cache", !isLiveReloadEnabled);
app.use(logger("dev"));

if (isLiveReloadEnabled) {
  type LiveReloadClient = { write(data: string): unknown };
  const liveReloadClients = new Set<LiveReloadClient>();
  let reloadTimer: NodeJS.Timeout | undefined;

  const sendReload = () => {
    for (const client of liveReloadClients) {
      client.write("event: reload\ndata: now\n\n");
    }
  };

  const scheduleReload = () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }
    reloadTimer = setTimeout(sendReload, 80);
  };

  app.get("/__live-reload/events", (req, res) => {
    res.set({
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${liveReloadServerId}\n\n`);
    liveReloadClients.add(res);
    req.on("close", () => liveReloadClients.delete(res));
  });

  app.get("/__live-reload/client.js", (req, res) => {
    res.type("application/javascript");
    res.send(`
      (() => {
        const serverIdKey = "__liveReloadServerId";
        const events = new EventSource("/__live-reload/events");
        events.addEventListener("connected", (event) => {
          const previousServerId = sessionStorage.getItem(serverIdKey);
          sessionStorage.setItem(serverIdKey, event.data);
          if (previousServerId && previousServerId !== event.data) {
            window.location.reload();
          }
        });
        events.addEventListener("reload", () => window.location.reload());
      })();
    `);
  });

  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function sendWithLiveReload(body) {
      const contentType = String(res.getHeader("Content-Type") || "");
      const looksLikeHtml =
        typeof body === "string" &&
        (contentType.includes("text/html") || /^\s*(<!doctype html|<html)/i.test(body));
      if (looksLikeHtml && body.includes("</body>")) {
        body = body.replace("</body>", '<script src="/__live-reload/client.js"></script></body>');
      }
      return originalSend.call(this, body);
    };
    next();
  });

  const watchedFiles = new Map<string, number>();
  const watchExtensions = new Set([".css", ".ejs", ".js"]);
  const ignoredDirs = new Set(["uploads"]);
  const watchRoots = [viewsDir, path.join(publicDir, "assets")];

  const scanFile = (filePath: string, seenFiles: Set<string>) => {
    if (!watchExtensions.has(path.extname(filePath))) {
      return false;
    }

    const modifiedAt = fs.statSync(filePath).mtimeMs;
    const previousModifiedAt = watchedFiles.get(filePath);
    watchedFiles.set(filePath, modifiedAt);
    seenFiles.add(filePath);

    return previousModifiedAt !== undefined && previousModifiedAt !== modifiedAt;
  };

  const scanDirectory = (directory: string, seenFiles: Set<string>) => {
    let hasChanges = false;

    if (!fs.existsSync(directory)) {
      return hasChanges;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          hasChanges = scanDirectory(entryPath, seenFiles) || hasChanges;
        }
      } else if (entry.isFile()) {
        hasChanges = scanFile(entryPath, seenFiles) || hasChanges;
      }
    }

    return hasChanges;
  };

  const scanLiveReloadFiles = () => {
    const seenFiles = new Set<string>();
    let hasChanges = false;

    for (const root of watchRoots) {
      hasChanges = scanDirectory(root, seenFiles) || hasChanges;
    }

    for (const filePath of watchedFiles.keys()) {
      if (!seenFiles.has(filePath)) {
        watchedFiles.delete(filePath);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      scheduleReload();
    }
  };

  scanLiveReloadFiles();
  setInterval(scanLiveReloadFiles, 250).unref();
}

/* ---------------------------
  ▽ Router ミドルウェア ▽
--------------------------- */

/* 「次回から省略」済みユーザーへの処理 */
const autoAuthMW = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else if (req.cookies.remember_me) {
    const [rememberToken, hash] = req.cookies.remember_me.split("|");
    User.findAll({ where: { rememberToken: rememberToken } }).then((users) => {
      for (const i in users) {
        const user = users[i];
        const verifyingHash = crypto
          .createHmac("sha256", APP_KEY)
          .update(user.id + "-" + rememberToken)
          .digest("hex");
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
const mustAuthMW = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.cookie("afterAuthPATH", req.originalUrl);
    return res.redirect(302, "/login");
  }
};

/* ---------------------------
  ▽ Router ▽
--------------------------- */
app.use("/", autoAuthMW, indexRouter);
app.use("/posts", autoAuthMW, postsRouter);
app.use("/likes", autoAuthMW, mustAuthMW, likesRouter);
app.use("/create", autoAuthMW, mustAuthMW, createRouter);
app.use("/dashboard", autoAuthMW, mustAuthMW, dashboardRouter);

/* ------------------------------------------------
/*
/*  ▽ 認証関連 処理 ▽
/*
/* ------------------------------------------------ */

// 暗号化につかうキー
const APP_KEY = process.env.APP_KEY || "change-me-in-local-env";

// バリデーション・ルール
const regiValidRules = [
  check("name").not().isEmpty().withMessage("名前は項目は必須入力です。"),
  check("email")
    .not()
    .isEmpty()
    .withMessage("メールアドレスは項目は必須入力です。")
    .isEmail()
    .withMessage("有効なメールアドレス形式で指定してください。"),
  check("password")
    .not()
    .isEmpty()
    .withMessage("パスワードはこの項目は必須入力です。")
    .isLength({ min: 8, max: 25 })
    .withMessage("パスワードは8文字から25文字にしてください。")
    .custom((value, { req }) => {
      if (req.body.password !== req.body.passwordConfirmation) {
        throw new Error("パスワード（確認）と一致しません。");
      }
      return true;
    }),
];

// 認証済みならTOPリダイレクト ミドルウェア
const judgeAuthMW = (req, res, next) => {
  if (req.isAuthenticated()) {
    res.redirect(302, "/");
  } else {
    next();
  }
};

/* ---------------------------
  ▽ アカウント作成 ▽
--------------------------- */

// 作成ページ
app.get("/register", judgeAuthMW, (req, res) => {
  return res.render("auth/register", { errors: undefined });
});

// 作成実行
app.post("/register", judgeAuthMW, regiValidRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // バリデーション失敗
    // return res.status(422).json({ errors: errors.array() });
    return res.render("auth/register", { errors: errors.array() });
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
      password: bcrypt.hashSync(password, bcrypt.genSaltSync(8)),
    },
  }).then(() => {
    res.redirect(307, "/login");
  });
});

/* ---------------------------
  ▽ ログイン認証 ▽
--------------------------- */

// 認証ページ
app.get("/login", judgeAuthMW, (req, res) => {
  const errorMessage = req.flash("error").join("<br>");
  res.render("auth/login", { errorMessage: errorMessage });
});

// 認証実行
app.post(
  "/login",
  judgeAuthMW,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    badRequestMessage: "「メールアドレス」と「パスワード」は必須入力です。",
  }),
  (req, res, next) => {
    if (!req.body.remember) {
      // 次回もログインを省略しない場合
      res.clearCookie("remember_me");
      return next();
    }
    const user = req.user;
    const rememberToken = crypto.randomBytes(20).toString("hex"); // ランダムな文字列
    const hash = crypto
      .createHmac("sha256", APP_KEY)
      .update(user.id + "-" + rememberToken)
      .digest("hex");
    user.rememberToken = rememberToken;
    user.save();
    res.cookie("remember_me", rememberToken + "|" + hash, {
      path: "/",
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000, // 5年
    });
    return next();
  },
  (req, res) => {
    if (req.cookies.afterAuthPATH) {
      const rePATH = req.cookies.afterAuthPATH.slice();
      res.clearCookie("afterAuthPATH");
      res.redirect(rePATH);
    } else {
      res.redirect("/dashboard");
    }
  },
);

// ログアウトページ
app.get("/logout", (req, res) => {
  req.session.passport.user = undefined;
  res.clearCookie("remember_me");
  res.redirect("/");
});

/* ------------------------------------------------
  ▽ catch 404 and forward to error handler ▽
------------------------------------------------ */
app.use((req, res, next) => {
  next(createError(404));
});
app.use((err, req, res, _next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

export = app;
