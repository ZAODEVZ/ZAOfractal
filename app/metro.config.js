const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The time logic reuses the site's Fractal anchor rather than keeping a second copy.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../site/src/lib')];

module.exports = config;
