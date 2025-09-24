# Build Node.js
FROM node:24-alpine:3.21 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Container final com Node.js + Nginx como proxy reverso
FROM nginx:1.29.1-alpine

# Criação do usuário e grupo
RUN addgroup -S node_group && adduser -S node_user -G node_group

# Copia do nginx.conf configurado como proxy reverso
COPY nginx.conf /etc/nginx/nginx.conf

# Copia do app Node.js
COPY --from=build /app /app

# Instalação Node.js dentro do container Nginx
RUN apk add --no-cache nodejs npm

WORKDIR /app
RUN mkdir -p /app/tmp && chown -R node_user:node_group /app/tmp

# Expondo a porta do Nginx
EXPOSE 80

# Trocando para o usuário não root
USER node_user

# Executando o Node.js + Nginx
CMD sh -c "node app.js & nginx -g 'daemon off;'"
