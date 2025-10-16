// lib/sharepoint/sharepoint-service.ts
import { cache } from 'react';
import { sharepointSyncState, type NewSharePointSyncStateData, type SharePointSyncStateData } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {db} from "@/lib/db/client";

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || '';
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET || '';
const DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || '';
const TARGET_PATH_TO_SYNC_ENV = process.env.SHAREPOINT_TARGET_PATH || "";

const AUTH_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";

let accessToken: string | null = null;
let tokenExpiry = 0;

const isSharePointConfigured = (): boolean => {
  const isConfigured = Boolean(TENANT_ID && CLIENT_ID && CLIENT_SECRET && DRIVE_ID);
  if (!isConfigured && process.env.NODE_ENV === 'development') {
    console.warn('SharePoint integration not fully configured (sharepoint-service.ts).');
  }
  return isConfigured;
};

export async function getAccessToken(): Promise<string> {
  if (!isSharePointConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("SharePoint Dev: Using mock access token.");
      return 'mock-token-dev';
    }
    throw new Error("SharePoint credentials not configured for token acquisition.");
  }
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default' });
    const response = await fetch(AUTH_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), cache: 'no-store' });
    if (!response.ok) { const errorText = await response.text().catch(() => response.statusText); throw new Error(`Token refresh failed: ${response.status} - ${errorText}`); }
    const data = await response.json() as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000);
    return accessToken;
  } catch (error) { console.error('Failed to refresh access token:', error); throw error; }
}

export interface SharePointFile {
  id: string; name: string; path?: string;
  size: number; lastModifiedDateTime: string; downloadUrl?: string; webUrl?: string;
  eTag?: string; cTag?: string; deleted?: {}; folder?: {}; file?: {}; package?: {};
  parentReference?: { driveId?: string; id?: string; path?: string; siteId?: string; };
}
export interface SharePointChange { type: 'upsert' | 'delete' | 'recursive_initial_upsert'; item: SharePointFile; }

function getSyncStateId(driveId: string, targetPath: string): string {
  const pathSuffix = targetPath.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100) || 'root';
  return `spsync_drive_${driveId}_path_${pathSuffix}`;
}

async function getSyncStateFromDB(syncStateId: string): Promise<SharePointSyncStateData | null> {
  try {
    const result = await db.select().from(sharepointSyncState).where(eq(sharepointSyncState.id, syncStateId)).limit(1);
    return result[0] || null;
  } catch (error) { console.error(`Error fetching sync state for ${syncStateId} from DB:`, error); return null; }
}

async function storeSyncStateInDB(syncStateId: string, driveId: string, targetPath: string, deltaLink: string | null, wasRecursive: boolean): Promise<void> {
  try {
    const values: NewSharePointSyncStateData = { id: syncStateId, driveId: driveId, targetPath: targetPath, deltaLink: deltaLink, lastSyncedAt: new Date(), lastSyncWasRecursiveFullScan: wasRecursive };
    await db.insert(sharepointSyncState).values(values).onConflictDoUpdate({ target: sharepointSyncState.id, set: { deltaLink: values.deltaLink, lastSyncedAt: values.lastSyncedAt, lastSyncWasRecursiveFullScan: values.lastSyncWasRecursiveFullScan, updatedAt: new Date() } });
  } catch (error) { console.error(`Error storing sync state for ${syncStateId} in DB:`, error); }
}

async function listSharePointFilesRecursive(driveId: string, currentGraphItemPath: string, baseRelativePath: string, token: string): Promise<SharePointFile[]> {
  const allFiles: SharePointFile[] = [];
  const selectParams = "$select=id,name,size,lastModifiedDateTime,webUrl,eTag,cTag,folder,file,package,parentReference,@microsoft.graph.downloadUrl";
  const url = `${GRAPH_ENDPOINT}${currentGraphItemPath}:/children?${selectParams}`;
  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!response.ok) { const errorBody = await response.json().catch(() => ({})); console.error(`Recursive List ERROR: Failed for ${currentGraphItemPath}. Status: ${response.status}`, errorBody.error?.message || response.statusText); return []; }
    const data = await response.json();
    const items: SharePointFile[] = data.value || [];
    for (const item of items) {
      const itemRelativePath = `${baseRelativePath ? `${baseRelativePath}/` : ''}${item.name}`.replace(/^\//, '');
      if (item.folder) {
        const subFolderGraphPath = `${currentGraphItemPath}/${encodeURIComponent(item.name)}`;
        allFiles.push(...await listSharePointFilesRecursive(driveId, subFolderGraphPath, itemRelativePath, token));
      } else if (item.file || item.package) {
        // @ts-ignore
        allFiles.push({ ...item, path: baseRelativePath, downloadUrl: item['@microsoft.graph.downloadUrl'] || item.downloadUrl });
      }
    }
  } catch (error) { console.error(`Recursive List CRITICAL ERROR for path ${currentGraphItemPath}:`, error); }
  return allFiles;
}

export async function getSharePointChanges(driveIdToSync: string = DRIVE_ID, targetPathKey: string = TARGET_PATH_TO_SYNC_ENV): Promise<{ changes: SharePointChange[]; newDeltaLinkPersisted: boolean; actualItemsFoundThisRun: number; initialSyncPerformedByRecursive?: boolean }> {
  if (!isSharePointConfigured()) return { changes: [], newDeltaLinkPersisted: false, actualItemsFoundThisRun: 0 };
  const token = await getAccessToken();
  const syncStateId = getSyncStateId(driveIdToSync, targetPathKey);
  const currentSyncState = await getSyncStateFromDB(syncStateId);
  const currentDeltaLink = currentSyncState?.deltaLink || null;
  const isEffectivelyInitialAttempt = !currentDeltaLink && !currentSyncState?.lastSyncWasRecursiveFullScan;

  let results: SharePointChange[] = [];
  let nextLinkFromResponse: string | undefined;
  let finalDeltaLinkFromResponse: string | null = null;
  let totalItemsFromGraphThisRun = 0;

  let itemGraphPathForTarget = `/drives/${driveIdToSync}/root`;
  if (targetPathKey) { const encodedPathSegments = targetPathKey.split('/').map(segment => encodeURIComponent(segment)).join('/'); itemGraphPathForTarget += `:/${encodedPathSegments}`; }

  if (targetPathKey) {
    const checkFolderUrl = `${GRAPH_ENDPOINT}${itemGraphPathForTarget}`;
    console.debug(`SharePoint Sync DEBUG: Verifying folder item at: ${checkFolderUrl}`);
    try {
      const checkResponse = await fetch(checkFolderUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }});
      if (!checkResponse.ok) { const errBody = await checkResponse.json().catch(()=>{}); throw new Error(`Target SharePoint folder '${targetPathKey}' not found or inaccessible (Status: ${checkResponse.status}). ${errBody.error?.message||''}`);}
      const folderItem = await checkResponse.json();
      if (!folderItem.folder) throw new Error(`SHAREPOINT_TARGET_PATH '${targetPathKey}' is not a folder.`);
      console.debug(`SharePoint Sync DEBUG: Target folder '${targetPathKey}' (ID: ${folderItem.id}) verified successfully.`);
    } catch (folderCheckError) { console.error("SharePoint Sync DEBUG: Error during folder check:", folderCheckError); throw folderCheckError; }
  }

  const deltaFunctionPath = targetPathKey ? `${itemGraphPathForTarget}:/delta` : `${itemGraphPathForTarget}/delta`;
  let requestUrl = currentDeltaLink || `${GRAPH_ENDPOINT}${deltaFunctionPath}?token=latest`;

  try {
    do {
      if (nextLinkFromResponse) { requestUrl = nextLinkFromResponse; }
      console.debug(`SharePoint Sync DEBUG: Fetching delta page from URL (token part omitted for brevity): ${requestUrl.substring(0, requestUrl.indexOf('?token=') > 0 || requestUrl.indexOf('$skiptoken=') > 0 || requestUrl.indexOf('$deltatoken=') > 0 ? Math.min(requestUrl.indexOf('?token='), requestUrl.indexOf('$skiptoken='), requestUrl.indexOf('$deltatoken=')) : requestUrl.length)}...`);
      const response = await fetch(requestUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Prefer': 'odata.track-changes, odata.maxpagesize=50' }, cache: 'no-store' });
      const responseBodyText = await response.text();
      if (!response.ok) {
        let errorBody: any = {}; try { errorBody = JSON.parse(responseBodyText); } catch { errorBody = { message: responseBodyText || response.statusText }; }
        console.error(`SharePoint Delta API error (${response.status}) for URL used: ${requestUrl.substring(0,150)}...`, errorBody);
        if (response.status === 410 || (response.status === 400 && (responseBodyText.includes("deltaLink is no longer valid") || responseBodyText.includes("syncState not found")))) {
          console.warn(`SharePoint DeltaLink for SyncID '${syncStateId}' invalid/expired. Resetting.`);
          await storeSyncStateInDB(syncStateId, driveIdToSync, targetPathKey, null, false);
          return getSharePointChanges(driveIdToSync, targetPathKey);
        }
        throw new Error(`Failed to fetch SharePoint delta (${response.status}): ${errorBody.error?.message || errorBody.message}`);
      }
      const data = JSON.parse(responseBodyText);
      const items: SharePointFile[] = data.value || [];
      totalItemsFromGraphThisRun += items.length;
      // Detailed item logging (uncomment if needed for extreme cases)
      /*
      if (items.length > 0) {
          items.slice(0, 5).forEach((rawItem, idx) => {
          });
      }
      */
      for (const item of items) {
        if (item.folder && !item.file && !item.deleted) { console.debug(`SP Sync: Skipping folder: ${item.name}`); continue; }
        let relativePath = '';
        if (item.parentReference?.path) {
          const graphParentPath = item.parentReference.path; const driveRootPrefix = `/drive/root:`;
          const itemParentAbsolutePath = graphParentPath.startsWith(driveRootPrefix) ? graphParentPath.substring(driveRootPrefix.length) : graphParentPath;
          if (targetPathKey) {
            const normalizedTargetPath = targetPathKey.startsWith('/') ? targetPathKey : `/${targetPathKey}`;
            if (itemParentAbsolutePath.toLowerCase().startsWith(normalizedTargetPath.toLowerCase())) {
              relativePath = itemParentAbsolutePath.substring(normalizedTargetPath.length).replace(/^\//, '');
            } else { console.warn(`SP Sync: Item '${item.name}' parent '${itemParentAbsolutePath}' not under target '${normalizedTargetPath}'. RelPath='${relativePath}'`);}
          } else { relativePath = itemParentAbsolutePath.replace(/^\//, ''); }
        }
        const changeItem: SharePointFile = { ...item, path: relativePath };
        if (item.deleted) { results.push({ type: 'delete', item: changeItem }); }
        else if (item.file || item.package) { results.push({ type: 'upsert', item: changeItem }); }
      }
      nextLinkFromResponse = data['@odata.nextLink'];
      if (data['@odata.deltaLink']) finalDeltaLinkFromResponse = data['@odata.deltaLink'];
    } while (nextLinkFromResponse);

    if (isEffectivelyInitialAttempt && totalItemsFromGraphThisRun === 0 && finalDeltaLinkFromResponse) {
      console.warn(`SharePoint Sync: Initial delta for '${syncStateId}' gave 0 items but a deltaLink. Falling back to recursive list.`);
      const graphPathForRecursiveRoot = `/drives/${driveIdToSync}/root${targetPathKey ? `:/${targetPathKey.split('/').map(s=>encodeURIComponent(s)).join('/')}` : ''}`;
      const recursiveFiles = await listSharePointFilesRecursive(driveIdToSync, graphPathForRecursiveRoot, "", token);
      results = recursiveFiles.map(file => ({ type: 'recursive_initial_upsert', item: file }));
      totalItemsFromGraphThisRun = recursiveFiles.length;
      await storeSyncStateInDB(syncStateId, driveIdToSync, targetPathKey, finalDeltaLinkFromResponse, true);
      return { changes: results, newDeltaLinkPersisted: true, actualItemsFoundThisRun: totalItemsFromGraphThisRun, initialSyncPerformedByRecursive: true };
    }

    if (finalDeltaLinkFromResponse) {
      await storeSyncStateInDB(syncStateId, driveIdToSync, targetPathKey, finalDeltaLinkFromResponse, currentSyncState?.lastSyncWasRecursiveFullScan || false); // Preserve recursive flag if just updating delta
      return { changes: results, newDeltaLinkPersisted: true, actualItemsFoundThisRun: totalItemsFromGraphThisRun, initialSyncPerformedByRecursive: currentSyncState?.lastSyncWasRecursiveFullScan };
    } else {
      if (!currentDeltaLink && !finalDeltaLinkFromResponse && results.length === 0 && totalItemsFromGraphThisRun === 0) {
        await storeSyncStateInDB(syncStateId, driveIdToSync, targetPathKey, null, false); // Initial empty scan
      } else { console.warn(`SharePoint Sync: Sync for SyncID '${syncStateId}' completed but no new deltaLink. ${results.length} changes collected from ${totalItemsFromGraphThisRun} raw items.`);}
      return { changes: results, newDeltaLinkPersisted: false, actualItemsFoundThisRun: totalItemsFromGraphThisRun, initialSyncPerformedByRecursive: currentSyncState?.lastSyncWasRecursiveFullScan };
    }
  } catch (error) { console.error(`SharePoint Sync: Critical Error for SyncID '${syncStateId}':`, error); throw error; }
}

export const getSharePointFileMetadataById = cache(async (itemId: string, driveId: string = DRIVE_ID): Promise<SharePointFile | null> => {
  if (!isSharePointConfigured() || !itemId) {
    console.warn("getSharePointFileMetadataById: SharePoint not configured or no itemId provided.");
    return null;
  }

  const token = await getAccessToken();
  // Explicitly request @microsoft.graph.downloadUrl
  const selectFields = "id,name,webUrl,eTag,cTag,file,folder,package,size,lastModifiedDateTime,parentReference,@microsoft.graph.downloadUrl";
  const url = `${GRAPH_ENDPOINT}/drives/${driveId}/items/${itemId}?$select=${selectFields}`;
  console.debug(`getSharePointFileMetadataById: Fetching metadata for item ID '${itemId}' from drive '${driveId}'. URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache this specific item lookup for 1 hour
    });

    const responseBodyText = await response.text(); // Read as text first for better error diagnosis
    if (!response.ok) {
      console.warn(`getSharePointFileMetadataById: Failed for item ID '${itemId}'. Status: ${response.status}. Body: ${responseBodyText}`);
      return null;
    }

    const data = JSON.parse(responseBodyText);
    console.debug(`getSharePointFileMetadataById: Raw data for item ID '${itemId}':`, `${JSON.stringify(data, null, 2).substring(0, 1000)}...`); // Log first 1000 chars of JSON

    const downloadUrl = data['@microsoft.graph.downloadUrl'] || data.downloadUrl || null;
    if (!downloadUrl) {
      console.warn(`getSharePointFileMetadataById: downloadUrl is MISSING in Graph API response for item ID '${itemId}'. Name: ${data.name}`);
    } else {
      console.debug(`getSharePointFileMetadataById: Successfully found downloadUrl for item ID '${itemId}'.`);
    }

    let relativePath = '';
    if (data.parentReference?.path) {
      const graphParentPath = data.parentReference.path; const driveRootPrefix = `/drive/root:`;
      const itemParentAbsolutePath = graphParentPath.startsWith(driveRootPrefix) ? graphParentPath.substring(driveRootPrefix.length) : graphParentPath;
      if (TARGET_PATH_TO_SYNC_ENV) {
        const normalizedTargetPath = TARGET_PATH_TO_SYNC_ENV.startsWith('/') ? TARGET_PATH_TO_SYNC_ENV : `/${TARGET_PATH_TO_SYNC_ENV}`;
        if (itemParentAbsolutePath.toLowerCase().startsWith(normalizedTargetPath.toLowerCase())) {
          relativePath = itemParentAbsolutePath.substring(normalizedTargetPath.length).replace(/^\//, '');
        }
      } else { relativePath = itemParentAbsolutePath.replace(/^\//, ''); }
    }
    return {
      id: data.id,
      name: data.name,
      path: relativePath,
      size: data.size,
      lastModifiedDateTime: data.lastModifiedDateTime,
      downloadUrl: downloadUrl, // Use the explicitly checked downloadUrl
      webUrl: data.webUrl,
      eTag: data.eTag,
      cTag: data.cTag,
      deleted: data.deleted,
      folder: data.folder,
      file: data.file,
      package: data.package,
      parentReference: data.parentReference,
    };
  } catch (error) {
    console.error(`getSharePointFileMetadataById: Error fetching metadata for SharePoint item ID '${itemId}':`, error);
    return null;
  }
});
