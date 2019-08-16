// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const {
  Aborter,
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  AnonymousCredential,
  TokenCredential
} = require("@azure/storage-blob"); // Change to "@azure/storage-blob" in your package

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const HttpClient = require('azure-iot-device-http').Http;
const Client = require('azure-iot-device').Client;
const fs = require('fs');

/**
 * private
 */
function stat(filePath) {
  return new Promise((resolve, reject) => { 
    fs.stat(filePath, (err, fileStats) => {
      if (err) {
        reject(err);
      }
      resolve(fileStats);
    });
  });
} 

function main() {
  // Enter your storage account name and shared key
  const account = process.env.STORAGE_ACCOUNT;
  const accountKey = process.env.STORAGE_ACCOUNT_KEY;
  let deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
  let filePath = process.env.PATH_TO_FILE;
  let containerName = 'newblob' + new Date().getTime();
  let fstats;

  // connect to IoT Hub
  var client = Client.fromConnectionString(deviceConnectionString, Protocol);
  
  stat(filePath).then(fileStats => {
    console.log('filestats obtained.');
    fstats = fileStats;
    return testPromise = client.getStorageBlobSAS(containerName);
  }).then(blobInfo => {
    if (!blobInfo.hostName || !blobInfo.containerName || !blobInfo.blobName || !blobInfo.sasToken) {
      throw new errors.ArgumentError('Invalid upload parameters');
    }

    accountSas = blobInfo.sasToken;

    const pipeline = StorageURL.newPipeline(new AnonymousCredential(), {
      httpClient: HttpClient,
      retryOptions: { maxTries: 4 }
    });
    const serviceURL = new ServiceURL(
      `https://${account}.blob.core.windows.net${accountSas}`,
      pipeline
    );

    const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
    
    const blobName = "newblob" + new Date().getTime();
    const blobURL = BlobURL.fromContainerURL(containerURL, blobName);
    const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

    return uploadStreamToBlockBlob(
      Aborter.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
      fs.createReadStream(filePath),
      blockBlobURL,
      4 * 1024 * 1024,
      20,
      {
        progress: ev => console.log(ev)
      }
    );
    
  }).then(() => {
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
  }).then(() => {
    console.log("downloadBlobToBuffer success");
    fileStream.destroy();
  }).catch(err => {
    console.log(err.message);
  });
}


main()
