import { Skeleton } from "@/components/ui/skeleton" // Assuming shadcn/ui skeleton

export default function SkeletonFileListItem() {
  return (
    <div className="flex items-center space-x-3 p-3">
      <Skeleton className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="flex-grow space-y-1.5">
        <Skeleton className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="hidden sm:flex items-center space-x-2">
        <Skeleton className="h-3 w-12 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}
