FROM node:16

WORKDIR /app

COPY . .

EXPOSE 4464

CMD [ "node", "--enable-source-maps", "index.js", "--logLevel=4", "--dbLogLevel=3" ]
