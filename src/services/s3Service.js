const { s3 } = require("../config/aws");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const pdfParse = require("pdf-parse");

/**
 * Download PDF file from S3 and extract text
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} Extracted text from PDF
 */
const downloadAndExtractText = async (s3Key) => {
  const params = {
    Bucket: process.env.RAW_DATA_BUCKET,
    Key: s3Key,
  };

  try {
    const data = await s3.send(new GetObjectCommand(params));
    const stream = data.Body;

    // Buffer the stream data
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract text from PDF buffer
    const pdfData = await pdfParse(buffer);
    return pdfData.text;

  } catch (err) {
    console.error("Error downloading or parsing PDF from S3:", err.message);
    throw err;
  }
};

module.exports = { downloadAndExtractText };
