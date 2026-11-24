# Standalone Production Dockerfile (for dist/ / public repo)
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

RUN mkdir -p /app/data /app/auth_info && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV DASHBOARD_HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "index.js"]
