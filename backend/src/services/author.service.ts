import { Author, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  PrismaUniqueError
} from "../lib/error";

interface AuthorWithConnectedMediaCount extends Author {
  connectedMediaCount?: number;
}

export class AuthorService {
  async getAllAuthors(
    connected_media = false,
    currentPage?: number,
    limitPerPage?: number,
    query?: string
  ) {
    try {
      const lowerCaseQuery = query && query.toLowerCase();

      const filterCriteria: Prisma.AuthorWhereInput = {
        name: {
          contains: lowerCaseQuery,
          mode: "insensitive"
        }
      };

      const includeCount: Prisma.AuthorInclude = connected_media
        ? { _count: { select: { manga: true, lightNovel: true } } }
        : {};

      if (currentPage && limitPerPage) {
        const [itemCount, data] = await prisma.$transaction([
          prisma.author.count({ where: filterCriteria }),
          prisma.author.findMany({
            where: filterCriteria,
            take: limitPerPage,
            skip: (currentPage - 1) * limitPerPage,
            include: includeCount
          })
        ]);

        const pageCount = Math.ceil(itemCount / limitPerPage);

        const authorsWithCounts: AuthorWithConnectedMediaCount[] =
          connected_media
            ? data.map((author) => ({
                ...author,
                connectedMediaCount:
                  author._count.manga + author._count.lightNovel
              }))
            : data;

        return {
          data: authorsWithCounts,
          metadata: {
            currentPage,
            limitPerPage,
            pageCount,
            itemCount
          }
        };
      } else {
        const data = await prisma.author.findMany({
          where: filterCriteria,
          include: includeCount
        });

        const authorsWithCounts: AuthorWithConnectedMediaCount[] =
          connected_media
            ? data.map((author) => ({
                ...author,
                connectedMediaCount:
                  author._count.manga + author._count.lightNovel
              }))
            : data;

        return authorsWithCounts;
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestError("Invalid request parameters!");
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async getAuthor(name: string) {
    try {
      return await prisma.author.findFirst({
        where: { name: { equals: name, mode: "insensitive" } }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError((error as Error).message);
    }
  }

  async createAuthor(data: Prisma.AuthorCreateInput) {
    try {
      return await prisma.author.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new PrismaUniqueError("Author already exists!");
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestError("Invalid request body!");
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async getOrCreateAuthor(name: string) {
    let author = await this.getAuthor(name);
    if (!author) {
      author = await this.createAuthor({ name });
    }
    return author.id;
  }

  async updateAuthor(id: string, data: Prisma.AuthorUpdateInput) {
    try {
      return await prisma.author.update({ where: { id }, data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Author not found!");
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestError("Invalid request body!");
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async deleteAuthor(id: string) {
    try {
      return await prisma.author.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Author not found!");
      }

      throw new InternalServerError((error as Error).message);
    }
  }

  async deleteMultipleAuthors(ids: string[]) {
    try {
      return await prisma.author.deleteMany({ where: { id: { in: ids } } });
    } catch (error) {
      throw new InternalServerError((error as Error).message);
    }
  }
}
