FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ARG VITE_PUBLIC_BASE=/admin/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_BASE=$VITE_PUBLIC_BASE
RUN npm run build
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
