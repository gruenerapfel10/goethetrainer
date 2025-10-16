import {fetchDbMetadata, runSql} from "./wren.api";
import NodeCache from "node-cache";

const cache = new NodeCache( { stdTTL: 600, checkperiod: 120 } );
const DB_METADATA_CACHE_KEY = 'dbMetadata';

export async function fetchEnhancedMetadata(): Promise<any> {
    const cachedMetadata = cache.get(DB_METADATA_CACHE_KEY);
    if (cachedMetadata) {
        return cachedMetadata;
    }

    const metadata = await fetchDbMetadata();
    const compressedModels = metadata.models.map(model => {
        return {
            name: model.name,
            columns: model.columns.reduce((memo, column) => ({ ...memo, [column.name]: `${column.type} ${column.notNull ? 'not null' : ''}` }), {}),
            primaryKey: model.primaryKey,
        }
    });

    const sampledModels = await Promise.all(compressedModels.map(async (model) => {
        try {
            if (!model.primaryKey || Object.keys(model.columns).length > 10) {
                return {
                    ...model,
                    recordsSample: '<Primary key not found or too many columns, skipping sampling>',
                };
            }

            const sample = await runSql({ sql: `SELECT * FROM "${model.name}" ORDER BY ${model.primaryKey} DESC`, limit: 3 });
            return {
                ...model,
                recordsSample: sample.records,
            }
        } catch(_) {
            return model;
        }
    }));

    const enhancedMetadata = {
        ...metadata,
        models: sampledModels,
    };

    cache.set(DB_METADATA_CACHE_KEY, enhancedMetadata);
    return enhancedMetadata;
}