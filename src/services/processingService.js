const pool = require("../db/connection");
const { v4: uuidv4 } = require("uuid");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_RETRIES = parseInt(process.env.OPENAI_MAX_RETRIES, 10) || 3;
const BACKOFF_FACTOR = parseInt(process.env.OPENAI_BACKOFF_FACTOR, 10) || 1000; // 1 second

/**
 * Delay function using a Promise
 * @param {number} ms - Milliseconds to wait
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate embedding using OpenAI
 * @param {string} text - Text to embed
 * @param {number} retries - Current retry attempt
 * @returns {Promise<Array<number>>}
 */
const generateEmbedding = async (text, retries = MAX_RETRIES) => {
    try {
        const response = await openai.embeddings.create({
            model: process.env.OPENAI_MODEL,
            input: text,
        });

        console.log(`Embedding generated for text: "${text}"`);
        return response.data[0].embedding;

    } catch (err) {
        console.error(`Error generating embedding (Attempt ${MAX_RETRIES - retries + 1}):`, err.message);

        if (retries > 0) {
            const waitTime = BACKOFF_FACTOR * (MAX_RETRIES - retries + 1);
            console.warn(`Retrying in ${waitTime / 1000} seconds...`);
            await delay(waitTime);
            return generateEmbedding(text, retries - 1);
        }

        console.error("Max retries reached. Embedding generation failed.");
        throw new Error("Embedding generation failed after multiple attempts.");
    }
};

/**
 * Process document and insert embedding with error handling
 * @param {Object} params - Document details
 * @param {string} params.documentId - Document UUID
 * @param {string} params.content - Document content
 */
const processDocument = async ({ documentId, content }) => {
    const id = uuidv4();

    try {
        console.log(`Processing document: ${documentId}`);

        const embedding = await generateEmbedding(content);

        const query = `
            INSERT INTO embeddings (id, document_id, embedding)
            VALUES ($1, $2, $3)
            `;

        await pool.query(query, [id, documentId, JSON.stringify(embedding)]);
        console.log(`Embedding stored for document: ${documentId}`);

    } catch (err) {
        console.error(`Error processing document ${documentId}:`, err.message);
    }
};

module.exports = { processDocument };
