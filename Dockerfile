FROM node

RUN git clone https://github.com/inrupt/solid-client-authn-js -b feat/oidc-rp-logout

WORKDIR /solid-client-authn-js
RUN npm ci
RUN npx playwright install --with-deps
RUN npm ci
