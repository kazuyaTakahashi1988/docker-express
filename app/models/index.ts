"use strict";

import * as fs from "fs";
import { createRequire } from "module";
import * as path from "path";
import Sequelize from "sequelize";
import configSet from "../config/config";

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = configSet[env];
const requireModel = createRequire(__filename);
type LoadedModel = {
  name: string;
  associate?: (models: Record<string, LoadedModel>) => void;
  findAll: (...args: unknown[]) => Promise<ModelRecord[]>;
  findOne: (...args: unknown[]) => Promise<ModelRecord>;
  findAndCountAll: (...args: unknown[]) => Promise<{ rows: ModelRecord[]; count: number }>;
  create: (...args: unknown[]) => Promise<ModelRecord>;
  findOrCreate: (...args: unknown[]) => Promise<[ModelRecord, boolean]>;
  [key: string]: unknown;
};
type ModelRecord = {
  id: string | number;
  name?: unknown;
  email?: unknown;
  password?: string;
  image?: unknown;
  rememberToken?: string;
  category_name?: unknown;
  post_id?: string | number;
  Post?: ModelRecord;
  save: () => Promise<unknown> | unknown;
  destroy: () => Promise<unknown> | unknown;
  [key: string]: unknown;
};
const db: Record<string, LoadedModel> = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs.readdirSync(__dirname)
  .filter((file: string) => {
    return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
  })
  .forEach((file: string) => {
    const model = requireModel(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName: string) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
