import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthorService } from "./author.service";
import { GenreService } from "./genre.service";
import { ThemeService } from "./theme.service";

type CustomMangaCreateInput = Omit<
  Prisma.MangaCreateInput,
  "authors" | "genres" | "themes"
> & {
  authors: string[];
  genres: string[];
  themes: string[];
};

type CustomMangaReviewUpdateInput = Pick<
  Prisma.MangaUpdateInput,
  | "review"
  | "storylineRating"
  | "artStyleRating"
  | "charDevelopmentRating"
  | "worldBuildingRating"
  | "originalityRating"
  | "personalScore"
>;

export class MangaService {
  private static readonly scoringWeight = {
    storylineRating: 0.3,
    artStyleRating: 0.25,
    charDevelopmentRating: 0.2,
    worldBuildingRating: 0.15,
    originalityRating: 0.1
  };

  constructor(
    private readonly authorService: AuthorService,
    private readonly genreService: GenreService,
    private readonly themeService: ThemeService
  ) {}

  private validatePersonalScore(data: CustomMangaCreateInput) {
    const {
      storylineRating,
      artStyleRating,
      charDevelopmentRating,
      worldBuildingRating,
      originalityRating,
      personalScore
    } = data;

    if (
      storylineRating &&
      artStyleRating &&
      charDevelopmentRating &&
      worldBuildingRating &&
      originalityRating &&
      personalScore
    ) {
      const calculatedScore =
        storylineRating * MangaService.scoringWeight.storylineRating +
        artStyleRating * MangaService.scoringWeight.artStyleRating +
        charDevelopmentRating *
          MangaService.scoringWeight.charDevelopmentRating +
        worldBuildingRating * MangaService.scoringWeight.worldBuildingRating +
        originalityRating * MangaService.scoringWeight.originalityRating;

      return calculatedScore;
    }

    return null;
  }

  async getAllMangas(
    currentPage: number,
    limitPerPage: number,
    query?: string,
    sortBy?: string,
    sortOrder?: Prisma.SortOrder,
    filterAuthor?: string,
    filterGenre?: string,
    filterTheme?: string,
    filterMALScore?: string,
    filterPersonalScore?: string
  ) {
    const lowerCaseQuery = query && query.toLowerCase();
    const scoreRanges: Record<string, { min: number; max: number }> = {
      poor: { min: 1, max: 3.99 },
      average: { min: 4, max: 6.99 },
      good: { min: 7, max: 8.99 },
      excellent: { min: 9, max: 10 }
    };

    const filterCriteria: Prisma.MangaWhereInput = {
      AND: [
        {
          OR: [
            {
              title: {
                contains: lowerCaseQuery,
                mode: "insensitive"
              }
            },
            {
              titleSynonyms: {
                contains: lowerCaseQuery,
                mode: "insensitive"
              }
            }
          ]
        },
        ...(filterAuthor ? [{ authors: { some: { id: filterAuthor } } }] : []),
        ...(filterGenre ? [{ genres: { some: { id: filterGenre } } }] : []),
        ...(filterTheme ? [{ themes: { some: { id: filterTheme } } }] : []),
        ...(filterMALScore
          ? [
              {
                score: {
                  gte: scoreRanges[filterMALScore].min,
                  lte: scoreRanges[filterMALScore].max
                }
              }
            ]
          : []),
        ...(filterPersonalScore
          ? [
              {
                personalScore: {
                  gte: scoreRanges[filterPersonalScore].min,
                  lte: scoreRanges[filterPersonalScore].max
                }
              }
            ]
          : [])
      ]
    };

    const itemCount = await prisma.manga.count({
      where: filterCriteria
    });

    const pageCount = Math.ceil(itemCount / limitPerPage);

    const data = await prisma.manga.findMany({
      where: filterCriteria,
      select: {
        id: true,
        title: true,
        titleJapanese: true,
        images: true,
        status: true,
        score: true,
        progressStatus: true,
        personalScore: true
      },
      orderBy: {
        title: sortBy === "title" ? sortOrder : undefined,
        score: sortBy === "score" ? sortOrder : undefined
      },
      take: limitPerPage,
      skip: (currentPage - 1) * limitPerPage
    });

    return {
      data,
      metadata: {
        currentPage,
        limitPerPage,
        pageCount,
        itemCount
      }
    };
  }

  async getMangaById(id: string) {
    return prisma.manga.findUnique({
      where: { id },
      include: {
        authors: { select: { id: true, name: true } },
        genres: { select: { id: true, name: true } },
        themes: { select: { id: true, name: true } }
      }
    });
  }

  async createManga(data: CustomMangaCreateInput) {
    const authorIds = await Promise.all(
      data.authors.map(async (name) => {
        const id = await this.authorService.getOrCreateAuthor(name);
        return { id } as Prisma.AuthorWhereUniqueInput;
      })
    );
    const genreIds = await Promise.all(
      data.genres.map(async (name) => {
        const id = await this.genreService.getOrCreateGenre(name);
        return { id } as Prisma.GenreWhereUniqueInput;
      })
    );
    const themeIds = await Promise.all(
      data.themes.map(async (name) => {
        const id = await this.themeService.getOrCreateTheme(name);
        return { id } as Prisma.ThemeWhereUniqueInput;
      })
    );

    const mangaData: Prisma.MangaCreateInput = {
      ...data,
      authors: { connect: authorIds },
      genres: { connect: genreIds },
      themes: { connect: themeIds }
    };

    const calculatedPersonalScore = this.validatePersonalScore(data);

    if (
      !calculatedPersonalScore ||
      Math.abs(calculatedPersonalScore - (data.personalScore as number)) > 0.001
    ) {
      console.warn("Arriving MANGA personal score calculation is incorrect");
      mangaData.personalScore = calculatedPersonalScore;
    }

    return prisma.manga.create({ data: mangaData });
  }

  async updateManga(id: string, data: Prisma.MangaUpdateInput) {
    return prisma.manga.update({ where: { id }, data });
  }

  async updateMangaReview(id: string, data: CustomMangaReviewUpdateInput) {
    return prisma.manga.update({ where: { id }, data });
  }

  async updateMangaProgressStatus(
    id: string,
    data: Pick<Prisma.MangaUpdateInput, "progressStatus">
  ) {
    return prisma.manga.update({
      where: { id },
      data
    });
  }

  async deleteManga(id: string) {
    return prisma.manga.delete({ where: { id } });
  }

  async deleteMultipleMangas(ids: string[]) {
    return prisma.manga.deleteMany({ where: { id: { in: ids } } });
  }
}
