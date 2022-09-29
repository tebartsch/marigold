const { createProxyMiddleware } = require('http-proxy-middleware');

const develop_backed = 'http://localhost:8080'

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: develop_backed,
      changeOrigin: true,
      ws: true,
    })
  );
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: develop_backed,
      changeOrigin: true,
      // The following option is necessary in order for the backend to answer websocket requests
      headers: {
        origin: develop_backed,
      },
    })
  );
};