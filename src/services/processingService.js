const pool = require("../config/connection");
const { OpenAI } = require("openai");

class DocumentProcessingService {
  constructor(apiKey, model, maxRetries = 3, backoffFactor = 1000) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.maxRetries = maxRetries;
    this.backoffFactor = backoffFactor;
  }

  /**
   * Delay function using a Promise
   * @param {number} ms - Milliseconds to wait
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate embedding using OpenAI with retries and backoff
   * @param {string} content - Content to embed
   * @param {number} retries - Remaining retries
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async generateEmbedding(content, retries = this.maxRetries) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: content,
      });
      
      console.log(`Embedding generated successfully.`);
      return response.data[0].embedding;
    } catch (err) {
      console.error(`Error generating embedding (Attempt ${this.maxRetries - retries + 1}): ${err.message}`);

      if (retries > 0) {
        const waitTime = this.backoffFactor * (this.maxRetries - retries + 1);
        console.warn(`Retrying in ${waitTime / 1000} seconds...`);
        await this.delay(waitTime);
        return this.generateEmbedding(content, retries - 1);
      }

      console.error("Max retries reached. Embedding generation failed.");
      throw new Error("Embedding generation failed after multiple attempts.");
    }
  }

  /**
   * Process document and insert embedding within a transaction
   * @param {Object} params - Document details
   * @param {string} params.documentId - Document UUID
   * @param {string} params.content - Document content
   * @throws Will throw an error if processing fails
   */
  async processDocument({ documentId, content }) {
    const client = await pool.connect();

    try {
      console.log(`Processing document: ${documentId}`);
      await client.query('BEGIN');

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      const insertQuery = `
        INSERT INTO embeddings (id, embedding)
        VALUES ($1, $2)
      `;
      await client.query(insertQuery, [documentId, JSON.stringify(embedding)]);

      console.log(`Embedding stored for document: ${documentId}`);

      // Update the 'processed' column to true in the 'documents' table
      const updateQuery = `
        UPDATE documents
        SET processed = true
        WHERE id = $1
      `;
      await client.query(updateQuery, [documentId]);

      console.log(`Document ${documentId} marked as processed.`);

      await client.query('COMMIT');
    } catch (err) {
      console.error(`Error processing document ${documentId}: ${err.message}`);
      await client.query('ROLLBACK');
      throw new Error(`Processing failed for document ${documentId}: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = DocumentProcessingService;
