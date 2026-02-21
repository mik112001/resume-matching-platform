import { GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { s3Client } from "./s3Client.mjs";

dotenv.config("../env");

export const downloadFromS3 = async(key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        });

        const response = await s3Client.send(command);
        // console.log("Response for downloadFromS3: ", response.Body);
        return response.Body;
    } catch(error) {
        console.error("Error for downloadFromS3: ", error);
        throw error;
    }
};