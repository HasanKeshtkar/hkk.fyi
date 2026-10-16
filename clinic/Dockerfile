# The clinic app as one container: a single Node process serving the API, the live channel and
# the built web app. Liara builds it from this file on `liara deploy` (see README).
ARG NODE_IMAGE=node:22-alpine

# 1. Build the web app (out/) and the server bundle (dist/).
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# 2. Only the packages the server needs at runtime.
FROM ${NODE_IMAGE} AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# 3. The image that runs.
FROM ${NODE_IMAGE}
# pg_dump / pg_restore / psql for backups (version 18 handles every older server too);
# su-exec to run the app as an unprivileged user; bash for `liara app shell` (its default shell).
RUN apk add --no-cache postgresql18-client su-exec bash
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    WEB_ROOT=/app/out \
    MIGRATIONS_DIR=/app/drizzle
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/out ./out
COPY drizzle ./drizzle
COPY package.json docker-entrypoint.sh ./
EXPOSE 3000
# Through sh: works even if the upload lost the file's executable bit.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.mjs"]
