import Link from "next/link";
export default function WritingNotFound() {
  return <div className="v2-container v2-empty"><h1>Article not found</h1>
    <p>This article is not available in the published library.</p><Link href="/v2/work">Back to library</Link></div>;
}
