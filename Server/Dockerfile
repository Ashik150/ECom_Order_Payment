FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci \
  --fetch-retries=5 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=120000

COPY . .
RUN DATABASE_URL=postgresql://docker:docker@db:5432/raco_commerce npm run prisma:generate
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:deploy && npm start"]
