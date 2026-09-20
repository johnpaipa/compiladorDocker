# runner de TypeScript (node + tsc)
FROM node:22-slim
WORKDIR /opt/ts
RUN npm init -y >/dev/null && npm install --no-audit --no-fund typescript@5 @types/node@22
ENV PATH="/opt/ts/node_modules/.bin:${PATH}"
