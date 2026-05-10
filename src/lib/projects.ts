export type Project = {
  slug: string;
  title: string;
  year: string;
  summary: string;
  description?: string;
  link?: { href: string; label: string };
  tags?: string[];
};

export const projects: Project[] = [
  {
    slug: "d2nn",
    title: "Diffractive Deep Neural Networks",
    year: "2026",
    summary:
      "Training neural networks where the weights are physical diffractive layers — light propagates through them and the output is read off a sensor.",
    description:
      "Working on gradient-based training methods for D2NN architectures. Exploring how to make these systems more trainable end-to-end and how their behavior diverges from classical deep nets.",
    tags: ["photonics", "ML", "research"],
  },
  {
    slug: "placeholder-2",
    title: "Another project",
    year: "2025",
    summary:
      "A short summary of the project — what it does, why you built it, and what was interesting about it.",
    description:
      "Edit src/lib/projects.ts to replace this with a real entry.",
    tags: ["edit-me"],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
