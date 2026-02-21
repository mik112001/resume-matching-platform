import express from "express";
import dotenv from "dotenv";
import uploadRoute from "./routes/upload.mjs";

dotenv.config({ path: "../.env" });
const app = express();
app.use(express.json());

app.use("/api", uploadRoute);
const PORT = process.env.PORT || 3000;

app.use("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port 3000`);
});


//think for database that I need to create to store
// -> We need to table: resume and jobs to maintain them seperately and one more table where we will store the processing_jobs

// Resume Table
    // 1. resumeId,
    // 2. resume link -> 
        // upload the file, 
        // add all the validation checks:
            // a. Size of the file that is allowed to be upload(min and max size)
            // b. Format of the file allowed
        // upload the file on aws s3 bucket and get the url
    // 3. uploaded at,
    // 4. fileName

// Job Descriptions Table
    //1. job description Id
    //2. job description
    //3. created at

// Processing Jobs Table
    // 1. id 
    // 2. resumeId -> foreign key to resume table(id),
    // 3. created At
    // 4. updated At 
    // 5. Job Description Id -> foreign key to job description(id)
    // 6. status -> To maintain what has happend to matching -> pending, processing, completed
