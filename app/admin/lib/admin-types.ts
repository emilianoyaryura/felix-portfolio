// Forma client-friendly de una foto para el admin (URLs ya resueltas).
export type AdminPhoto = {
  id: string;
  title: string;
  alt: string;
  tags: string[];
  inHome: boolean;
  homeOrder: number;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  thumbUrl: string;
  displayUrl: string;
};

export type HomeFilter = "all" | "home" | "out";
