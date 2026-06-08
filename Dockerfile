FROM node:22-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

COPY client/package*.json ./client/
RUN cd client && npm install --force

COPY client/ ./client/
RUN cd client && npm run build

RUN mkdir -p server/public && cp -r client/dist/* server/public/

EXPOSE 5000

WORKDIR /app/server

CMD ["node", "index.js"]