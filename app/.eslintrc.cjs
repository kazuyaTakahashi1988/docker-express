module.exports = {
  root: true,
  env: { es2022: true, node: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["dist/", "node_modules/", "public/"],
  overrides: [
    {
      files: ["*.js", "*.cjs", "migrations/**/*.js", "seeders/**/*.js"],
      parserOptions: { project: null },
    },
    { files: ["*.ts", "**/*.ts"], rules: { "no-undef": "off" } },
  ],
};
