FROM node:24.22.1-alpine as build
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

ENV PYTHONUNBUFFERED=1
RUN apk update && apk add --update --no-cache alpine-sdk libusb-dev musl-dev linux-headers eudev-libs eudev-dev python3 py3-pip py3-setuptools && ln -sf python3 /usr/bin/python

RUN npm ci

COPY . ./
RUN npm run build

FROM node:24.22.1-alpine
WORKDIR /app
COPY --from=build /app /app

EXPOSE 3005
CMD [ "npm", "run", "start:testnet" ]
