const pool = require("../config/connection");
const { OpenAI } = require("openai");
const { encode, decode } = require('gpt-3-encoder');

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
   * Splits a long text into overlapping chunks based on token count.
   * @param {string} text - Full document text.
   * @param {number} chunkSize - Target number of tokens per chunk (e.g., 500).
   * @param {number} overlap - Number of overlapping tokens between chunks (e.g., 50).
   * @returns {string[]} - Array of text chunks.
   */
  chunkText(text, chunkSize = 200, overlap = 30) {
    const tokens = encode(text);
    const chunks = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = decode(chunkTokens);
      chunks.push(chunkText);

      // Move start forward with overlap
      start += chunkSize - overlap;
    }

    return chunks;
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

      const chunks = this.chunkText(content, 200, 30);
      let embedding;
      for (let i=0; i<chunks.length; i++) {
        embedding = await this.generateEmbedding(chunks[i]);

        const insertQuery = `
          INSERT INTO embeddings (document_id, chunk_index, content, embedding)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertQuery, [documentId, i, chunks[i], JSON.stringify(embedding)]);  
      }
      
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
