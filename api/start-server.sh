#!/bin/bash
export PATH="/home/pixel/.nvm/versions/node/v22.18.0/bin:$PATH"
cd /home/pixel/lnpixels/api
exec /home/pixel/lnpixels/api/node_modules/.bin/tsx src/server.ts
