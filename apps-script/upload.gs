/**
 * Google Apps Script for Sspacia CLM
 * Deployment: Deploy as Web App, Execute as "Me", Access "Anyone"
 * 
 * This script handles PDF generation from HTML and uploads them to Google Drive.
 */

const AUTH_TOKEN = "6869ff576b8b0e210637b6a57afd39449c0abbc730fc07d09c626598d77b597c";

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // 1. Authenticate
    if (postData.token !== AUTH_TOKEN) {
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }

    const action = postData.action;

    // 2. Handle Actions
    if (action === "uploadPDF") {
      const { fileName, fileData, folderId, mimeType } = postData;
      
      if (!fileName || !fileData) {
        return jsonResponse({ success: false, message: "fileName and fileData (base64) are required" }, 400);
      }

      // Create blob from base64
      const blob = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType || "application/pdf", fileName);
      
      // Select Folder
      let folder;
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }

      // Create file in Drive
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return jsonResponse({
        success: true,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      });
    }

    if (action === "generatePDF") {
      const { filename, htmlContent, folderId } = postData;
      
      if (!filename || !htmlContent) {
        return jsonResponse({ success: false, message: "Filename and htmlContent are required" }, 400);
      }

      // Convert HTML to PDF blob
      const blob = Utilities.newBlob(htmlContent, "text/html", filename).getAs("application/pdf");
      
      // Select Folder
      let folder;
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }

      // Create file in Drive
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return jsonResponse({
        success: true,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      });
    }

    return jsonResponse({ success: false, message: "Invalid action: " + action }, 400);

  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
