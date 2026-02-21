# Scalable Asynchronous Resume Processing Platform

## 📌 Overview

This project is a backend system that processes resumes against job descriptions using an asynchronous, distributed architecture.
The system is designed to simulate real-world production patterns such as:

    * Asynchronous job processing
    * Worker isolation
    * Retry and failure handling
    * Idempotent processing
    * Database-backed queue mechanisms

The focus of this project is **backend architecture and distributed systems concepts**, not just feature implementation.

------------------------------------------------------------------------------------------------------------------------------

## 🎯 Goals

The main goals of this project are:

    1. Accept resume uploads and job descriptions via API
    2. Store files and metadata safely
    3. Process jobs asynchronously using workers
    4. Handle retries and failures reliably
    5. Prevent duplicate processing using idempotency
    6. Simulate real-world distributed system behavior before integrating message brokers (SQS)

------------------------------------------------------------------------------------------------------------------------------

## 🏗 System Architecture (Local Version)

Client
    → API Server (Node.js)
    → PostgreSQL (job metadata + state)
    → Worker Process (polling + processing)
    → Result Storage

The database temporarily acts as a **job queue** using row-level locking.

------------------------------------------------------------------------------------------------------------------------------

## 🧱 Core Components

### 1. API Layer

Responsibilities:

    * Validate request
    * Upload files
    * Store metadata
    * Create processing job
    * Return job status

Technology:

    * Node.js
    * Express
    * Multer
    * PostgreSQL

------------------------------------------------------------------------------------------------------------------------------

### 2. Database

Main tables:

    * `resumes`
    * `job_descriptions`
    * `processing_jobs`
    * `match_results`

The `processing_jobs` table acts as a queue.

------------------------------------------------------------------------------------------------------------------------------

### 3. Worker Service

A separate process that:

    * Polls database for pending jobs
    * Locks rows safely
    * Processes jobs
    * Stores results
    * Handles retries and failures

Workers can scale horizontally.

------------------------------------------------------------------------------------------------------------------------------

## ⚙️ Job Lifecycle

```
pending → processing → completed
                    ↘
                     failed
```

States:

    * <<pending>> → waiting to be processed
    * <<processing>> → picked by worker
    * <<completed>> → success
    * <<failed>> → exceeded retry limit

------------------------------------------------------------------------------------------------------------------------------

## 🔒 Concurrency Control

The system uses:

```sql
FOR UPDATE SKIP LOCKED
```

This ensures:

    * Only one worker processes a job
    * Multiple workers can run safely
    * No duplicate processing occurs

This simulates distributed worker isolation.

------------------------------------------------------------------------------------------------------------------------------

## 🔁 Retry & Failure Handling

Features implemented:

    * Retry counter
    * Maximum retry limit
    * Error message tracking
    * Automatic retry for transient failures
    * Failure state after max retries

This mirrors real queue systems like Dead Letter Queues (DLQ).

------------------------------------------------------------------------------------------------------------------------------

## 🧠 Idempotency

Because distributed systems often provide **at-least-once delivery**, jobs may execute multiple times.

To prevent duplicate side effects:

    * Unique constraint on `match_results.job_id`
    * Status checks before processing
    * Safe insert handling

This guarantees:

> Repeated execution produces the same final state.

------------------------------------------------------------------------------------------------------------------------------

## 🧪 Failure Simulation

Random failures are intentionally introduced to test:

    * Retry logic
    * Worker resilience
    * State recovery

Testing failure paths is critical in distributed systems.

------------------------------------------------------------------------------------------------------------------------------

## 🚀 Distributed System Concepts Implemented

This project demonstrates:

    * Asynchronous processing
    * Worker isolation
    * Database-backed queue
    * Row-level locking
    * Retry policies
    * Failure recovery
    * Poison job handling
    * Idempotent consumers
    * Transaction safety
    * At-least-once processing semantics

------------------------------------------------------------------------------------------------------------------------------

## 🔮 Future Enhancements

Planned improvements:

    * AWS SQS integration
    * S3 file storage
    * Embedding generation
    * Vector search
    * Horizontal worker scaling
    * Observability (metrics & logs)
    * Processing timeout recovery
    * Dead letter queue

------------------------------------------------------------------------------------------------------------------------------

## 🧠 Key Learnings

Important backend principles applied:

    1. Exactly-once execution is not realistic in distributed systems.
    2. Idempotency is required for safe retries.
    3. Asynchronous processing improves scalability and reliability.
    4. Database locks can simulate queue behavior.
    5. Workers should be stateless and isolated.
    6. Failure handling is as important as success handling.

------------------------------------------------------------------------------------------------------------------------------

## 📈 Why This Project Matters

This project reflects real backend challenges seen in systems such as:
    * Payment processing
    * Event-driven platforms
    * Job orchestration systems
    * Document processing pipelines

It focuses on **architecture maturity**, not just features.

------------------------------------------------------------------------------------------------------------------------------

## 🛠 Tech Stack
    * Node.js
    * Express
    * PostgreSQL
    * Multer
    * UUID
    * Local worker processes

Future:
    * AWS SQS
    * AWS S3
    * pgvector / embeddings

------------------------------------------------------------------------------------------------------------------------------

## 👨‍💻 Author

Mukund Agarwal
Backend Engineer — Distributed Systems & AWS

------------------------------------------------------------------------------------------------------------------------------