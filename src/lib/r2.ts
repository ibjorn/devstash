import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Short: the browser starts the PUT immediately after asking for the URL
const UPLOAD_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | undefined;

// Lazy, for the same reason src/lib/email/resend.ts is: building the client at
// module scope would make every build depend on R2 credentials being present.
function getClient(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY",
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // The SDK adds CRC32 checksums to every PUT by default, which a presigned
    // URL can't carry — the browser's upload would be rejected. Only send them
    // where an operation actually requires one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2 is not configured: R2_BUCKET_NAME");
  return name;
}

/**
 * A URL the browser can PUT one object to. Content-Length and Content-Type are
 * both forced into the signature — the presigner leaves Content-Type unsigned
 * by default — so the upload has to be exactly the size and type that were
 * validated. The create action still re-checks the stored size, and the proxy
 * still picks the served type itself; the signature is the first line, not
 * the only one.
 */
export async function createUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-length", "content-type"]),
    },
  );
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    (error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata.httpStatusCode === 404)
  );
}

/** The stored size of an object, or null if there is no such object. */
export async function getObjectSize(key: string): Promise<number | null> {
  try {
    const head = await getClient().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return head.ContentLength ?? null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** The object's body as a web stream, or null if there is no such object. */
export async function getObjectStream(
  key: string,
): Promise<{ body: ReadableStream; size: number | undefined } | null> {
  try {
    const object = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    if (!object.Body) return null;
    return {
      body: object.Body.transformToWebStream(),
      size: object.ContentLength,
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}

/** Delete every object under a prefix, a page of up to 1000 at a time. */
export async function deleteObjectsWithPrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (page.Contents ?? []).flatMap((object) =>
      object.Key ? [{ Key: object.Key }] : [],
    );
    if (keys.length > 0) {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys, Quiet: true },
        }),
      );
      deleted += keys.length;
    }

    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deleted;
}
