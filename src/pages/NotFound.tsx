import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { GoBackButton } from "@/components/GoBackButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-sm w-full">
        <div className="w-16 h-1 bg-saffron mx-auto mb-6 rounded-full" />
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <div className="flex items-center justify-center gap-3">
          <GoBackButton fallbackUrl="/" label="Go Back" variant="outline" size="default" />
          <a href="/" className="gov-btn-primary inline-block">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
