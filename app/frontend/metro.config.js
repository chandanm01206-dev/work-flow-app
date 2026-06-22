// @ts-check
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Expo SDK 50+ automatically reads tsconfig.json `paths` + `baseUrl`
 * when using getDefaultConfig — no manual alias needed.
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
