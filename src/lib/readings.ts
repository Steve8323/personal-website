export type Reading = {
  title: string;
  author: string;
  link?: string;
  category: "book" | "paper" | "essay" | "talk";
  note: string;
};

export const readings: Reading[] = [
  {
    title: "All-optical machine learning using diffractive deep neural networks",
    author: "Lin et al., Science 2018",
    link: "https://www.science.org/doi/10.1126/science.aat8084",
    category: "paper",
    note: "The foundational D2NN paper. Worth reading slowly — the implications take time to land.",
  },
  {
    title: "The Idea Factory",
    author: "Jon Gertner",
    category: "book",
    note: "On Bell Labs. A reminder that ambitious research environments are made, not found.",
  },
  {
    title: "You and Your Research",
    author: "Richard Hamming",
    link: "https://www.cs.virginia.edu/~robins/YouAndYourResearch.html",
    category: "talk",
    note: "I re-read this every year or so. Still hits.",
  },
];
