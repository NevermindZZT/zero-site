FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent || true
COPY . .
RUN npm run build

FROM node:18-alpine as runtime
WORKDIR /app
# copy built frontend and server code
COPY --from=build /app/dist ./dist
COPY public ./public
COPY server ./server
WORKDIR /app/server
RUN npm ci --production --silent
ENV PORT=8080
EXPOSE 8080
CMD ["node","index.js"]
