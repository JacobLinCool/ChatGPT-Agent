FROM --platform=$BUILDPLATFORM node:lts as builder

WORKDIR /app
RUN npm i -g pnpm
COPY . .
RUN pnpm i
RUN pnpm build
RUN rm -rf node_modules
RUN pnpm i --prod && pnpm store prune

FROM node:alpine as runner

WORKDIR /app
COPY --from=builder /app .

ENTRYPOINT ["node", "packages/discord-bot/dist/index.js"]
