'use strict';

require('dotenv').config();
const kafka = require('kafka-node');
const differenceInMilliseconds = require('date-fns/difference_in_milliseconds');

const { offsetOutOfRangeCb, sleep } = require('../utils');
const addMemberToKlaviyo = require('./klaviyo');

const Consumer = kafka.Consumer;
const Client = kafka.KafkaClient;
const client = new Client(process.env.KAFKA_SERVER_URL);

const topics = [{topic: 'providers-retry-60min', partition: 0}];
const consumer = new Consumer(client, topics);

consumer.on('error', function (err) {
  console.log('provider-retry-60min-consumer >> error', err);
});

consumer.on('offsetOutOfRange', offsetOutOfRangeCb(client));

// Retry after one hour
consumer.on('message', async function (record) {
  let message = JSON.parse(record.value);
  const diffTime = differenceInMilliseconds(Date.now(), message.timestamp);

  if (diffTime < 60000) await sleep(60000 - diffTime);

  addMemberToKlaviyo(process.env.KLAVIYO_URL, 'providers-failed', message);
});

