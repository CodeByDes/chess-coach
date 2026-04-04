const jestPlugin = require("eslint-plugin-jest");

module.exports = [
  {
    ignores: ["node_modules/", "coverage/", "dist/"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        SpeechSynthesisUtterance: "readonly",
        fetch: "readonly",
        DOMParser: "readonly",
        // Chess module globals
        WHITE: "readonly",
        BLACK: "readonly",
        PAWN: "readonly",
        ROOK: "readonly",
        KNIGHT: "readonly",
        BISHOP: "readonly",
        QUEEN: "readonly",
        KING: "readonly",
        PIECE_VALUES: "readonly",
        // App classes (loaded via script tags in browser)
        ChessBoard: "readonly",
        ChessEngine: "readonly",
        ChessAI: "readonly",
        ChessCoach: "readonly",
        ChessPuzzleSystem: "readonly",
        ChessUI: "readonly",
        ChessApp: "readonly",
        ChessProgress: "readonly",
      },
    },
    plugins: { jest: jestPlugin },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["__tests__/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...jestPlugin.environments.globals.globals,
        WHITE: "readonly",
        BLACK: "readonly",
      },
    },
  },
];
