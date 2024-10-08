import { Checkbox } from "@/components/ui/checkbox";
import { LightNovelList } from "@/types/lightnovel.type";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import ProgressStatus from "@/components/admin/ProgressStatus";
import { updateLightNovelProgressStatusService } from "@/services/lightnovel.service";

export const lightNovelColumns: ColumnDef<LightNovelList>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: "auto" as unknown as number,
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const data = row.original;
      const image_url = data.images.image_url;
      const title = data.title;
      const title_japanese = data.titleJapanese;

      return (
        <div className="flex gap-2 items-center">
          <img src={image_url ?? undefined} width="50" height="74" />
          <div className="flex flex-col">
            <p className="font-bold">{title}</p>
            <p className="text-muted-foreground">{title_japanese}</p>
          </div>
        </div>
      );
    },
    size: 300
  },
  {
    accessorKey: "status",
    header: "Status",
    size: "auto" as unknown as number
  },
  {
    accessorKey: "progressStatus",
    header: "Progress Status",
    cell: ({ row }) => {
      const lightNovel = row.original;
      return (
        <ProgressStatus
          id={lightNovel.id}
          progressStatus={lightNovel.progressStatus}
          serviceFn={updateLightNovelProgressStatusService}
        />
      );
    },
    size: "auto" as unknown as number
  },
  {
    accessorKey: "score",
    header: "Score",
    size: "auto" as unknown as number
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const lightNovel = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link to={"lightnovel/" + lightNovel.id}>
              <DropdownMenuItem>View details</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: "auto" as unknown as number
  }
];
