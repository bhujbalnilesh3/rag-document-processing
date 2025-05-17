require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { SQSClient } = require("@aws-sdk/client-sqs");

const region = process.env.AWS_REGION;

const s3 = new S3Client({ region });
const sqs = new SQSClient({ region });

module.exports = { s3, sqs };
