require("dotenv").config();
const { pollQueue, deleteMessage } = require("./services/sqsService");
const { downloadAndExtractText } = require("./services/s3Service");
const { processDocument } = require("./services/processingService");

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 5000;

const processMessages = async () => {
  console.log("Polling SQS...");

  const messages = await pollQueue();

  for (const message of messages) {
    const { documentId, s3Key } = JSON.parse(message.Body);
    const receiptHandle = message.ReceiptHandle;

    try {
      console.log(`Processing document: ${documentId}`);
      const content = await downloadAndExtractText(s3Key);

      // Process document and store embedding
      await processDocument({ documentId, content });

      // Delete SQS message
      await deleteMessage(receiptHandle);
    } catch (err) {
      console.error(`Error processing document ${documentId}:`, err.message);
    }
  }
};

// setInterval(processMessages, POLL_INTERVAL);
processMessages()