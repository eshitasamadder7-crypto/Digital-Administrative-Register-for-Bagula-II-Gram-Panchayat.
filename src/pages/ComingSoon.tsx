import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Fallback for office features that are planned but not built yet.
 * Nothing in the portal should ever dead-end on a 404.
 */
export default function ComingSoon({ feature }: { feature?: string }) {
  const location = useLocation();
  const name = feature ?? decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() ?? "This feature");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl" aria-hidden>🚧</div>
      <h1 className="text-xl font-semibold">Coming Soon</h1>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium capitalize">{name}</span> is planned for a future release of the
        Bagula II Gram Panchayat portal. Nothing is broken — this part of the office workflow simply
        isn't switched on yet.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline"><Link to="/admin/dashboard">🏠 Office dashboard</Link></Button>
        <Button asChild><Link to="/">Home</Link></Button>
      </div>
    </div>
  );
}
