/**
 * Document STUB Functions
 * 
 * These functions demonstrate Tandem Document API endpoints.
 * Documents are files linked to a facility from ACC/BIM360.
 * 
 * Output goes to browser console - open DevTools to see results.
 */

import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';

/**
 * Get all documents linked to a facility
 * Documents are stored in the facility's "docs" array
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 */
export async function getDocuments(facilityURN, region) {
  console.group("STUB: getDocuments()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log("Request:", requestPath);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const facility = await response.json();
    
    if (facility.docs && facility.docs.length > 0) {
      console.log(`Found ${facility.docs.length} document(s):`);
      
      // Pretty print documents in a table
      const docTable = facility.docs.map(doc => ({
        name: doc.name,
        id: doc.id,
        accProjectId: doc.accProjectId || 'N/A',
        hasSignedLink: !!doc.signedLink
      }));
      console.table(docTable);
      
      console.log("Full document details:", facility.docs);
    } else {
      console.log("No documents linked to this facility.");
      console.log("TIP: Use the Tandem web app or API to link documents from ACC/BIM360.");
    }
    
    console.groupEnd();
    return facility.docs || [];
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return [];
  }
}

/**
 * Get the download link for a specific document
 * The signed link can be used to download the document
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} documentId - Document ID
 */
export async function getDocumentDownloadLink(facilityURN, region, documentId) {
  console.group("STUB: getDocumentDownloadLink()");

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log("Request:", requestPath);
  console.log("Document ID:", documentId);

  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const facility = await response.json();
    
    if (!facility.docs || facility.docs.length === 0) {
      console.error("No documents found in this facility.");
      console.groupEnd();
      return null;
    }
    
    const doc = facility.docs.find(d => d.id === documentId);
    
    if (!doc) {
      console.error(`Document with ID "${documentId}" not found.`);
      console.log("Available document IDs:", facility.docs.map(d => d.id));
      console.groupEnd();
      return null;
    }
    
    console.log("Document found:", doc.name);
    
    if (doc.signedLink) {
      console.log("✓ Signed download link available:");
      console.log(doc.signedLink);
      console.log("\nTIP: Click the link above to download, or copy and use in browser/curl.");
    } else {
      console.log("⚠ No signed link available for this document.");
    }
    
    console.groupEnd();
    return doc.signedLink || null;
  } catch (error) {
    console.error('Error:', error);
    console.groupEnd();
    return null;
  }
}

/**
 * Delete a document link from a facility
 * This removes the link, not the actual document in ACC/BIM360
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} documentIds - Comma-separated document IDs
 */
export async function deleteDocuments(facilityURN, region, documentIds) {
  console.group("STUB: deleteDocuments()");

  const docIdsArray = documentIds.split(',').map(id => id.trim()).filter(id => id);
  
  if (docIdsArray.length === 0) {
    console.error("ERROR: No document IDs provided.");
    console.groupEnd();
    return;
  }
  
  console.log("Document IDs to delete:", docIdsArray);

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/docs`;
  console.log("Request:", requestPath);

  const bodyPayload = JSON.stringify({
    delete: docIdsArray
  });
  console.log("Payload:", bodyPayload);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    
    if (response.ok) {
      const result = await response.json();
      console.log("✓ Documents deleted successfully");
      console.log("Result:", result);
    } else {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

/**
 * Link documents from ACC/BIM360 to a facility
 * Note: This requires the documents to already exist in ACC/BIM360
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} accAccountId - ACC/BIM360 Account ID
 * @param {string} accProjectId - ACC/BIM360 Project ID
 * @param {string} accLineage - ACC/BIM360 Lineage ID (item URN)
 * @param {string} accVersion - ACC/BIM360 Version ID
 * @param {string} docName - Display name for the document
 */
export async function createDocumentLink(facilityURN, region, accAccountId, accProjectId, accLineage, accVersion, docName) {
  console.group("STUB: createDocumentLink()");

  if (!accAccountId || !accProjectId || !accLineage || !accVersion) {
    console.error("ERROR: All ACC/BIM360 fields are required.");
    console.log("Required: accAccountId, accProjectId, accLineage (item URN), accVersion (version URN)");
    console.groupEnd();
    return;
  }

  const requestPath = `${tandemBaseURL}/twins/${facilityURN}/docs`;
  console.log("Request:", requestPath);

  const bodyPayload = JSON.stringify({
    create: [{
      accAccountId: accAccountId,
      accProjectId: accProjectId,
      accLineage: accLineage,
      accVersion: accVersion,
      name: docName || 'Untitled Document'
    }]
  });
  console.log("Payload:", bodyPayload);

  try {
    const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
    const result = await response.json();
    
    if (response.ok) {
      console.log("✓ Document linked successfully");
      console.log("Result:", result);
    } else {
      console.error(`Error: ${response.status}`);
      console.log("Response:", result);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.groupEnd();
}

