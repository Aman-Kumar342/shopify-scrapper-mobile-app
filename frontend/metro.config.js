const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Metro trying to create shims for Node.js built-in modules
// that don't exist in the React Native environment
const originalGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = ({ platform, ...rest }) => {
  const polyfills = originalGetPolyfills ? originalGetPolyfills({ platform, ...rest }) : [];
  return polyfills;
};

// Disable custom externals that cause issues with newer Node.js
config.server = {
  ...config.server,
  rewriteRequestUrl: (url) => url,
};

module.exports = config;
