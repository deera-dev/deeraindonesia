import { useEffect } from "react";

interface CreateSpec {
  tag: string;
  attrs: Record<string, string>;
}

function setMeta(selector: string, attr: string, value: string, create?: CreateSpec): () => void {
  let el = document.head.querySelector(selector);
  if (!el && create) {
    el = document.createElement(create.tag);
    Object.entries(create.attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (!el) return () => {};
  const prev = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => (prev === null ? el!.removeAttribute(attr) : el!.setAttribute(attr, prev));
}

export interface DocumentMetaInput {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
}

export default function useDocumentMeta({
  title,
  description,
  canonical,
  image,
  jsonLd,
}: DocumentMetaInput): void {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    if (!title) return undefined;
    const undo: (() => void)[] = [];
    const prevTitle = document.title;
    document.title = title;
    undo.push(() => (document.title = prevTitle));
    if (description) {
      undo.push(setMeta('meta[name="description"]', "content", description));
      undo.push(setMeta('meta[property="og:description"]', "content", description));
    }
    undo.push(setMeta('meta[property="og:title"]', "content", title));
    if (canonical) {
      undo.push(setMeta('link[rel="canonical"]', "href", canonical));
      undo.push(setMeta('meta[property="og:url"]', "content", canonical));
    }
    if (image) undo.push(setMeta('meta[property="og:image"]', "content", image));
    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.pageMeta = "1";
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => {
      undo.reverse().forEach((fn) => fn());
      script?.remove();
    };
  }, [title, description, canonical, image, ld]);
}
