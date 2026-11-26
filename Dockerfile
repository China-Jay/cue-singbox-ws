FROM node:24-alpine
RUN npm install -g npm@latest
RUN wget -qO /tmp/sb.tar.gz https://github.com/SagerNet/sing-box/releases/download/v1.14.4/sing-box-1.14.4-linux-amd64.tar.gz \
  && tar -xzf /tmp/sb.tar.gz -C /tmp \
  && mv /tmp/sing-box-1.14.4-linux-amd64/sing-box /usr/local/bin/sing-box \
  && chmod 755 /usr/local/bin/sing-box \
  && rm -rf /tmp/sb.tar.gz /tmp/sing-box-1.14.4-linux-amd64
WORKDIR /app
COPY package.json server.js ./
EXPOSE 8080
CMD ["node", "server.js"]
