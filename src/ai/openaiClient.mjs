import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config("../.env");

export const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
});