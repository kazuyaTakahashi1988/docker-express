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
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
    ],
  },
  ignorePatterns: ["dist/", "node_modules/", "public/"],
  overrides: [
    {
      files: ["*.js", "*.cjs", "migrations/**/*.js", "seeders/**/*.js"],
      parserOptions: { project: null },
      rules: { "@typescript-eslint/no-require-imports": "off" },
    },
    { files: ["*.ts", "**/*.ts"], rules: { "no-undef": "off" } },
  ],
};
