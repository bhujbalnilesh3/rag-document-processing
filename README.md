# Vector Embedding Generation Service (Document processing)

This project provides a service for generating vector embeddings using OpenAI's `text-embedding-3-small` model. The system processes messages from an SQS queue, retrieves pdf only documents from S3, generates vector embeddings, and handles failed messages by moving them to a Dead Letter Queue (DLQ).

## 🛠️ Project Structure

```
.env.example      - Sample environment variable file
Dockerfile        - Docker setup for the service
src/worker.js     - Main worker script
src/config/aws.js - AWS SDK configuration
src/config/connection.js - Connection setup for external services
src/services/processingService.js - OpenAI embedding generation logic
src/services/s3Service.js - S3 integration for document retrieval
src/services/sqsService.js - SQS integration for queue processing
```

## 🚀 Prerequisites

* Node.js v18 or higher
* Docker (optional for containerized deployment)
* AWS Account with S3, SQS, and appropriate IAM roles
* OpenAI API Key

## 🔧 Environment Variables

Create a `.env` file based on the provided `.env.example`:

```
AWS_REGION=<your-aws-region>
AWS_ACCOUNT_ID=<your-aws-account-id>
DOC_PROCESSING_QUEUE_URL=<your-sqs-queue-url>
DOC_PROCESSING_DLQUEUE_URL=<your-dlq-url>
RAW_DATA_BUCKET=<your-s3-bucket>
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=text-embedding-3-small
OPENAI_MAX_RETRIES=3
OPENAI_BACKOFF_FACTOR=2
POLL_INTERVAL=5000
MAX_MESSAGE_POLL= 10
```

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-folder>
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Update the .env file with your configuration
```

## ✅  Create the database
CREATE DATABASE documentdb;

USE documentdb;

CREATE TABLE rag-users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- Hashed Password
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,              -- order of chunk in doc
    content TEXT NOT NULL,                     -- raw chunk text
    embedding VECTOR(1536),                    -- vector from OpenAI embedding
    created_at TIMESTAMP DEFAULT NOW()
);

## 🐳 Docker Deployment

To build and run the service using Docker:

```bash
docker build -t vector-embedding-service .
docker run --env-file .env vector-embedding-service
```

## ✅ Usage

To run the worker locally:

```bash
node src/worker.js
```

The worker will poll the SQS queue at the specified interval, process each message, and move failed messages to the DLQ.

## 📦 SQS and DLQ Handling

* The service polls the `DOC_PROCESSING_QUEUE_URL` for messages.
* If processing fails, the message is moved to the `DOC_PROCESSING_DLQUEUE_URL`.

## 📚 Dependencies

* `aws-sdk`: AWS S3 and SQS integration
* `dotenv`: Environment variable management
* `openai`: OpenAI embedding generation

## 🔍 Logs and Monitoring

* All logs are output to the console.
* Consider integrating with CloudWatch or another logging service for production deployment.

## 📝 License

This project is licensed under the MIT License.
