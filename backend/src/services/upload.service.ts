import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateFilename } from "../utils/generateFilename";
import { bucket } from "../lib/storage";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { env } from "../lib/env";
import path from "path";
import { MEDIA_TYPE } from "../enum/general.enum";
import {
  BadRequestError,
  FileStorageError,
  InternalServerError,
  NotFoundError,
  PrismaUniqueError
} from "../lib/error";

export class UploadService {
  private async saveImageToDatabase(
    uuid: string,
    url: string,
    type: MEDIA_TYPE,
    entityId: string
  ) {
    try {
      const data: Prisma.ReviewImageCreateInput = { id: uuid, url };

      switch (type) {
        case MEDIA_TYPE.ANIME:
          data.anime = { connect: { id: entityId } };
          break;
        case MEDIA_TYPE.MANGA:
          data.manga = { connect: { id: entityId } };
          break;
        case MEDIA_TYPE.LIGHT_NOVEL:
          data.lightNovel = { connect: { id: entityId } };
          break;
        default:
          throw new BadRequestError("Invalid media type!");
      }

      return await prisma.reviewImage.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new PrismaUniqueError("URL already exists!");
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestError("Invalid request body!");
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    type: MEDIA_TYPE,
    entityId: string
  ) {
    try {
      const [uuid, filename] = generateFilename(file.originalname);
      const filePath = `review-image/${filename}`;

      if (env.NODE_ENV === "production") {
        const blob = bucket.file(filePath);
        const blobStream = blob.createWriteStream({
          resumable: false,
          contentType: file.mimetype,
          public: true
        });

        await new Promise<void>((resolve, reject) => {
          blobStream.on("error", (error) =>
            reject(new FileStorageError(error.message))
          );
          blobStream.on("finish", () => resolve());
          blobStream.end(file.buffer);
        });
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        return await this.saveImageToDatabase(uuid, publicUrl, type, entityId);
      } else {
        const localPath = path.join(__dirname, env.LOCAL_UPLOAD_PATH, filename);

        try {
          writeFileSync(localPath, file.buffer);
        } catch (error) {
          throw new FileStorageError((error as Error).message);
        }

        const url = `http://localhost:${env.PORT}/uploads/${filename}`;
        return await this.saveImageToDatabase(uuid, url, type, entityId);
      }
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof FileStorageError
      ) {
        throw error;
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async deleteImage(id: string) {
    try {
      const reviewImage = await prisma.reviewImage.findUnique({
        where: { id }
      });

      if (!reviewImage) {
        throw new NotFoundError("Image not found!");
      }

      const urlParts = reviewImage.url.split("/");
      const filename = urlParts[urlParts.length - 1];

      if (env.NODE_ENV === "production") {
        const file = bucket.file(filename);
        try {
          await file.delete();
        } catch (error) {
          throw new FileStorageError((error as Error).message);
        }
      } else {
        const localPath = path.join(__dirname, env.LOCAL_UPLOAD_PATH, filename);
        try {
          if (existsSync(localPath)) {
            unlinkSync(localPath);
          } else {
            await prisma.errorLog.create({
              data: {
                message: "Local image file not found",
                type: "WARN",
                route: "UploadService.deleteImage",
                timestamp: new Date()
              }
            });
          }
        } catch (error) {
          throw new FileStorageError((error as Error).message);
        }
      }

      await prisma.reviewImage.delete({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof FileStorageError) {
        throw error;
      }

      throw new InternalServerError((error as Error).message);
    }
  }
}
