FROM node:22-alpine

WORKDIR /app

COPY server.mjs /app/server.mjs

ARG APP_ROLE=api
ARG APP_VERSION=kind-test
ARG PORT=8080

ENV APP_ROLE=${APP_ROLE}
ENV APP_VERSION=${APP_VERSION}
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["node", "/app/server.mjs"]
