declare module "@azure/storage-blob" {
  export class StorageSharedKeyCredential {
    constructor(accountName: string, accountKey: string);
  }

  export interface BlobHTTPHeaders {
    blobContentType?: string;
  }

  export interface BlockBlobParallelUploadOptions {
    blobHTTPHeaders?: BlobHTTPHeaders;
  }

  export class BlockBlobClient {
    readonly url: string;
    uploadData(
      data: Buffer,
      options?: BlockBlobParallelUploadOptions
    ): Promise<unknown>;
  }

  export class ContainerClient {
    createIfNotExists(): Promise<unknown>;
    getBlockBlobClient(blobName: string): BlockBlobClient;
  }

  export class BlobServiceClient {
    constructor(url: string, credential?: StorageSharedKeyCredential);
    static fromConnectionString(connectionString: string): BlobServiceClient;
    getContainerClient(containerName: string): ContainerClient;
  }
}
