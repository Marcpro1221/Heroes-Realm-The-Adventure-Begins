import liveServer from 'live-server';

/**
 * Starts a simple static server for the Phaser project.
 */
liveServer.start({
  port: 8080,
  host: '0.0.0.0',
  root: '.',
  open: '/index.html',
  wait: 200,
  logLevel: 1,
});
