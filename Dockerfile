FROM node:24.22.1-alpine AS build

WORKDIR /app
RUN chown -R node:node /app

USER node
COPY --chown=node . /app

RUN npm ci

RUN npm run build

FROM node:24.22.1-alpine

WORKDIR /app
RUN chown -R node:node /app

COPY --from=build --chown=node /app/*.json /app/
COPY --from=build --chown=node /app/dist /app/dist
COPY --from=build --chown=node /app/node_modules /app/node_modules
COPY --from=build --chown=node /app/src/config /app/src/config
COPY --from=build --chown=node /app/src/abis /app/src/abis
COPY --from=build --chown=node /app/src/snapshots /app/src/snapshots

USER node

EXPOSE 3005
CMD ["node", "dist/main.js"]
