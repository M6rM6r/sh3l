# Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY lumosity-app/package*.json ./
RUN npm ci
COPY lumosity-app/ ./
RUN npm run build

# Backend
FROM python:3.11-slim AS backend
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# PHP
FROM php:8.2-apache AS php-api
COPY backend/ /var/www/html/
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Final stage
FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80