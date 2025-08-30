// Metro config for React Native: stub Node modules and exclude ws internals
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const emptyModule = path.resolve(__dirname, 'polyfills/empty.js');

// Disable source map symbolication to prevent the 'unknown' file errors
config.symbolicator = {
  customizeFrame: () => null
};

config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
  extraNodeModules: {
    ...(config.resolver.extraNodeModules || {}),
    // Stub ws package and its internals
    ws: emptyModule,
    'ws/lib/websocket.js': emptyModule,
    'ws/lib/websocket-server.js': emptyModule,
    'ws/lib/permessage-deflate.js': emptyModule,
    'ws/lib/sender.js': emptyModule,
    'ws/lib/receiver.js': emptyModule,
    // Polyfill Node standard modules
    stream: require.resolve('stream-browserify'),
    'node:stream': require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    'node:crypto': require.resolve('crypto-browserify'),
    http: require.resolve('stream-http'),
    'node:http': require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    'node:https': require.resolve('https-browserify'),
    events: require.resolve('events'),
    'node:events': require.resolve('events'),
    // Stub modules with empty stub
    net: emptyModule,
    'node:net': emptyModule,
    tls: emptyModule,
    'node:tls': emptyModule,
    fs: emptyModule,
    'node:fs': emptyModule,
    url: emptyModule,
    'node:url': emptyModule,
    zlib: emptyModule,
    'node:zlib': emptyModule,
  },
};

module.exports = config;
