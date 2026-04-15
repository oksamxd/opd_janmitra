module.exports = {
  apps: [
    {
      name: "jana-ai-janmitra",
      cwd: "/var/www/jana-ai-janmitra",
      script: "node_modules/.bin/nest",
      args: "start --watch",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
