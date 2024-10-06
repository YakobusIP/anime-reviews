import { SORT_ORDER } from "@/lib/enums";
import {
  GenreEntityPartial,
  StudioEntityPartial,
  ThemeEntityPartial
} from "@/types/entity.type";

type AnimePostRequest = {
  malId: number;
  type: string;
  status: string;
  rating: string;
  season?: string | null;
  title: string;
  titleJapanese: string;
  titleSynonyms: string;
  source: string;
  aired: string;
  broadcast: string;
  episodesCount?: number | null;
  duration: string;
  score: number;
  images: {
    image_url: string;
    large_image_url?: string | null;
    small_image_url?: string | null;
  };
  genres: string[];
  studios: string[];
  themes: string[];
  episodes: AnimeEpisode[];
  synopsis: string;
  trailer?: string | null;
  malUrl: string;
  review?: string | null;
  storylineRating?: number | null;
  qualityRating?: number | null;
  voiceActingRating?: number | null;
  enjoymentRating?: number | null;
  personalScore?: number | null;
};

type AnimeDetail = Omit<AnimePostRequest, "genres" | "studios" | "themes"> & {
  id: number;
  genres: GenreEntityPartial[];
  studios: StudioEntityPartial[];
  themes: ThemeEntityPartial[];
};

type AnimeList = {
  id: number;
  title: string;
  titleJapanese: string;
  type: string;
  status: string;
  images: {
    image_url: string;
    large_image_url?: string | null;
    small_image_url?: string | null;
  };
  rating: string;
  score: number;
  personalScore: number | null;
};

type AnimeEpisode = {
  id?: number;
  aired: string;
  number: number;
  title: string;
  titleJapanese: string;
  titleRomaji: string;
};

type AnimeReview = Pick<
  AnimePostRequest,
  | "review"
  | "storylineRating"
  | "qualityRating"
  | "voiceActingRating"
  | "enjoymentRating"
  | "personalScore"
>;

type AnimeFilterSort = {
  sortBy: string;
  SORT_ORDER: SORT_ORDER;
  filterGenre?: number;
  filterStudio?: number;
  filterTheme?: number;
  filterMALScore?: string;
  filterPersonalScore?: string;
  filterType?: string;
};

export type {
  AnimePostRequest,
  AnimeDetail,
  AnimeList,
  AnimeReview,
  AnimeFilterSort
};
