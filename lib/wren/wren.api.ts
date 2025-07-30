import axios, { type AxiosInstance } from 'axios'
import type {
    WrenAskRequest,
    WrenAskResponse, WrenFetchMetadataResponse,
    WrenGenerateSqlRequest,
    WrenGenerateSqlResponse,
    WrenGenerateSummaryRequest,
    WrenGenerateSummaryResponse,
    WrenRunSqlRequest,
    WrenRunSqlResponse
} from "./wren.api.types";

const wren: AxiosInstance = axios.create({
    baseURL: process.env.WREN_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})


export async function generateSql(query: WrenGenerateSqlRequest): Promise<WrenGenerateSqlResponse> {
    try {
        const response = await wren.post<WrenGenerateSqlResponse>('/generate_sql', query);
        return response.data;
    } catch (error) {
        console.error('Error generating SQL:', error);
        throw error;
    }
}


export const runSql = async (query: WrenRunSqlRequest): Promise<WrenRunSqlResponse> => {
    try {
        const response = await wren.post<WrenRunSqlResponse>('/run_sql', query);
        return response.data;
    } catch (error) {
        console.error('Error running SQL:', error);
        throw error;
    }
}

export const ask = async (query: WrenAskRequest): Promise<WrenAskResponse> => {
    try {
        const response = await wren.post<WrenAskResponse>('/ask', query);
        return response.data;
    } catch (error) {
        console.error('Error asking question:', error);
        throw error;
    }
}

export const generateSummary = async (query: WrenGenerateSummaryRequest): Promise<WrenGenerateSummaryResponse> => {
    try {
        const response = await wren.post<WrenGenerateSummaryResponse>('/generate_summary', query);
        return response.data;
    } catch (error) {
        console.error('Error generating summary:', error);
        throw error;
    }
}


export const fetchDbMetadata = async (): Promise<WrenFetchMetadataResponse> => {
    try {
        const response = await wren.get<WrenFetchMetadataResponse>('/models');
        return response.data;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        throw error;
    }
}

