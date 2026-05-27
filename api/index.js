// api/index.js
// Vercel serverless function entry point for NestJS API
// Boots the compiled NestJS app on first request and reuses it.

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module'); // compiled output
let cachedHandler = null;

module.exports = async (req, res) => {
  if (!cachedHandler) {
    const app = await NestFactory.create(AppModule);
    await app.init(); // init modules, routes, etc.
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  cachedHandler(req, res);
};
