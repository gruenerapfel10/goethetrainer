


export type RunSqlResult = {
    records: Record<string, any>[];
    columns: {
        name: string,
        type: string,
    }[];
    threadId: string;
    totalRows: number;
}