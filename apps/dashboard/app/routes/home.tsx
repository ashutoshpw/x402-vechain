import type { Route } from "./+types/home";
import { useAuth } from "~/lib/auth";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function Home({ }: Route.ComponentProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  );
}