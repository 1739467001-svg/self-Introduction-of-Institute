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

# Visitor stats: log directory + /stats/ password file from STATS_PASSWORD,
# prepared at container start (see the script). Mount a volume at
# /var/lib/cjy-stats to keep the log across redeploys.
COPY docker/40-cjy-stats.sh /docker-entrypoint.d/40-cjy-stats.sh
RUN chmod +x /docker-entrypoint.d/40-cjy-stats.sh

# Rewrite ?v= on styles.css / main.js / play.js to a content hash, so a CSS or JS
# change reaches visitors even if the version in index.html was not bumped by hand.
RUN cd /usr/share/nginx/html \
 && for f in styles.css main.js play.js; do \
      h=$(md5sum "$f" | cut -c1-8); \
      sed -i "s/${f%.*}\.${f##*.}?v=[0-9A-Za-z]*/$f?v=$h/g" index.html 404.html; \
    done

EXPOSE 8080
