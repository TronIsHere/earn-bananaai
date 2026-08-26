import { Suspense } from "react";
import PostsPage from "./posts-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-brand">
          در حال بارگذاری...
        </div>
      }
    >
      <PostsPage />
    </Suspense>
  );
}
