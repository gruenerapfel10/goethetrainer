import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from 'node:stream';
import pdf2md from '@opendocsg/pdf2md';
const mammoth = require('mammoth');
import * as XLSX from 'xlsx';

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

function isPDF(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
}

function isDOCX(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.docx') || lower.endsWith('.doc');
}

function isXLSX(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

function isCSV(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.csv');
}

function isJSON(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.json');
}

function isMarkdown(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.markdown');
}

function isTextFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.txt') || lower.endsWith('.text') || 
           lower.endsWith('.log') || lower.endsWith('.yml') || 
           lower.endsWith('.yaml') || lower.endsWith('.xml') ||
           lower.endsWith('.html') || lower.endsWith('.htm');
}

export async function getS3FileContent(s3Url: string): Promise<{ content: string; isPdf: boolean }> {
    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');
        const fileName = key.split('/').pop() || '';

        if (!bucketName || !key) {
            throw new Error(`Invalid S3 URL format: ${s3Url}`);
        }

        console.log(`[raw-content] Attempting to fetch from S3:`, { bucket: bucketName, key, fileName });

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error('No content received from S3');
        }

        // Convert the readable stream to buffer
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        
        const buffer = Buffer.concat(chunks);

        // If it's a PDF, convert to markdown
        if (isPDF(fileName)) {
            try {
                const markdown = await pdf2md(buffer);
                console.log(`[raw-content] Converted PDF ${fileName} to markdown (${markdown.length} chars)`);
                return { content: markdown, isPdf: true };
            } catch (error) {
                console.error('Error converting PDF to markdown:', error);
                throw new Error('Failed to convert PDF to markdown');
            }
        }

        // If it's a DOCX file, convert using mammoth
        if (isDOCX(fileName)) {
            try {
                const result = await mammoth.extractRawText({ buffer });
                const text = result.value;
                console.log(`[raw-content] Converted DOCX ${fileName} to text (${text.length} chars)`);
                return { content: text, isPdf: false };
            } catch (error) {
                console.error('Error converting DOCX to text:', error);
                throw new Error('Failed to convert DOCX to text');
            }
        }

        // If it's an Excel file (XLSX/XLS), convert using xlsx library
        if (isXLSX(fileName)) {
            try {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                let content = '';
                
                // Process each sheet
                workbook.SheetNames.forEach((sheetName) => {
                    content += `\n=== Sheet: ${sheetName} ===\n`;
                    const sheet = workbook.Sheets[sheetName];
                    // Convert to CSV format for better readability
                    const csv = XLSX.utils.sheet_to_csv(sheet);
                    content += csv + '\n';
                });
                
                console.log(`[raw-content] Converted XLSX ${fileName} to text (${content.length} chars)`);
                return { content: content, isPdf: false };
            } catch (error) {
                console.error('Error converting XLSX to text:', error);
                throw new Error('Failed to convert Excel file to text');
            }
        }

        // If it's a CSV file, ensure proper handling
        if (isCSV(fileName)) {
            try {
                const text = buffer.toString('utf-8');
                console.log(`[raw-content] Processed CSV ${fileName} as text (${text.length} chars)`);
                return { content: `CSV File: ${fileName}\n\n${text}`, isPdf: false };
            } catch (error) {
                console.error('Error processing CSV file:', error);
                throw new Error('Failed to process CSV file');
            }
        }

        // If it's a JSON file, format it nicely
        if (isJSON(fileName)) {
            try {
                const text = buffer.toString('utf-8');
                // Try to parse and pretty-print JSON
                try {
                    const jsonData = JSON.parse(text);
                    const formatted = JSON.stringify(jsonData, null, 2);
                    console.log(`[raw-content] Processed JSON ${fileName} (formatted, ${formatted.length} chars)`);
                    return { content: `JSON File: ${fileName}\n\n${formatted}`, isPdf: false };
                } catch {
                    // If JSON is invalid, return as-is
                    console.log(`[raw-content] Processed JSON ${fileName} as text (${text.length} chars)`);
                    return { content: `JSON File: ${fileName}\n\n${text}`, isPdf: false };
                }
            } catch (error) {
                console.error('Error processing JSON file:', error);
                throw new Error('Failed to process JSON file');
            }
        }

        // If it's a Markdown file, add context
        if (isMarkdown(fileName)) {
            try {
                const text = buffer.toString('utf-8');
                console.log(`[raw-content] Processed Markdown ${fileName} as text (${text.length} chars)`);
                return { content: `Markdown File: ${fileName}\n\n${text}`, isPdf: false };
            } catch (error) {
                console.error('Error processing Markdown file:', error);
                throw new Error('Failed to process Markdown file');
            }
        }

        // For other known text files, add file type context
        if (isTextFile(fileName)) {
            try {
                const text = buffer.toString('utf-8');
                const extension = fileName.split('.').pop()?.toUpperCase() || 'TEXT';
                console.log(`[raw-content] Processed ${extension} file ${fileName} as text (${text.length} chars)`);
                return { content: `${extension} File: ${fileName}\n\n${text}`, isPdf: false };
            } catch (error) {
                console.error('Error processing text file:', error);
                throw new Error('Failed to process text file');
            }
        }

        // For any other files, try to interpret as UTF-8 text
        try {
            const text = buffer.toString('utf-8');
            console.log(`[raw-content] Returning file ${fileName} as UTF-8 (${text.length} chars)`);
            return { content: `File: ${fileName}\n\n${text}`, isPdf: false };
        } catch (error) {
            console.error('Error converting file to UTF-8:', error);
            throw new Error('File format not supported or cannot be converted to text');
        }

    } catch (error: any) {
        // Log detailed error information
        if (error.Code === 'NoSuchKey') {
            console.error(`[raw-content] File not found in S3:`, { 
                s3Url, 
                error: error.message,
                key: error.Key 
            });
            throw new Error(`File not found: ${s3Url}`);
        }
        console.error(`[raw-content] Error fetching content from S3:`, { 
            s3Url, 
            error: error.message,
            code: error.Code 
        });
        throw error;
    }
}