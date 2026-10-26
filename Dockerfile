# 陈俊烨 Chen Junye — academic homepage on nginx, ready for Zeabur (Dockerfile auto-detected)
FROM nginx:1.27-alpine

# Listen on the port Zeabur injects (falls back to 8080 locally).
# Only the PORT variable is substituted into the template, so nginx's own
# runtime variables ($uri, $host, …) are left untouched.
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER=PORT

# The official nginx image runs envsubst over *.template at startup and
# writes the result into /etc/nginx/conf.d/.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY public/ /usr/share/nginx/html/

EXPOSE 8080
