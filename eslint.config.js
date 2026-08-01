const js = require("@eslint/js");
const globals = require("globals");
const jest = require("eslint-plugin-jest");

module.exports = [
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["**/*.test.js", "**/*.spec.js"],
    plugins: { jest },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },

  {
    files: ["**/*.js"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
