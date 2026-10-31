import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PostDocumentBody } from "@/components/blog/PostBody";
import { isSafeArticleHref, isSafePostMediaSource, type PostDocument } from "@/lib/postContent";
import { normalizeV1PublicUrl } from "@/lib/v1Path";

export function WritingBody({ document, content }: { document: PostDocument | null; content: string | null }) {
  if (document) return <PostDocumentBody document={document} />;
  if (!content) return <p>The published article has no body text.</p>;
  return <div className="article-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={normalizeV1PublicUrl}
    components={{
      a: ({ href, children }) => href && isSafeArticleHref(href)
        ? <a href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
      img: ({ src, alt }) => typeof src === "string" && isSafePostMediaSource(src)
        // CMS images may have different intrinsic dimensions and remote origins.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={normalizeV1PublicUrl(src)} alt={alt ?? ""} loading="lazy" decoding="async" />
        : <span>{alt}</span>,
    }}>{content}</ReactMarkdown></div>;
}
