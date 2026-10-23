FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json .npmrc* ./
RUN npm install --omit=dev && npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/tsconfig.json ./

EXPOSE 8080

CMD ["tsx", "server.ts"]
