FROM node:16

WORKDIR /app

COPY . .

EXPOSE 9080

CMD [ "node", "--enable-source-maps", "index.js" ]
