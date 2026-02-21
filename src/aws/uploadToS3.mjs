import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3Client.mjs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

export const uploadToS3 = async(file) => {
    try {
        const fileKey = `resumes/${Date.now()}-${path.basename(file.originalname)}`;
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype
        });

        await s3Client.send(command);
        return fileKey;
    } catch(error) {
        console.error("Error for uploadToS3: ", error);
        throw error;
    }
};