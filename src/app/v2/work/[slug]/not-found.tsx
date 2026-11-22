import Link from "next/link";
export default function ProjectNotFound() {
  return (
    <div className="v2-container v2-empty">
      <h1>Project not found</h1>
      <p>
        The project may have moved. You can find the available work in the
        library.
      </p>
      <Link className="v2-button" href="/v2/work">
        All projects
      </Link>
    </div>
  );
}
