const { sqs } = require("../config/aws");
const { ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

class SQSService {
  constructor(region, accountId, queueName) {
    this.queueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
  }

  /**
   * Poll SQS for messages
   * @param {number} maxMessages - Maximum number of messages to retrieve
   * @returns {Promise<Array>} List of messages
   */
  async pollQueue(maxMessages = 1) {
    const params = {
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 10,
    };

    try {
      const data = await sqs.send(new ReceiveMessageCommand(params));
      console.log(`Polled ${data.Messages ? data.Messages.length : 0} messages from SQS.`);
      return data.Messages || [];
    } catch (err) {
      console.error(`Error polling SQS: ${err.message}`);
      return [];
    }
  }

  /**
   * Delete a processed message from SQS
   * @param {string} receiptHandle - Receipt handle of the message to delete
   */
  async deleteMessage(receiptHandle) {
    const params = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    };

    try {
      await sqs.send(new DeleteMessageCommand(params));
      console.log(`Message deleted: ${receiptHandle}`);
    } catch (err) {
      console.error(`Error deleting SQS message: ${err.message}`);
    }
  }

  /**
     * Send a message to the queue
     * @param {string} messageBody - The message body to send
     */
  async sendMessage(messageBody) {
    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
    };

    try {
      const data = await sqs.send(new SendMessageCommand(params));
      console.log(`Message sent with MessageId: ${data.MessageId}`);
    } catch (err) {
      console.error(`Error sending message: ${err.message}`);
    }
  }
}

module.exports = SQSService;
