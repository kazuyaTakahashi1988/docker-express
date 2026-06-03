const baseConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'express_db',
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  dialect: process.env.DB_DIALECT || 'mysql',
  timezone: process.env.TZ || 'Asia/Tokyo',
  logging: process.env.DB_LOGGING === 'true'
};

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    database: process.env.DB_TEST_NAME || `${baseConfig.database}_test`
  },
  production: baseConfig
};
