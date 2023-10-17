FROM node:slim
COPY . .
RUN npm install
CMD [ "node", "server.js" ]