import mammoth from "mammoth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const parseResume = async(buffer, mimeType) => {
    let text = "";
    console.log("mimeType:: ", mimeType);
    try {
        if(mimeType === "application/pdf") {
            const data = await pdf(buffer);
            text = data.text;
        } else if(mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({buffer});
            text = result.value;
        } else {
            throw new Error("Unsupported File Type");
        }
        return text;
    } catch(error) {
        console.error("Error for parseResume: ", error);
        throw error;
    }
};