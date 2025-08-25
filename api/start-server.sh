#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.18.0/bin:$PATH"
cd /home/ubuntu/lnpixels/api
exec /home/ubuntu/lnpixels/api/node_modules/.bin/tsx src/server.ts
