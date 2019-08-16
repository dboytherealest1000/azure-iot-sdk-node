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
const Client = require('azure-iot-device').Client;
const fs = require('fs');

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

async function main() {
  // Enter your storage account name and shared key
  const account = process.env.STORAGE_ACCOUNT;
  const accountKey = process.env.STORAGE_ACCOUNT_KEY;
  var deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
  var filePath = process.env.PATH_TO_FILE;

  // connect to IoT Hub
  var client = Client.fromConnectionString(deviceConnectionString, Protocol);
  
  stat(filePath).then(fileStats => {
    console.log('filestats obtained.');
    var fileStream = fs.createReadStream(filePath);
    return client.getStorageBlobSharedAccessSignature(blobName);
  }).then((err, blobInfo) => {
    if (!blobInfo.hostName || !blobInfo.containerName || !blobInfo.blobName || !blobInfo.sasToken) {
      throw new errors.ArgumentError('Invalid upload parameters');
    }
    const pipeline = StorageURL.newPipeline(blobInfo.sasToken);
    const serviceURL = new ServiceURL();
  }).then(() => {
    fileStream.destroy();
  });
  fs.stat(filePath, function (err, fileStats) {
    var fileStream = fs.createReadStream(filePath);

    client.uploadToBlob('testblob.txt', fileStream, fileStats.size, function (err, result) {
      if (err) {
        console.error('error uploading file: ' + err.constructor.name + ': ' + err.message);
      } else {
        console.log('Upload successful - ' + result);
      }
      fileStream.destroy();
    });
  });

  // Get blob content from position 0 to the end
  // In Node.js, get downloaded data by accessing downloadBlockBlobResponse.readableStreamBody
  // In browsers, get downloaded data by accessing downloadBlockBlobResponse.blobBody
  const downloadBlockBlobResponse = await blobURL.download(Aborter.none, 0);
  console.log(
    "Downloaded blob content",
    await streamToString(downloadBlockBlobResponse.readableStreamBody)
  );

  // Delete container
  await containerURL.delete(Aborter.none);

  console.log("deleted container");
}

// A helper method used to read a Node.js readable stream into string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", data => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}

// An async method returns a Promise object, which is compatible with then().catch() coding style.
main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch(err => {
    console.log(err.message);
  });