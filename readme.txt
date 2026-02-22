# 🚀 Distributed Resume Matching Platform

A cloud-deployed asynchronous resume analysis system that processes resumes, generates AI embeddings, and computes semantic match scores against job descriptions.

This project demonstrates distributed systems architecture, fault-tolerant worker design, and vector search using modern backend and AI infrastructure.

---

## 🧠 Features

- Resume upload (PDF / DOCX)
- Asynchronous job processing using AWS SQS
- Worker-based distributed architecture
- Idempotent processing & retry handling
- Resume parsing pipeline
- OpenAI embedding generation
- Semantic similarity scoring
- PostgreSQL + pgvector vector storage
- Dockerized deployment
- AWS EC2 production hosting
- Result retrieval API

---

## 🏗 Architecture

Client → API → SQS → Worker → PostgreSQL / S3 / OpenAI

flowchart LR

Client[Client / Postman]
API[API Server\nNode.js + Express\nDocker on EC2]
SQS[AWS SQS Queue]
Worker[Worker Service\nNode.js Docker]
S3[AWS S3\nResume Storage]
DB[(PostgreSQL + pgvector)]
OpenAI[OpenAI Embeddings API]

Client -->|Upload Resume| API
API -->|Store Metadata| DB
API -->|Upload File| S3
API -->|Send Job| SQS

SQS --> Worker
Worker -->|Download Resume| S3
Worker -->|Parse Text| Worker
Worker -->|Generate Embeddings| OpenAI
Worker -->|Store Vectors| DB
Worker -->|Save Results| DB

Client -->|Fetch Result| API
API --> DB

---

## ⚙️ Tech Stack

### Backend
- Node.js
- Express.js

### Infrastructure
- Docker
- AWS EC2
- AWS SQS
- AWS S3

### Database
- PostgreSQL
- pgvector

### AI
- OpenAI Embeddings
- Cosine Similarity Matching

---

## 🔄 System Design Highlights

- Distributed async processing
- Idempotent workers
- Retry & dead-letter queue handling
- Worker crash recovery
- Stuck job detection
- Stateless API architecture
- Vector similarity search
- Fault-tolerant pipeline

---

## 🚀 API Endpoints

### Upload Resume

POST `/upload`

Form-data:

- resume: file
- jobDescription: text

Response:

    {
        "jobId": "...",
        "status": "pending"
    }


---

### Get Job Result

GET `/job/:id`

Response:

    {
        "status": "completed",
        "score": 87.3
    }

---

## 🚀 Deployment

Services are containerized using Docker and deployed on AWS EC2 with PostgreSQL and pgvector installed on the host machine.

---

## 📌 Future Improvements

- Kubernetes deployment
- Auto-scaling workers
- Real-time progress tracking
- Advanced AI feedback generation
- Authentication & multi-user support

---

## 👨‍💻 Author

Mukund Agarwal
:::

---