FROM nginx:1.27-alpine

COPY cloudrun-nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js vral-v.png /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
