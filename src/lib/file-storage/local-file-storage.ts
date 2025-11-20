import path from "node:path";
import { promises as fs } from "node:fs";
import { FileNotFoundError } from "lib/errors";
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
} from "./file-storage.interface";
import {
  getContentTypeFromFilename,
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
} from "./storage-utils";
import { generateUUID } from "lib/utils";

const STORAGE_PREFIX = resolveStoragePrefix();

const LOCAL_ROOT = path.resolve(
  process.env.LOCAL_FILE_STORAGE_DIR ?? path.join(process.cwd(), "public"),
);

const PUBLIC_BASE_URL =
  process.env.LOCAL_FILE_STORAGE_BASE_URL?.replace(/\/+$/, "") ?? "";

const buildKey = (filename: string) => {
  const safeName = sanitizeFilename(filename);
  const id = generateUUID();
  return STORAGE_PREFIX
    ? path.posix.join(STORAGE_PREFIX, `${id}-${safeName}`)
    : `${id}-${safeName}`;
};

const normalizeKey = (key: string) => {
  return key
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "..")
    .join("/");
};

const keyToAbsolutePath = (key: string) => {
  const normalized = normalizeKey(key);
  return path.join(LOCAL_ROOT, normalized);
};

const metadataPathFor = (absolutePath: string) => `${absolutePath}.meta.json`;

const buildMetadata = (
  key: string,
  bufferSize: number,
  contentType: string,
): FileMetadata => ({
  key,
  filename: path.posix.basename(key),
  contentType,
  size: bufferSize,
  uploadedAt: new Date(),
});

const serializeMetadata = (metadata: FileMetadata) =>
  JSON.stringify(
    {
      ...metadata,
      uploadedAt: metadata.uploadedAt?.toISOString(),
    },
    null,
    2,
  );

const readMetadata = async (absolutePath: string, key: string) => {
  try {
    const raw = await fs.readFile(metadataPathFor(absolutePath), "utf8");
    const parsed = JSON.parse(raw) as FileMetadata & {
      uploadedAt?: string;
    };

    return {
      ...parsed,
      key,
      uploadedAt: parsed.uploadedAt ? new Date(parsed.uploadedAt) : undefined,
    } satisfies FileMetadata;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error as NodeJS.ErrnoException).code === "ENOTDIR"
    ) {
      return null;
    }
    throw error;
  }
};

const ensureDirectory = async (absolutePath: string) => {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
};

const buildPublicUrl = (key: string) => {
  const sanitized = normalizeKey(key);
  if (PUBLIC_BASE_URL) {
    return `${PUBLIC_BASE_URL}/${sanitized}`;
  }
  return `/${sanitized}`;
};

const readFileOrThrow = async (absolutePath: string, key: string) => {
  try {
    return await fs.readFile(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileNotFoundError(key, error);
    }
    throw error;
  }
};

export const createLocalFileStorage = (): FileStorage => {
  return {
    async upload(content, options: UploadOptions = {}) {
      const buffer = await toBuffer(content);
      const filename = options.filename ?? "file";
      const contentType =
        options.contentType || getContentTypeFromFilename(filename);
      const key = buildKey(filename);
      const absolutePath = keyToAbsolutePath(key);

      await ensureDirectory(absolutePath);
      await fs.writeFile(absolutePath, buffer);

      const metadata = buildMetadata(key, buffer.byteLength, contentType);
      await fs.writeFile(metadataPathFor(absolutePath), serializeMetadata(metadata));

      return {
        key,
        sourceUrl: buildPublicUrl(key),
        metadata,
      };
    },

    async createUploadUrl() {
      return null;
    },

    async download(key) {
      const absolutePath = keyToAbsolutePath(key);
      return readFileOrThrow(absolutePath, key);
    },

    async delete(key) {
      const absolutePath = keyToAbsolutePath(key);
      try {
        await fs.unlink(absolutePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      try {
        await fs.unlink(metadataPathFor(absolutePath));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },

    async exists(key) {
      const absolutePath = keyToAbsolutePath(key);
      try {
        await fs.access(absolutePath);
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return false;
        }
        throw error;
      }
    },

    async getMetadata(key) {
      const absolutePath = keyToAbsolutePath(key);
      return readMetadata(absolutePath, key);
    },

    async getSourceUrl(key) {
      const exists = await this.exists(key);
      if (!exists) {
        return null;
      }
      return buildPublicUrl(key);
    },

    async getDownloadUrl(key) {
      return this.getSourceUrl(key);
    },
  };
};


