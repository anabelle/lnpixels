module.exports = {
  apps: [
    {
      name: 'lnpixels-api',
      script: '/home/ubuntu/lnpixels/api/start-server.sh',
      cwd: '/home/ubuntu/lnpixels/api',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        NAKAPAY_API_KEY: process.env.NAKAPAY_API_KEY,
        NAKAPAY_WEBHOOK_SECRET: process.env.NAKAPAY_WEBHOOK_SECRET
      },
      watch: true,
      ignore_watch: ['node_modules', 'test', 'dist'],
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: '5s'
    },
    {
      name: 'lnpixels-web',
      script: './start-dev.sh',
      cwd: '/home/ubuntu/lnpixels/web',
      env: {
        NODE_ENV: 'development'
      },
      watch: true,
      ignore_watch: ['node_modules', 'test', 'dist'],
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: '5s'
    }
  ]
};