import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getPostHeadings,
  isSafeArticleHref,
  type PostDocument,
  type PostMark,
  type PostNode,
} from "@/lib/postContent";

function markedText(text: ReactNode, marks: PostMark[] | undefined): ReactNode {
  return (marks ?? []).reduce<ReactNode>((children, mark) => {
    if (mark.type === "bold") return <strong>{children}</strong>;
    if (mark.type === "italic") return <em>{children}</em>;
    if (mark.type === "strike") return <s>{children}</s>;
    if (mark.type === "code") return <code>{children}</code>;
    const href = mark.attrs?.href;
    return href && isSafeArticleHref(href)
      ? <a href={href} target={href.startsWith("/") || href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">{children}</a>
      : children;
  }, text);
}

export function PostDocumentBody({ document }: { document: PostDocument }) {
  const headings = getPostHeadings(document);
  let headingIndex = 0;

  const renderNode = (node: PostNode, key: string): ReactNode => {
    const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
    if (node.type === "text") return <span key={key}>{markedText(node.text ?? "", node.marks)}</span>;
    if (node.type === "hardBreak") return <br key={key} />;
    if (node.type === "paragraph") return <p key={key}>{children}</p>;
    if (node.type === "heading") {
      const heading = headings[headingIndex++];
      const level = Number(node.attrs?.level);
      if (level === 4) return <h4 id={heading?.id} key={key}>{children}</h4>;
      if (level === 3) return <h3 id={heading?.id} key={key}>{children}</h3>;
      return <h2 id={heading?.id} key={key}>{children}</h2>;
    }
    if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
    if (node.type === "orderedList") return <ol start={Number(node.attrs?.start) || 1} key={key}>{children}</ol>;
    if (node.type === "listItem") return <li key={key}>{children}</li>;
    if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
    if (node.type === "horizontalRule") return <hr key={key} />;
    if (node.type === "codeBlock") {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      return <pre key={key}><code className={language ? `language-${language}` : undefined}>{children}</code></pre>;
    }
    if (node.type === "image") {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "");
      const caption = String(node.attrs?.caption ?? "");
      return (
        <figure key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    return null;
  };

  return <div className="article-prose">{document.content?.map((node, index) => renderNode(node, `node-${index}`))}</div>;
}

export function LegacyPostBody({ content }: { content: string }) {
  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => href && isSafeArticleHref(href)
            ? <a href={href} target={href.startsWith("/") || href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">{children}</a>
            : <span>{children}</span>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src ?? ""} alt={alt ?? ""} loading="lazy" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
