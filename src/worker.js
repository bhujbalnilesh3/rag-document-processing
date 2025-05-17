require("dotenv").config();

const S3Service = require("./services/s3Service");
const SQSService = require("./services/sqsService");
const DocumentProcessingService = require("./services/processingService");

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 5000;

// Instantiate services
const s3Service = new S3Service(process.env.RAW_DATA_BUCKET);
const sqsService = new SQSService(
  process.env.AWS_REGION,
  process.env.AWS_ACCOUNT_ID,
  process.env.DOC_PROCESSING_QUEUE_URL
);

const processingService = new DocumentProcessingService(
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_MODEL,
  parseInt(process.env.OPENAI_MAX_RETRIES, 10),
  parseInt(process.env.OPENAI_BACKOFF_FACTOR, 10)
);

const dlqService = new SQSService(
  process.env.AWS_REGION,
  process.env.AWS_ACCOUNT_ID,
  process.env.DOC_PROCESSING_DLQUEUE_URL // full URL from env
);

/**
 * Process messages from SQS
 */
const processMessages = async () => {
  console.log("Polling SQS...");

  try {
    const messages = await sqsService.pollQueue(1);

    for (const message of messages) {
      const { documentId, s3Key } = JSON.parse(message.Body);
      const receiptHandle = message.ReceiptHandle;

      try {
        console.log(`Processing document: ${documentId}`);

        // Download and extract text from S3
        const content = await s3Service.downloadAndExtractText(s3Key);

        // Process the document (embedding generation and storage)
        await processingService.processDocument({ documentId, content });

        // Only delete the message if processing was successful
        console.log(`Processing completed for document: ${documentId}. Deleting SQS message.`);
        await sqsService.deleteMessage(receiptHandle);

      } catch (err) {
        console.error(`Error processing document ${documentId}:`, err.message);
        await dlqService.sendMessage(message.Body);  
        // we can avoid pushing msg to dlq using code using redrive feature for dlq

        // Delete from main queue to avoid retry
        await sqsService.deleteMessage(receiptHandle);

        console.warn(`Message ${receiptHandle} will not be deleted and will be retried.`);
        // The message will become visible in the queue again after the visibility timeout expires
      }
    }

  } catch (err) {
    console.error("Error polling SQS:", err.message);
  }
};

// Poll the queue periodically
setInterval(processMessages, POLL_INTERVAL);
