import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./sqsClient.mjs";

export const sendMessageToQueue = async(payload) => {
    const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(payload)
    });

    console.log({
        region: process.env.AWS_REGION,
        keyLength: process.env.AWS_ACCESS_KEY_ID?.length,
        secretLength: process.env.AWS_SECRET_ACCESS_KEY?.length
    });

    await sqsClient.send(command);
};