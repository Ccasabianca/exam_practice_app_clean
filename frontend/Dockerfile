# syntax=docker/dockerfile:1

# étape 1 : build vite, l'url de l'api est fixée à la build (/api = même origine via nginx)
FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# étape 2 : nginx sert la spa et relaie /api vers le backend
FROM nginx:stable-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
