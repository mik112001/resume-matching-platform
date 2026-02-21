import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";

import { pool } from "./db.mjs";
import { v4 as uuidV4 } from "uuid";
import { sqsClient } from "./aws/sqsClient.mjs";
import { downloadFromS3 } from "./aws/downloadFromS3.mjs";
import { streamToBuffer } from "./helper.mjs";
import { parseResume } from "./services/resumeParser.mjs";
import { generateEmbedding } from "./services/embeddingService.mjs";
import { cosineSimilarity } from "./ai/similarity.mjs";

dotenv.config({ path: "../.env" });

const QUEUE_URL = process.env.SQS_QUEUE_URL;
const MAX_RETRIES = 3;

const processJobs = async(payload, message) => {
    const client = await pool.connect();
    let jobProcess;
    try {
        jobProcess = await getJobProcessDetails(payload.jobId, client);
        console.log("jobProcess: ", jobProcess);
        if(!jobProcess) {
            console.log("Job not found");
            return;
        }

        /* ---------- Idempotency Guards ---------- */
        if (jobProcess.status === "completed") {
            console.log("Already completed");
            return;
        }

        if (jobProcess.status === "failed") {
            console.log("Already failed");
            return;
        }

        /* ---------- Mark Processing ---------- */
        await client.query(`
            UPDATE processing_jobs
            SET status = 'processing', 
                updated_at = NOW()
            WHERE id = $1`, [jobProcess.id]
        );

        console.log(`Processing job: ${jobProcess.id}`);

        // ---------- Get Resume ----------
        const resume = await client.query(`
            SELECT * FROM resumes
            WHERE id = $1`,
            [ jobProcess.resume_id ]
        );

        if (resume.rows.length === 0) {
            throw new Error("Resume not found");
        }

        const resumeRow = resume.rows[0];
        // ---------- Parse Only Once ----------
        if(!resumeRow.parsed_text) {
            const fileStream = await downloadFromS3(resumeRow.filepath);
            const buffer = await streamToBuffer(fileStream);
            const parsedText = await parseResume(buffer, resumeRow.mime_type);

            await client.query(`
                UPDATE resumes
                SET parsed_text = $2
                WHERE id = $1`,
                [ resumeRow.id, parsedText ]
            );

            console.log("Parsed Successfully");
        }

        // ----------------- Embedding Only Once For Resume -------------------------
        const resumeEmbeddingData = await resumeEmbedding(resumeRow.id, client);

        console.log("Resume Embeddding Done -------------------------");

        // ----------------- Embedding Only Once For Job Description -------------------------
        const jobDescriptionEmbeddingData = await jobDescriptionEmbedding(jobProcess.job_description_id, client);

        console.log("Job Embeddding Done -------------------------");

        // -------------------- Caluculate semantic Match Score ------------------------------
        // const score = cosineSimilarity(resumeEmbeddingData, jobDescriptionEmbeddingData);

        const { rows } = await client.query(`
            SELECT
                1 - (r.embedding <=> jd.embedding) AS similarity
            FROM resumes r
            JOIN job_descriptions jd
                ON jd.id = $1
            WHERE r.id = $2
        `, [
            jobProcess.job_description_id,
            jobProcess.resume_id
        ]);

        const score = rows[0].similarity;
        console.log("Score Done -------------------------");

        // ---------- Insert Match Result ----------
        await client.query(`
            INSERT INTO match_results (id, job_id, score, result) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(job_id) DO NOTHING
        `, [
            uuidV4(),
            jobProcess.id,
            score * 100,
            JSON.stringify({ message: "Match calculated" })
        ]);

        // ---------- Mark Completed ----------
        await client.query(`
            UPDATE processing_jobs
            SET status = 'completed', 
                updated_at = NOW(), 
                error_message = NULL
            WHERE id = $1`, [jobProcess.id]
        );
        console.log(`Completed job: ${jobProcess.id}`);
    } catch (error) {
        console.error("Worker error:", error.message);
        const receiveCount = parseInt(message.Attributes.ApproximateReceiveCount || "1");
        if(jobProcess) {
            if (receiveCount >= MAX_RETRIES) {
                await client.query(`
                    UPDATE processing_jobs
                    SET status = 'failed',
                        error_message = $2,
                        retry_count = retry_count + 1,
                        updated_at = NOW()
                    WHERE id = $1
                `, [jobProcess.id, error.message]);
                console.log("❌ Marked FAILED after max retries");
            } else {
                console.log(`Retry attempt ${receiveCount}/${MAX_RETRIES}`);

                // keep status as processing
                await client.query(`
                    UPDATE processing_jobs
                    SET error_message = $2,
                        retry_count = retry_count + 1,
                        updated_at = NOW()
                    WHERE id = $1
                `, [jobProcess.id, error.message]);
            }
        }

        throw error; // allow SQS retry
    }
    finally {
        if(client) client.release();
    }
};

const getJobProcessDetails = async(jobProcessId, client) => {
    try {
        const response = await client.query(`
            SELECT * FROM processing_jobs
            WHERE id = $1`,
            [ jobProcessId ]
        );
        if(response.rows.length === 0) {
            return null;
        }
        return response.rows[0];
    } catch(error) {
        console.error("Error for getJobProcessDetails: ", error);
        throw error;
    }
};

const pollQueue = async() => {
    const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120,
        AttributeNames: ["All"] 
    });

    const response = await sqsClient.send(command);

    if (!response.Messages || response.Messages.length === 0) {
        console.log("No job to process");
        return;
    }

    // console.log("Response: ", response.Messages);
    for(const message of response.Messages) {
        await handleMessage(message);
    }
};

const handleMessage = async(message) => {
    const receiptHandle = message.ReceiptHandle;
    const payload = JSON.parse(message.Body);
    try {
        await processJobs(payload, message);
        await deleteMessageFromSqs(receiptHandle);
        console.log("✅ Message processed & deleted");
    } catch(error) {
        console.error("Processing failed:", error.message);
        // DO NOT DELETE MESSAGE
        // SQS will retry automatically
        throw error;
    }
};

const deleteMessageFromSqs = async(receiptHandle) => {
    const command = new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: receiptHandle
    })
    await sqsClient.send(command);
};

const startWorker = async () => {
    await recoverStuckJobs();
    while (true) {
        try {
            await pollQueue();
        } catch (err) {
            console.error("Worker loop error:", err.message);
        }
    }
};

const recoverStuckJobs = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE processing_jobs
            SET status = 'failed',
                error_message = 'Recovered after worker restart',
                updated_at = NOW()
            WHERE status = 'processing'
            AND updated_at < NOW() - INTERVAL '5 minutes'
        `);

        console.log("Recovered stuck jobs");
    } finally {
        client.release();
    }
};

const resumeEmbedding = async (resumeId, client) => {
    const { rows } = await client.query(
        `SELECT embedding, parsed_text
         FROM resumes
         WHERE id = $1`,
        [resumeId]
    );

    if (!rows.length) throw new Error("Resume not found");
    const resume = rows[0];
    if (resume.embedding) return resume.embedding;

    if (!resume.parsed_text)
        throw new Error("Parsed text missing");

    const embedding = await generateEmbedding(resume.parsed_text);
    console.log("Resume embedding: ", embedding);

    const vectorString = `[${embedding.join(",")}]`;
    await client.query(
        `UPDATE resumes
         SET embedding = $1
         WHERE id = $2
         AND embedding IS NULL`,
        [ vectorString, resumeId ]
    );

    return embedding;
};

const jobDescriptionEmbedding = async (jobDescriptionId, client) => {
    const { rows } = await client.query(
        `SELECT embedding, context
         FROM job_descriptions
         WHERE id = $1`,
        [jobDescriptionId]
    );

    if (!rows.length) throw new Error("Job Description not found");

    const jobDescriptions = rows[0];

    if (jobDescriptions.embedding) return jobDescriptions.embedding;

    if (!jobDescriptions.context)
        throw new Error("Job description text missing");

    const embedding = await generateEmbedding(jobDescriptions.context);
    console.log("Job Description embedding: ", embedding);

    const vectorString = `[${embedding.join(",")}]`;

    await client.query(
        `UPDATE job_descriptions
         SET embedding = $1
         WHERE id = $2
         AND embedding IS NULL`,
        [ vectorString, jobDescriptionId ]
    );

    return embedding;
};

 
startWorker();


///------------------------------- Old Code With DB working as QUEUE -------------------------------------///

// const proessJobs = async() => {
//     const client = await pool.connect();
//     let jobProcess;
//     try {
//         await client.query("BEGIN");

//         const result = await client.query(`SELECT * FROM processing_jobs
//             WHERE status = 'pending'
//             LIMIT 1
//             FOR UPDATE SKIP LOCKED`
//         ); 

//         if(result.rows.length === 0) {
//             console.log("No Job to process");
//             await client.query("COMMIT");
//             return;
//         }

//         jobProcess = result.rows[0];

//         // ------------- Idempotency 1 -------------------
//         if(jobProcess.status === "completed") {
//             console.log("Job is already processed");
//             await client.query("COMMIT");
//             return;
//         }

//         await client.query(`UPDATE processing_jobs
//             SET status = 'processing', updated_at = NOW()
//             WHERE id = $1`, [jobProcess.id]
//         );

//         await client.query("COMMIT");

//         // -------- PROCESSING ----------
//         console.log(`Processing job: ${jobProcess.id}`);

//         // Wait for 3 seconds and then complete the job process
//         await new Promise((resolve) => setTimeout(resolve, 3000));

//         // simulate random failure
//         const shouldFail = Math.random() < 0.8;
//         if(shouldFail) {
//             throw new Error("Random processing failure");
//         }

//         //------------- Idempotency 2 ------------------------
//         const existingRecords = await client.query(`
//             SELECT id FROM match_results 
//             WHERE job_id = $1`, [jobProcess.id]
//         );

//         if(existingRecords.rows.length > 0) {
//             console.log("Result already exists. Skipping insert:", jobProcess.id);
//         } else {
//             const constScore = Math.random() * 100;
//             try {
//                 const result = await client.query(`
//                     INSERT INTO match_results (id, job_id, score, result) 
//                     VALUES ($1, $2, $3, $4)
//                 `, [
//                     uuidV4(),
//                     jobProcess.id,
//                     constScore,
//                     JSON.stringify({ message: "Match calculated" })
//                 ]);
//                 console.log("Inserted: ", result);
//             } catch(error) {
//                 // ---------- IDEMPOTENCY GUARD 3 ----------
//                 if(error.code === "23505") {
//                     console.log("Duplicate insert prevented by DB constraint");
//                 } else {
//                     throw error;
//                 }
//             }
//         }

//         // Success
//         await client.query(`UPDATE processing_jobs
//             SET status = 'completed', error_message = NULL, updated_at = NOW()
//             WHERE id = $1`, [jobProcess.id]
//         );
//         console.log(`Completed job: ${jobProcess.id}`);
//     } catch(error) {
//         // if(client) await client.query("ROLLBACK");
//         console.error("Error for proessJobs: ", error);
//         if (jobProcess) {
//             try {
//                 await client.query(
//                     `UPDATE processing_jobs
//                     SET retry_count = retry_count + 1,
//                         status = CASE
//                           WHEN retry_count + 1 >= max_retries THEN 'failed'
//                           ELSE 'pending'
//                         END,
//                         error_message = $2,
//                         updated_at = NOW()
//                         WHERE id = $1
//                     `, [jobProcess.id, error.message]
//                 );
//             } catch(dbError) {
//                 console.error("Retry update error:", dbError);
//             }
//         }
//     } finally {
//         if(client) client.release();
//     }
// };

// setInterval(proessJobs, 5000);
// console.log("Worker started...");