const { sqs } = require("../config/aws");
const { ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

const queueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.DOC_PROCESSING_QUEUE_URL}`;

/**
 * Poll SQS for messages
 */
const pollQueue = async () => {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 10,
  };

  try {
    const data = await sqs.send(new ReceiveMessageCommand(params));
    return data.Messages || [];
  } catch (err) {
    console.error("Error polling SQS:", err.message);
    return [];
  }
};

/**
 * Delete a processed message
 */
const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  };

  try {
    await sqs.send(new DeleteMessageCommand(params));
    console.log("Message deleted:", receiptHandle);
  } catch (err) {
    console.error("Error deleting SQS message:", err.message);
  }
};

module.exports = { pollQueue, deleteMessage };
