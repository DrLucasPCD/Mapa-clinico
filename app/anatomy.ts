/** Namespaced atlas IDs, optionally restricted to a documented anatomical side. */
export function matchesStructure(nodeId: string, selection: string) {
  if (!selection) return false;
  const [base, side] = selection.split('@');
  return nodeId.includes(base) && (!side || nodeId.endsWith('-' + side));
}
