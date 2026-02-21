import express from "express";
import { v4 as uuidV4 } from "uuid";
import { pool } from "../db.mjs";
import multer from "multer";
import { sendMessageToQueue } from "../aws/sendMessage.mjs";
import { uploadToS3 } from "../aws/uploadToS3.mjs";

const router = express.Router();
const upload = multer({ 
    storage: multer.memoryStorage()
});

router.post("/upload", upload.single("resume"), async(req, res) => {
    let client;
    try {
        validationCheck(req, res);
        const resumeId = uuidV4();
        const jobDescriptionId = uuidV4();
        const jobProcessingId = uuidV4();

        const s3Key = await uploadToS3(req.file);

        //Use transaction and Uplaod data in resume, job description table and job processing table
        client = await pool.connect();
        await client.query("BEGIN");
        await addResumeDetails(resumeId, req.file.originalname, s3Key, req.file.mimetype, client);
        await addJobDescriptionDetails(jobDescriptionId, req.body.jobDescription, client);
        await addJobDescriptionProcessingDetails(jobProcessingId, jobDescriptionId, resumeId, client);
        await client.query("COMMIT");

        await sendMessageToQueue({
            jobId: jobProcessingId
        });

        res.status(200).json( { jobId: jobProcessingId, status: "pending" });
    } catch(error) {
        console.error("Error for upload api: ", error);
        if(client) await client.query("ROLLBACK");
        res.status(error.statusCode || 500).json({
            error: error.message
        });
    } finally {
        if(client) client.release();
    }
});

const addResumeDetails = async(resumeId, filename, filepath, mimeType, client) => {
    const query = "INSERT into resumes (id, filename, filepath, mime_type) VALUES ($1, $2, $3, $4)";
    await client.query(query, [ resumeId, filename, filepath, mimeType ]);
};

const addJobDescriptionDetails = async(jobDescriptionId, context, client) => {
    const query = "INSERT into job_descriptions (id, context) VALUES ($1, $2)";
    await client.query(query, [ jobDescriptionId, context ]);
};

const addJobDescriptionProcessingDetails = async(jobProcessingId, jobDescriptionId, resumeId, client) => {
    const query = "INSERT into processing_jobs (id, job_description_id, resume_id, status) VALUES ($1, $2, $3, $4)";
    await client.query(query, [ jobProcessingId, jobDescriptionId, resumeId, "pending" ]);
};

const validationCheck = (req, res) => {
    const reqBody = req.body;
    const file = req.file;
    const jd = reqBody.jobDescription?.trim();

    if(!reqBody || !req.file || !jd) {
        throw new ApiError("Missing resume or job description", 400);
    }

    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        throw new ApiError("Only PDF and DOCX files are allowed", 400);
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new ApiError("File size must be less than 5MB", 400);
    }

    // validate job description format
    if (jd.length < 20) {
        throw new ApiError("Job description too short", 400);
    }

    if (jd.length > 10000) {
        throw new ApiError("Job description too long", 400);
    }
};

class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default router;