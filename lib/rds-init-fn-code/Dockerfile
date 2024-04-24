FROM amazon/aws-lambda-nodejs:20 as builder
WORKDIR /usr/app
COPY package.json package-lock.json index.ts tsconfig.json ./
RUN npm install
RUN npm run build

FROM amazon/aws-lambda-nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}
COPY script.sql ./
COPY --from=builder /usr/app/build/*.js ./
COPY --from=builder /usr/app/node_modules ./node_modules
CMD [ "index.handler" ]