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

# Rewrite ?v= on styles.css / main.js to a content hash, so a CSS or JS change
# reaches visitors even if the version in index.html was not bumped by hand.
RUN cd /usr/share/nginx/html \
 && css=$(md5sum styles.css | cut -c1-8) \
 && js=$(md5sum main.js | cut -c1-8) \
 && sed -i -e "s/styles\.css?v=[0-9A-Za-z]*/styles.css?v=$css/g" \
           -e "s/main\.js?v=[0-9A-Za-z]*/main.js?v=$js/g" index.html 404.html

EXPOSE 8080
