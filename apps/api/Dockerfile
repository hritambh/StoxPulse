FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/
RUN npm ci --workspace=apps/api --include-workspace-root

WORKDIR /app/apps/api
RUN npx prisma generate
COPY apps/api/ ./
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
