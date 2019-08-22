// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { BlobUploadCommonResponseStub } from './../interfaces';

// import {
//   BlobUploadCommonResponse
// } from "@azure/storage-blob"; // Change to "@azure/storage-blob" in your package


export class BlobUploadResult2 {
  isSuccess: boolean;
  statusCode: number;
  statusDescription: string;

  constructor(isSuccess: boolean, statusCode: number, statusDescription: string) {
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_001: [The `isSuccess` parameter shall be assigned to the the `isSuccess` property of the newly created `BlobUploadResult2` instance.]*/
    this.isSuccess = isSuccess;
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_002: [The `statusCode` parameter shall be assigned to the the `statusCode` property of the newly created `BlobUploadResult2` instance.]*/
    this.statusCode = statusCode;
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_003: [The `statusDescription` parameter shall be assigned to the the `statusDescription` property of the newly created `BlobUploadResult2` instance.]*/
    this.statusDescription = statusDescription;
  }

  static fromAzureStorageCallbackArgs(uploadResponse: BlobUploadCommonResponseStub): BlobUploadResult2 {
    if (!uploadResponse) throw new ReferenceError('if err is null, body and response must be supplied');
    let uploadResult: BlobUploadResult2;
    if (uploadResponse.errorCode) {
      const statusCode = uploadResponse._response ? uploadResponse._response.status : -1;
      const statusDescription = uploadResponse._response ? uploadResponse._response.bodyAsText : "no status description";
      uploadResult = new BlobUploadResult2(false, statusCode, statusDescription);
    } else {
        if (uploadResponse._response.status >= 200 && uploadResponse._response.status < 300) {
          uploadResult = new BlobUploadResult2(true, uploadResponse._response.status, uploadResponse._response.bodyAsText);
        } else {
          uploadResult = new BlobUploadResult2(false, uploadResponse._response.status, uploadResponse._response.bodyAsText);
        }
    }

    return uploadResult;
  }
}