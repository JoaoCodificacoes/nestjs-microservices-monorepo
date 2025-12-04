
FROM node:20-alpine AS development


WORKDIR /usr/src/app


COPY package*.json ./


RUN npm install


COPY . .


CMD ["npm", "run", "start:dev", "gateway"]


FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./


COPY --from=development /usr/src/app/node_modules ./node_modules

COPY . .


RUN npm run build gateway


FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./


RUN npm install --only=production


COPY --from=build /usr/src/app/dist ./dist


CMD ["node", "dist/apps/gateway/main"]