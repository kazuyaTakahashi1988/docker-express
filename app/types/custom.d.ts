declare module "express";
declare module "http-errors";
declare module "morgan";
declare module "cookie-parser";
declare module "connect-flash";
declare module "express-session";
declare module "express-validator";
declare module "bcryptjs";
declare module "passport";
declare module "passport-local";
declare module "multer";
declare module "sharp";
declare module "debug";
declare module "sequelize";
declare module "mysql2";
declare module "nodemailer";

declare namespace Express {
  interface AuthenticatedUser {
    id: number | string;
    name?: unknown;
    email?: unknown;
    password?: string;
    image?: unknown;
    rememberToken?: string;
    save?: () => unknown;
    [key: string]: unknown;
  }

  interface UploadedFile {
    originalname: string;
    [key: string]: unknown;
  }

  interface Request {
    user?: AuthenticatedUser;
    flash(type: string): string[];
    isAuthenticated(): boolean;
    login(user: AuthenticatedUser, done: (error?: unknown) => void): void;
    logout(callback?: (error?: unknown) => void): void;
    file?: UploadedFile;
  }
}
