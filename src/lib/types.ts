export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "INSTRUCTOR" | "STUDENT";
  image: string | null;
  levelId?: string | null;
  level?: { id: string; name: string } | null;
};
