import Link from "next/link";
export default function ProjectNotFound() {
  return (
    <div className="v2-container v2-empty">
      <span className="v2-eyebrow">404 / PROJECT NOT FOUND</span>
      <h1>This one isn’t in the collection.</h1>
      <p>
        The project may have moved. You can find the available work in the
        library.
      </p>
      <Link className="v2-button" href="/v2/work">
        Explore the work ↗
      </Link>
    </div>
  );
}
