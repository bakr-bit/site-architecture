import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Helper: upsert a page and return it */
async function upsertPage(
  projectId: string,
  data: {
    url: string;
    userDescription: string;
    metaTitle: string;
    metaDescription: string;
    keyword: string;
    pageType: string;
    level: number;
    position: number;
    parentId: string | null;
  }
) {
  return prisma.page.upsert({
    where: { projectId_url: { projectId, url: data.url } },
    update: {},
    create: { projectId, ...data },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "accounts@bakersfield.ae";
  const password = process.env.ADMIN_PASSWORD || "SandSkier3000!!";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Admin" },
  });
  console.log(`Admin user created/updated: ${user.email}`);

  // Create sample project
  const project = await prisma.project.upsert({
    where: { domain: "example.com" },
    update: {},
    create: {
      name: "Example Site",
      domain: "example.com",
      description: "A demo website project for testing Site Architect",
    },
  });
  console.log(`Sample project created: ${project.name}`);

  const pid = project.id;
  let pos = 0;

  // ── Root pages ────────────────────────────────────────────────
  const home = await upsertPage(pid, {
    url: "/",
    userDescription: "Main landing page",
    metaTitle: "Example Site - Your Trusted Source",
    metaDescription: "Welcome to Example Site, your trusted source for everything.",
    keyword: "example site",
    pageType: "Home Page",
    level: 0, position: pos++, parentId: null,
  });

  const about = await upsertPage(pid, {
    url: "/about-us",
    userDescription: "Company background, team and mission statement",
    metaTitle: "About Us - Example Site",
    metaDescription: "Learn who we are, our story, and why millions trust Example Site.",
    keyword: "about us",
    pageType: "Standard Page",
    level: 0, position: pos++, parentId: null,
  });

  const contact = await upsertPage(pid, {
    url: "/contact",
    userDescription: "Contact form and support channels",
    metaTitle: "Contact Us - Example Site",
    metaDescription: "Get in touch with our support team via live chat, email, or phone.",
    keyword: "contact us",
    pageType: "Contact Page",
    level: 0, position: pos++, parentId: null,
  });

  // ── Blog ──────────────────────────────────────────────────────
  const blog = await upsertPage(pid, {
    url: "/blog",
    userDescription: "Blog listing / news hub",
    metaTitle: "Blog - Example Site",
    metaDescription: "Read the latest articles, guides and industry news.",
    keyword: "blog",
    pageType: "Index Page",
    level: 0, position: pos++, parentId: null,
  });

  await upsertPage(pid, {
    url: "/blog/getting-started-guide",
    userDescription: "Beginner-friendly walkthrough",
    metaTitle: "Getting Started Guide - Example Site Blog",
    metaDescription: "Everything you need to know to get up and running.",
    keyword: "getting started guide",
    pageType: "Blog Post",
    level: 1, position: pos++, parentId: blog.id,
  });

  await upsertPage(pid, {
    url: "/blog/tips-and-strategies",
    userDescription: "Advanced tips and strategies article",
    metaTitle: "Tips & Strategies - Example Site Blog",
    metaDescription: "Expert tips and strategies to get the most from our platform.",
    keyword: "tips and strategies",
    pageType: "Blog Post",
    level: 1, position: pos++, parentId: blog.id,
  });

  // ── Promotions / Offers ───────────────────────────────────────
  const promos = await upsertPage(pid, {
    url: "/promotions",
    userDescription: "Current promotions and bonus offers",
    metaTitle: "Promotions & Bonuses - Example Site",
    metaDescription: "Discover the latest promotions, welcome bonuses and special offers.",
    keyword: "promotions",
    pageType: "Index Page",
    level: 0, position: pos++, parentId: null,
  });

  await upsertPage(pid, {
    url: "/promotions/welcome-bonus",
    userDescription: "New user welcome bonus details",
    metaTitle: "Welcome Bonus - Example Site Promotions",
    metaDescription: "Sign up today and claim your exclusive welcome bonus.",
    keyword: "welcome bonus",
    pageType: "Landing Page",
    level: 1, position: pos++, parentId: promos.id,
  });

  // ── Help / FAQ ────────────────────────────────────────────────
  const help = await upsertPage(pid, {
    url: "/help",
    userDescription: "Help centre landing page",
    metaTitle: "Help Centre - Example Site",
    metaDescription: "Find answers to common questions and get support.",
    keyword: "help centre",
    pageType: "Index Page",
    level: 0, position: pos++, parentId: null,
  });

  await upsertPage(pid, {
    url: "/help/faq",
    userDescription: "Frequently asked questions",
    metaTitle: "FAQ - Example Site Help",
    metaDescription: "Quick answers to the most frequently asked questions.",
    keyword: "faq",
    pageType: "FAQ Page",
    level: 1, position: pos++, parentId: help.id,
  });

  await upsertPage(pid, {
    url: "/help/account-verification",
    userDescription: "KYC / account verification process",
    metaTitle: "Account Verification - Example Site Help",
    metaDescription: "Step-by-step guide to verifying your account.",
    keyword: "account verification",
    pageType: "Resource Page",
    level: 1, position: pos++, parentId: help.id,
  });

  await upsertPage(pid, {
    url: "/help/deposits-withdrawals",
    userDescription: "Payment methods, limits and processing times",
    metaTitle: "Deposits & Withdrawals - Example Site Help",
    metaDescription: "Everything about deposits, withdrawals, payment methods and limits.",
    keyword: "deposits withdrawals",
    pageType: "Resource Page",
    level: 1, position: pos++, parentId: help.id,
  });

  // ── Legal / Compliance ────────────────────────────────────────
  const legal = await upsertPage(pid, {
    url: "/legal",
    userDescription: "Legal information hub",
    metaTitle: "Legal - Example Site",
    metaDescription: "Legal documents, policies and regulatory information.",
    keyword: "legal",
    pageType: "Index Page",
    level: 0, position: pos++, parentId: null,
  });

  await upsertPage(pid, {
    url: "/legal/terms-and-conditions",
    userDescription: "Terms of service / terms and conditions",
    metaTitle: "Terms & Conditions - Example Site",
    metaDescription: "Read our full terms and conditions governing use of the platform.",
    keyword: "terms and conditions",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  await upsertPage(pid, {
    url: "/legal/privacy-policy",
    userDescription: "Privacy policy and data handling practices",
    metaTitle: "Privacy Policy - Example Site",
    metaDescription: "How we collect, use and protect your personal data.",
    keyword: "privacy policy",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  await upsertPage(pid, {
    url: "/legal/cookie-policy",
    userDescription: "Cookie policy and consent information",
    metaTitle: "Cookie Policy - Example Site",
    metaDescription: "Information about cookies we use and how to manage them.",
    keyword: "cookie policy",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  await upsertPage(pid, {
    url: "/legal/responsible-gambling",
    userDescription: "Responsible gambling policy, tools and self-exclusion",
    metaTitle: "Responsible Gambling - Example Site",
    metaDescription: "Our commitment to responsible gambling including deposit limits, self-exclusion and support resources.",
    keyword: "responsible gambling",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  await upsertPage(pid, {
    url: "/legal/aml-policy",
    userDescription: "Anti-money laundering policy",
    metaTitle: "AML Policy - Example Site",
    metaDescription: "Our anti-money laundering policy and compliance procedures.",
    keyword: "aml policy",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  await upsertPage(pid, {
    url: "/legal/licensing",
    userDescription: "Licensing and regulatory information",
    metaTitle: "Licensing - Example Site",
    metaDescription: "Details about our licences and regulatory compliance.",
    keyword: "licensing",
    pageType: "Standard Page",
    level: 1, position: pos++, parentId: legal.id,
  });

  console.log(`${pos} sample pages created with parentId hierarchy`);
  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
