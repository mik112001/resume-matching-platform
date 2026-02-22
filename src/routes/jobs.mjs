import express from "express";
import { pool } from "../db.mjs";

const router = express.Router();

router.get("/:id", async (req, res) => {
    const jobId = req.params.id;

    try {
        const { rows } = await pool.query(`
            SELECT 
                pj.id,
                pj.status,
                pj.retry_count,
                pj.error_message,
                pj.created_at,
                pj.updated_at,
                mr.score,
                mr.result
            FROM processing_jobs pj
            LEFT JOIN match_results mr
                ON pj.id = mr.job_id
            WHERE pj.id = $1
        `, [jobId]);

        if (!rows.length) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error("Error fetching job:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

export default router;