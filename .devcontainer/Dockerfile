FROM mcr.microsoft.com/devcontainers/typescript-node:18

RUN su node -c "npm install -g pnpm tsx taze"
RUN su node -c "pnpm config set store-dir /workspace/node_modules/.pnpm-store"
