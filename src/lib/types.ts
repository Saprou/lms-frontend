export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "INSTRUCTOR" | "STUDENT";
  image: string | null;
};
