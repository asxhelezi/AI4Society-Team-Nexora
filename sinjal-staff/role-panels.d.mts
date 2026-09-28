export const rolePanels: Record<string, { source: string; role: string }>;
export function panelBody(panel: string, extension: string, body: Buffer): Buffer;
export function copyRolePanels(root: string, target: string): void;
