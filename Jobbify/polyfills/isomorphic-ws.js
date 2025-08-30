// Stub for isomorphic-ws in React Native: use the global WebSocket
const globalWebSocket = typeof WebSocket !== 'undefined' ? WebSocket : null;
module.exports = globalWebSocket;
