const { s3 } = require("../config/aws");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const pdfParse = require("pdf-parse");

class S3Service {
  constructor(bucketName) {
    this.bucketName = bucketName;
  }

  /**
   * Download file from S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<Buffer>} File buffer
   */
  async downloadFile(s3Key) {
    const params = {
      Bucket: this.bucketName,
      Key: s3Key,
    };

    try {
      const data = await s3.send(new GetObjectCommand(params));
      console.log(`File downloaded from S3: ${s3Key}`);
      return this.streamToBuffer(data.Body);
    } catch (err) {
      console.error(`Error downloading ${s3Key} from S3: ${err.message}`);
      throw new Error(`Error downloading file: ${s3Key}`);
    }
  }

  /**
   * Extract text from PDF
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(buffer) {
    try {
      const pdfData = await pdfParse(buffer);
      console.log("Text extracted from PDF");
      return pdfData.text;
    } catch (err) {
      console.error("Error extracting text from PDF:", err.message);
      throw new Error("Error extracting text from PDF");
    }
  }

  /**
   * Download file and extract text from PDF
   * @param {string} s3Key - S3 object key
   * @returns {Promise<string>} Extracted text
   */
  async downloadAndExtractText(s3Key) {
    try {
      const buffer = await this.downloadFile(s3Key);
      const text = await this.extractTextFromPDF(buffer);
      return text;
    } catch (err) {
      console.error(`Error processing ${s3Key}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Convert S3 stream to buffer
   * @param {ReadableStream} stream - S3 object stream
   * @returns {Promise<Buffer>} Buffered data
   */
  async streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}

module.exports = S3Service;
