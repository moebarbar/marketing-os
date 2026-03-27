FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Copy manifests first (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/chiefmkt/package.json ./artifacts/chiefmkt/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/agents/package.json ./artifacts/agents/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend then API server
RUN pnpm --filter @workspace/chiefmkt build && \
    pnpm --filter @workspace/api-server build

EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.mjs"]
