import { siteConfig } from "../../../config/site";
import { seoConfig } from "../../../config/seo";
import { notFound } from "next/navigation";
import Image from "next/image";
import { FadeUp } from "../../../components/ui/fade-up";
import { SectionLabel } from "../../../components/ui/section-label";
import { StructuredData } from "../../../components/structured-data";
import { Calendar, Clock, ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = siteConfig.blog.posts.find((p) => p.id === slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | SSPACIA Blog`,
    description: post.excerpt,
    alternates: { canonical: `${seoConfig.baseUrl}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.image.src, alt: post.image.alt }],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = siteConfig.blog.posts.find((p) => p.id === slug);

  if (!post) {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "author": {
      "@type": "Organization",
      "name": post.author,
      "url": seoConfig.baseUrl,
    },
    "publisher": {
      "@type": "Organization",
      "name": "SSPACIA",
      "logo": {
        "@type": "ImageObject",
        "url": `${seoConfig.baseUrl}/SspaciaLogo.png`,
      },
    },
    "datePublished": post.date,
    "dateModified": post.date,
    "image": `${seoConfig.baseUrl}${post.image.src}`,
    "url": `${seoConfig.baseUrl}/blog/${post.id}`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${seoConfig.baseUrl}/blog/${post.id}`,
    },
  };

  // Get related posts (exclude current)
  const relatedPosts = siteConfig.blog.posts
    .filter((p) => p.id !== slug)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <StructuredData data={articleSchema} />
      {/* ── Hero Section ── */}
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
        <Image
          src={post.image.src}
          alt={post.image.alt}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-[#F8F9FA]" />
        
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#E0F7FA]/20 blur-3xl opacity-50" />
        <div className="pointer-events-none absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-[#4DB6AC]/20 blur-3xl opacity-50" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-4 text-center">
            <FadeUp>
              <Link
                href="/blog"
                className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Insights
              </Link>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
                {post.title}
              </h1>
            </FadeUp>
            <FadeUp delay={0.2} className="mt-10 flex flex-wrap justify-center gap-8 text-white/90">
              <div className="flex items-center gap-2 border-r border-white/20 pr-8 last:border-0">
                <Calendar className="h-5 w-5 text-[#4DB6AC]" />
                <span className="text-sm font-semibold tracking-wide uppercase">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 border-r border-white/20 pr-8 last:border-0">
                <Clock className="h-5 w-5 text-[#4DB6AC]" />
                <span className="text-sm font-semibold tracking-wide uppercase">{post.readTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#4DB6AC]" />
                <span className="text-sm font-semibold tracking-wide uppercase">By {post.author}</span>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Content Section ── */}
      <section className="container mx-auto max-w-4xl px-4 -mt-20 relative z-10 pb-24">
        <FadeUp delay={0.3}>
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-[#006064]/5 sm:p-16 border border-[#CFD8DC]/50">
            <article className="mx-auto">
              <div className="mb-16 text-2xl italic leading-relaxed text-[#616161] border-l-4 border-[#006064] pl-8 font-medium">
                {(post as any).excerpt}
              </div>
              
              <div className="space-y-8 text-lg leading-[1.8] text-[#374151]">
                {'content' in post ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: (post as any).content }} 
                    className="[&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-[#004D40] [&>h3]:mt-10 [&>h3]:mb-4 [&>h3]:text-2xl [&>h3]:font-bold [&>h3]:text-[#006064] [&>p]:mb-6 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-6 [&>li]:mb-2 [&>strong]:text-[#004D40]" 
                  />
                ) : (
                  <div className="space-y-6">
                    <p>
                      This is a placeholder for the full blog content of <strong>{(post as any).title}</strong>. 
                      In a real-world scenario, this content would be fetched from a headless CMS, 
                      Markdown files, or a dedicated database.
                    </p>
                    <p>
                      Ahmedabad is witnessing a significant shift in work culture, and SSPACIA 
                      is proud to be at the heart of this transformation. Our mission is to 
                      provide not just a place to work, but a community to grow with.
                    </p>
                    <h3>Continuing the Conversation</h3>
                    <p>
                      Stay tuned for more updates, tips, and stories from our vibrant coworking 
                      hubs at CG Road, Mercardo, and Premier House.
                    </p>
                  </div>
                )}
              </div>

              {/* Share Section */}
              <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#CFD8DC]/50 pt-10 sm:flex-row">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#006064]">Share article</span>
                  <div className="flex gap-4">
                    {['Facebook', 'LinkedIn', 'Twitter'].map((social) => (
                      <button 
                        key={social} 
                        className="text-sm font-semibold text-[#616161] transition-colors hover:text-[#006064]"
                      >
                        {social}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </FadeUp>

        {/* ── Related Articles ── */}
        <div className="mt-32 space-y-12">
          <div className="flex items-end justify-between">
            <div className="space-y-4">
              <SectionLabel>More Insights</SectionLabel>
              <h2 className="text-3xl font-bold tracking-tight text-[#004D40] sm:text-4xl">
                Related Articles
              </h2>
            </div>
            <Link 
              href="/blog" 
              className="group flex items-center gap-2 text-sm font-bold text-[#006064] transition-colors hover:text-[#004D40]"
            >
              View all
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0F7FA] transition-all group-hover:bg-[#006064] group-hover:text-white">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </div>
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {relatedPosts.map((rPost, i) => (
              <FadeUp key={rPost.id} delay={i * 0.1}>
                <Link
                  href={rPost.href}
                  className="group block space-y-4"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#CFD8DC]/50 shadow-sm transition-transform duration-500 group-hover:-translate-y-2">
                    <Image
                      src={rPost.image.src}
                      alt={rPost.image.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:opacity-40" />
                  </div>
                  <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#006064]">
                      <span>{rPost.date}</span>
                      <span className="h-1 w-1 rounded-full bg-[#CFD8DC]" />
                      <span>{rPost.readTime}</span>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-bold text-[#212121] transition-colors group-hover:text-[#006064]">
                      {rPost.title}
                    </h3>
                  </div>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* ── Call to Action ── */}
        <div className="mt-32 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#004D40] to-[#006064] px-6 py-20 text-center text-white shadow-2xl">
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl opacity-20" />
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#4DB6AC]/10 blur-3xl opacity-20" />
          
          <div className="relative z-10 space-y-8">
            <FadeUp>
              <SectionLabel className="mx-auto !bg-white/10 !text-[#4DB6AC] !border-white/20">
                Join Us
              </SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to elevate your working experience?
              </h2>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mx-auto max-w-2xl text-lg text-[#B2EBF2]">
                Join Ahmedabad's most dynamic community today.
              </p>
            </FadeUp>
            <FadeUp delay={0.3}>
              <Link
                href="/book-online"
                className="inline-flex h-16 items-center justify-center rounded-full bg-white px-12 text-lg font-bold text-[#004D40] shadow-xl transition-all hover:bg-[#B2EBF2] hover:scale-105 active:scale-95"
              >
                Book a Free Tour
              </Link>
            </FadeUp>
          </div>
        </div>
      </section>
    </main>
  );
}
