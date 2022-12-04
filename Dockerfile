FROM --platform=$BUILDPLATFORM node:lts as builder

WORKDIR /app
RUN npm i -g pnpm
COPY . .
RUN pnpm i
RUN pnpm build
RUN pnpm prune --prod && pnpm store prune

FROM node:alpine as runner

WORKDIR /app
COPY --from=builder /app .

ENTRYPOINT ["node", "dist/index.js"]
