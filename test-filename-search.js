// Test script to verify exact filename search
const { BedrockAgentRuntimeClient, RetrieveCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'eu-central-1',
});

async function testFilenameSearch(filename) {
    console.log(`\nTesting search for: "${filename}"`);
    
    const filter = {
        orAll: [
            {
                stringContains: {
                    key: "x-amz-bedrock-kb-source-uri",
                    value: `/${filename}.pdf`
                }
            },
            {
                stringContains: {
                    key: "x-amz-bedrock-kb-source-uri",
                    value: `/${filename}.docx`
                }
            },
            {
                stringContains: {
                    key: "x-amz-bedrock-kb-source-uri",
                    value: `/${filename}`
                }
            }
        ]
    };

    try {
        const command = new RetrieveCommand({
            knowledgeBaseId: process.env.SHAREPOINT_KNOWLEDGE_BASE_ID,
            retrievalQuery: { text: filename },
            retrievalConfiguration: {
                vectorSearchConfiguration: { 
                    numberOfResults: 5,
                    filter: filter
                },
            },
        });

        const response = await client.send(command);
        console.log(`Found ${response.retrievalResults?.length || 0} results`);
        
        response.retrievalResults?.forEach((result, index) => {
            const uri = result.location?.s3Location?.uri || result.location?.webLocation?.url;
            const filename = uri?.split('/').pop();
            console.log(`  ${index + 1}. ${filename} (score: ${result.score})`);
        });
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Test with a sample filename
testFilenameSearch("9550-REP-001").then(() => {
    console.log("\nTest complete!");
});
