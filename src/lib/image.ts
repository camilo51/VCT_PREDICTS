/** Routes an external VLR/owcdn image through our own domain (see /api/img) so the browser never hits owcdn.net's cross-site block directly. */
export function proxiedLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}
