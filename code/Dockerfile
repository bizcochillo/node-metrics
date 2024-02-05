FROM node:16.14.0-alpine3.15 AS BUILD_IMAGE

RUN yarn global add typescript node-gyp 

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools
RUN apk add make && apk add g++

WORKDIR /app

RUN mkdir /data

COPY package.json yarn.lock ./

# install dependencies
RUN yarn --frozen-lockfile
# RUN npm ci

COPY . .

# lint & test
# RUN yarn lint & yarn test

# build application
# RUN yarn build

RUN npm prune --production

FROM node:16.14.0-alpine3.15

WORKDIR /app

# copy from build image
COPY --from=BUILD_IMAGE /app/ .
#COPY --from=BUILD_IMAGE /app/node_modules ./node_modules

EXPOSE 8080

CMD [ "node", "./app.js" ]
