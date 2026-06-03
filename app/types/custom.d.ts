declare module 'express';
declare module 'http-errors';
declare module 'morgan';
declare module 'cookie-parser';
declare module 'connect-flash';
declare module 'express-session';
declare module 'express-validator';
declare module 'bcryptjs';
declare module 'passport';
declare module 'passport-local';
declare module 'multer';
declare module 'sharp';
declare module 'debug';
declare module 'sequelize';
declare module 'mysql2';
declare module 'nodemailer';

declare namespace Express {
  interface Request {
    user?: any;
    flash(type: string): string[];
    isAuthenticated(): boolean;
    login(user: any, done: (error?: unknown) => void): void;
    logout(callback?: (error?: unknown) => void): void;
    file?: any;
  }
}
