FROM node:25.8.1-alpine3.23 AS build
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm install && npm run build

FROM nginx:1.29.6-alpine3.23
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
