/**
 * Substitutes environment variables in a string.
 * Supports $VAR and ${VAR} syntax.
 * If a variable is not found in process.env, it is replaced with an empty string.
 */
export function substituteEnv(text: string): string {
  return text.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, g1, g2) => {
    const varName = g1 || g2;
    return process.env[varName] || '';
  });
}

/**
 * Recursively substitutes environment variables in an object or array.
 */
export function substituteEnvDeep<T>(obj: T): T {
  if (typeof obj === 'string') {
    return substituteEnv(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteEnvDeep) as unknown as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const key in obj) {
      result[key] = substituteEnvDeep((obj as any)[key]);
    }
    return result as T;
  }
  return obj;
}

/**
 * Checks if an origin is local (localhost or 127.0.0.1).
 * Used to prevent CSRF from malicious websites while allowing direct CLI access (no origin).
 */
export function isLocalOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === 'null') return false; // Sandbox
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    
    // Check loopback addresses (IPv4, IPv6, and localhost)
    return (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('127.') || // Any 127.0.0.0/8
      hostname === '::1' || 
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
