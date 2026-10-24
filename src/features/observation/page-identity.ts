// The reader never sends URLs/query values to the model. These canonical
// identities bind browser observations and locally stored return links.
export function pageIdentity(url: URL): string {
  if (/\/mod\/assign\/view\.php$/.test(url.pathname)) {
    const ids = url.searchParams.getAll("id");
    if (ids.length === 1 && /^[1-9]\d{0,14}$/.test(ids[0]!))
      return `${url.pathname}?id=${ids[0]}`;
    throw new Error("An unambiguous numeric assignment ID is required.");
  }
  return url.pathname;
}
