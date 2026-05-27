#!/usr/bin/env bash
set -euo pipefail

# Install dependencies
npm ci

# Build NestJS project (produces dist/ folder)
npm run build

# Generate Prisma client (required at runtime)
npx prisma generate
