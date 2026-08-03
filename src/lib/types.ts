export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "INSTRUCTOR" | "STUDENT";
  approved: boolean;
  blocked: boolean;
  image: string | null;
  levelId?: string | null;
  level?: { id: string; name: string } | null;
};
