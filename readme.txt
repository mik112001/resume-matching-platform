# 🚀 Distributed Resume Matching Platform

A cloud-deployed asynchronous resume analysis system that processes resumes, generates AI embeddings, and computes semantic match scores against job descriptions.

Built with distributed systems principles including message queues, idempotent workers, retry handling, and vector search.

---

## 🧠 Features

- Resume upload (PDF / DOCX)
- Asynchronous job processing with AWS SQS
- Worker-based architecture
- Idempotent processing & retry recovery
- Resume parsing pipeline
- OpenAI embedding generation
- Semantic similarity scoring
- PostgreSQL + pgvector vector storage
- Dockerized deployment
- AWS EC2 production deployment

---

## 🏗 Architecture

Client → API → SQS → Worker → PostgreSQL / S3 / OpenAI

---

## ⚙️ Tech Stack

**Backend**
- Node.js
- Express

**Infrastructure**
- Docker
- AWS EC2
- AWS SQS
- AWS S3

**Database**
- PostgreSQL
- pgvector

**AI**
- OpenAI Embeddings
- Cosine Similarity Matching

---

## 🔄 System Design Highlights

- Distributed async processing
- Row-level locking & idempotency
- Dead-letter queue handling
- Exponential retry backoff
- Worker crash recovery
- Stuck job detection
- Stateless API architecture

---

## 🚀 Deployment

Services are containerized using Docker and deployed on AWS EC2.

---

## 📌 Future Improvements

- Kubernetes deployment
- Streaming processing
- Multi-worker auto scaling
- Real-time progress tracking
- Advanced AI feedback generation

---

## 👨‍💻 Author

Mukund Agarwal