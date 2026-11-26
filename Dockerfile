FROM node:24-alpine
RUN npm install -g npm@latest
WORKDIR /app
COPY package.json server.js ./
EXPOSE 8080
CMD ["node", "server.js"]
