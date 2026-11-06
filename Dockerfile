FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
WORKDIR /app
ENV NODE_ENV=production PORT=3000 COOKIE_SECURE=true DB_PATH=/app/.data/site.sqlite MEDIA_DIR=/app/.data/media
COPY --chown=node:node package.json package-lock.json server.js cms.js blocks.js seo.js ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/.data/media && chown -R node:node /app/.data
USER node
EXPOSE 3000
VOLUME ["/app/.data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "--use-env-proxy", "--disable-warning=ExperimentalWarning", "server.js"]
