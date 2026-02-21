import { openaiClient } from "../ai/openaiClient.mjs"

export const generateEmbedding = async(text) => {
    const response = await openaiClient.embeddings.create({
        input: text,
        model: "text-embedding-3-small"
    });

    console.log("Response for generateEmbeddings: ", response);
    return response.data[0].embedding;
};