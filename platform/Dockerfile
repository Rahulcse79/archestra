ARG NODE_IMAGE=node:24-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114

FROM ${NODE_IMAGE} AS base

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN corepack prepare pnpm@10.33.0 --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files for all workspaces
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY shared/package.json shared/
COPY patches/ patches/

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# <----- Builder stage ----->
FROM base AS builder
WORKDIR /app

# Version arg for Sentry release tracking
ARG VERSION=dev

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules

# Copy source files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared

# Build all workspace
ENV NEXT_TELEMETRY_DISABLED=1

# VERSION is exported as env var for child processes (used by Sentry source map upload)
ENV VERSION=${VERSION}

# Use Docker secrets to securely pass various sensitive environment variables during build
# These environment variables are NOT persisted in the final image
#
# TURBO_TEAM and TURBO_TOKEN are used for Turbo remote caching
# https://turborepo.com/docs/guides/tools/docker#example
#
# SENTRY_AUTH_TOKEN is used by backend/frontend builds to upload source maps
# SENTRY_URL points to the EU region where the archestra org is hosted
#
# https://docs.docker.com/build/building/secrets/#using-build-secrets
# https://docs.docker.com/build/building/secrets/#target
RUN --mount=type=secret,id=turbo_team,env=TURBO_TEAM \
    --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    SENTRY_URL=https://de.sentry.io/ \
    pnpm build

# <----- Final unified stage ----->
FROM base AS unified
WORKDIR /app

ARG VERSION=dev

ENV NODE_ENV=production
# disable telemetry for next.js
ENV NEXT_TELEMETRY_DISABLED=1

ENV ARCHESTRA_VERSION=${VERSION}
ENV ARCHESTRA_INTERNAL_API_BASE_URL="http://localhost:9000"
ENV ARCHESTRA_API_BASE_URL=""
ENV ARCHESTRA_ANALYTICS="enabled"
ENV ARCHESTRA_ENTERPRISE_LICENSE_ACTIVATED="false"
ENV ARCHESTRA_ENTERPRISE_LICENSE_FULL_WHITE_LABELING="false"
ENV ARCHESTRA_SENTRY_FRONTEND_DSN=""
ENV ARCHESTRA_SENTRY_ENVIRONMENT=""

# Cloud database CA bundle for SSL certificate validation
# This allows sslmode=require to work with AWS RDS and Google Cloud SQL
ENV NODE_EXTRA_CA_CERTS="/etc/ssl/certs/cloud-database-ca-bundle.pem"

# Vendor cloud database CA bundles into the repository so image builds do not
# depend on live network fetches for trust roots.
COPY docker/certs/aws-rds-global-bundle.pem /tmp/aws-rds-ca.pem
COPY docker/certs/gcloud-sql-global.pem /tmp/gcloud-sql-ca.pem

RUN apk --no-cache upgrade && \
    # Install PostgreSQL 17, pgvector, and supervisord
    apk add --no-cache postgresql17=17.9-r0 postgresql17-contrib=17.9-r0 postgresql-pgvector su-exec && \
    # Combine all CA bundles
    cat /tmp/aws-rds-ca.pem /tmp/gcloud-sql-ca.pem > /etc/ssl/certs/cloud-database-ca-bundle.pem && \
    rm -f /tmp/aws-rds-ca.pem /tmp/gcloud-sql-ca.pem && \
    # Remove NPM-related files and directories (as we do not use npm and it just brings extra dependencies/vulnerabilities)
    # See https://github.com/grafana/grafana-image-renderer/pull/625
    rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/bin/npm && \
    rm -rf /usr/local/bin/npx && \
    rm -rf /root/.npm && \
    rm -rf /root/.node-gyp && \
    mkdir -p /var/log/supervisor && \
    # Clean up
    rm -rf /tmp/*

RUN apk add --no-cache supervisor && \
    # CVE-2026-24049: wheel path traversal — not needed at runtime, remove entirely
    pip uninstall -y wheel 2>/dev/null; rm -rf /usr/lib/python*/ensurepip

# Create postgres directories (user already exists from postgresql package)
RUN mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# Mark PostgreSQL data directory as a volume for data persistence
VOLUME /var/lib/postgresql/data /app/data

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY patches/ patches/
COPY docker/scripts/docker-banner.sh /app/docker-banner.sh
COPY docker/scripts/docker-entrypoint.sh /docker-entrypoint.sh
COPY docker/supervisord/supervisord.conf /etc/supervisord.conf
COPY docker/supervisord/postgres.conf /etc/supervisord.postgres.conf

# Install production dependencies for both workspaces
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter=@backend --filter=@frontend

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/scripts ./backend/scripts
COPY --from=builder /app/backend/drizzle.config.ts ./backend/
COPY --from=builder /app/backend/src/database/migrations ./backend/src/database/migrations
RUN chmod +x /app/backend/scripts/start-production.sh

# Copy built frontend
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/.next/standalone ./

# Copy previous version's static assets first (from CI build context)
# Content-hashed filenames ensure no conflicts between versions
COPY prev-static-assets/ ./frontend/.next/static/

# Copy current build's assets on top
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static

# Keep a clean copy of ONLY this build's assets (not accumulated)
# CI will extract from this path for the NEXT deployment
COPY --from=builder /app/frontend/.next/static /static-assets-source/

RUN chmod +x /docker-entrypoint.sh
RUN chmod +x /app/docker-banner.sh

# Expose ports
EXPOSE 5432 9000 9050 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
