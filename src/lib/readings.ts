export type Reading = {
  title?: string;
  author?: string;
  link?: string;
  category: string;
  note?: string;
};

export const readings: Reading[] = [
  {
    title: "All-optical machine learning using diffractive deep neural networks",
    author: "Lin et al., Science 2018",
    link: "https://www.science.org/doi/10.1126/science.aat8084",
    category: "AI",
    note: "The foundational D2NN paper. Worth reading slowly — the implications take time to land.",
  },
  {
    title: "The Idea Factory",
    author: "Jon Gertner",
    category: "My Love",
    note: "On Bell Labs. A reminder that ambitious research environments are made, not found.",
  },
  {
    title: "You and Your Research",
    author: "Richard Hamming",
    link: "https://www.cs.virginia.edu/~robins/YouAndYourResearch.html",
    category: "My Love",
    note: "I re-read this every year or so. Still hits.",
  },
];

export const DEFAULT_CATEGORY_ORDER: string[] = ["Life", "AI", "My Love"];
