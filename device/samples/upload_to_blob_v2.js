// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// UPLOAD TO BLOB SAMPLE 
// This is the new api for upload to blob. While before the upload to blob task was abstracted as a 
// single API call, this API removes the Azure Storage Blob package from within the Node.js Client Library
// and instead exposes two new APIs: 
//
// uploadToBlobV2GetStorageBlobSAS 
// > Using a HTTP POST, retrieve a SAS Token for the Storage Account linked to your IoT Hub.
//
// uploadToBlobV2NotifyBlobUploadComplete
// > Using HTTP POST, notify IoT Hub of the status of a finished file upload (success/failure).
// 
// More information on Uploading Files with IoT Hub can be found here:
// https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload


'use strict';

const {
  AnonymousCredential,
  uploadStreamToBlockBlob,
  Aborter, 
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
} = require("@azure/storage-blob"); // Make sure @azure/storage-blob is installed via npm

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const fs = require('fs');

// make sure you set these environment variables prior to running the sample.
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
const localFilePath = process.env.PATH_TO_FILE;
const blobName = 'testblob.txt';


// helper function 
function getFileStats(localFilePath) {
  return new Promise((resolve, reject) => { 
    fs.stat(localFilePath, (err, fileStats) => {
      if (err) {
        reject(err);
      }
      resolve(fileStats);
    });
  });
} 

async function uploadToBlob(localFilePath, client) {
  // OUR CODE
  let blobInfo = await client.uploadToBlobV2GetStorageBlobSAS(blobName);
  if (!blobInfo) {
    throw new errors.ArgumentError('Invalid upload parameters');
  }

  // STORAGE BLOB CODE
  const pipeline = StorageURL.newPipeline(new AnonymousCredential(), {
    retryOptions: { maxTries: 4 },
    telemetry: { value: 'HighLevelSample V1.0.0' }, // Customized telemetry string
    keepAliveOptions: {
      enable: false
    }
  });

  const serviceURL = new ServiceURL(
    `https://${blobInfo.hostName}/${blobInfo.sasToken}`,
    pipeline
  );  

  // initialize the blockBlobURL to a new blob
  const containerURL = ContainerURL.fromServiceURL(serviceURL, blobInfo.containerName);
  const blobURL = BlobURL.fromContainerURL(containerURL, blobInfo.blobName);
  const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

  // get file stats
  let fileStats = await getFileStats(localFilePath);

  // parallel uploading
  let uploadStatus = await uploadStreamToBlockBlob(
    Aborter.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
    fs.createReadStream(localFilePath),
    blockBlobURL,
    4 * 1024 * 1024, // 4MB block size
    20, // 20 concurrency
    {
      progress: ev => console.log(ev)
    }
    );
    console.log('uploadStreamToBlockBlob success');
    // END STORAGE CODE

    // notify IoT Hub of upload to blob status (success/faillure)
    await client.uploadToBlobV2NotifyBlobUploadComplete(uploadStatus);
    return 0;
}

uploadToBlob(localFilePath, Client.fromConnectionString(deviceConnectionString, Protocol))
  .catch((err) => {
    return new Error(err);
  });

