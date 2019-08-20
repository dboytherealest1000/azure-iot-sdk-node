// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const {
  AnonymousCredential,
  uploadStreamToBlockBlob,
  uploadFileToBlockBlob,
  Aborter, 
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
} = require("@azure/storage-blob"); // Change to "@azure/storage-blob" in your package

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const HttpClient = require('azure-iot-device-http').Http;
const Client = require('azure-iot-device').Client;
const fs = require('fs');

const account = process.env.STORAGE_ACCOUNT;
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
const localFilePath = process.env.PATH_TO_FILE;
const sasToken = process.env.SAS_TOKEN;
const blobName = "newblob" + new Date().getTime();
let fstats;
if (!account || ! deviceConnectionString || !localFilePath) {
  throw new errors.ArgumentError('Invalid Environment Variables');
}

/**
 * private
 */
function stat(localFilePath) {
  return new Promise((resolve, reject) => { 
    fs.stat(localFilePath, (err, fileStats) => {
      if (err) {
        reject(err);
      }
      resolve(fileStats);
    });
  });
} 


async function storageBlobSAS() {
  // connect to IoT Hub
  var client = Client.fromConnectionString(deviceConnectionString, Protocol);  
  return client.getStorageBlobSAS(blobName);
}


async function uploadBlob(blobInfo) {
  if (!blobInfo.hostName || !blobInfo.containerName || !blobInfo.blobName || !blobInfo.sasToken) {
    throw new errors.ArgumentError('Invalid upload parameters');
  }
  const pipeline = StorageURL.newPipeline(new AnonymousCredential(), {
    // httpClient: HttpClient,
    retryOptions: { maxTries: 4 },
    telemetry: { value: "HighLevelSample V1.0.0" }, // Customized telemetry string
    keepAliveOptions: {
      // Keep alive is enabled by default, disable keep alive by setting false
      enable: false
    }
  });
  const serviceURL = new ServiceURL(
    `https://${account}.blob.core.windows.net/${blobInfo.sasToken}`,
    pipeline
  );  

  // create a container
  const containerName = `newcontainer${new Date().getTime()}`;
  const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
  await containerURL.create(Aborter.none);
  // create a blob
  const blobURL = BlobURL.fromContainerURL(containerURL, blobName);
  const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);
  // parallel uploading
  await uploadFileToBlockBlob(Aborter.none, localFilePath, blockBlobURL, {
    blockSize: 4 * 1024 * 1024, // 4MB block size
    parallelism: 20, // 20 concurrency
    progress: ev => console.log(ev)
  });
  console.log('finished upload file to block blob');
}

storageBlobSAS()
  .then((blobInfo) => uploadBlob(blobInfo))
  .then(() => {
    console.log("uploadFileToBlockBlob success");
    const fileSize = fs.statSync(localFilePath).size;
    const buffer = Buffer.alloc(fileSize);
    return downloadBlobToBuffer(
      Aborter.timeout(30 * 60 * 1000),
      buffer,
      blockBlobURL,
      0,
      undefined,
      {
        blockSize: 4 * 1024 * 1024, // 4MB block size
        parallelism: 20, // 20 concurrency
        progress: ev => console.log(ev)
      }
    );    
  })
  .then(() => {
    console.log("downloadBlobToBuffer success");
    fileStream.destroy();
  })
  .catch(err => {
    console.log(err.message);
  });
