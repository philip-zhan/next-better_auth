const site_url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const site = {
  name: "Next Gym",
  description: "A place to practice Next.js and have fun",
  url: site_url,
  ogImage: `${site_url}/og.jpg`,
  logo: "/logo.svg",
  mailSupport: "hello@domain.com", // Support email address
  mailFrom: process.env.MAIL_FROM || "noreply@domain.com", // Transactional email address
  links: {
    github: "https://github.com/philip-zhan/next-gym",
  },
} as const;
