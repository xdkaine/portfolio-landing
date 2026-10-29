"use client";
import { useEffect, useState } from "react";
export function AdminActivity() {
  const [items, setItems] = useState<
    {
      id: string;
      actor: string;
      action: string;
      entity: string;
      summary: string;
      createdAt: string;
    }[]
  >([]);
  const [notice, setNotice] = useState("Loading activity…");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/v1/api/admin/activity", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setItems(await response.json());
        setNotice("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice("Activity could not be loaded. Refresh to retry.");
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="cms-panel">
      <div className="cms-panel-heading">
        <h2>Recent changes</h2>
        <p>Latest 50 workspace events, with administrator attribution.</p>
      </div>
      {notice && (
        <p role="status" className="cms-notice">
          {notice}
        </p>
      )}
      {!notice && !items.length && (
        <div className="cms-empty">
          <h3>No changes recorded yet</h3>
          <p>New CMS operations will appear here.</p>
        </div>
      )}
      <div className="cms-activity">
        {items.map((item) => (
          <div key={item.id}>
            <div>
              <strong>{item.actor}</strong>{" "}
              <span>
                {item.action} {item.entity}
              </span>
              <p>{item.summary}</p>
            </div>
            <time>{new Date(item.createdAt).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
}
