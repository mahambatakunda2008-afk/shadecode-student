declare module '@supabase/ssr' {
  export function createServerClient(
    url: string,
    key: string,
    options?: {
      cookies?: {
        get(name: string): string | undefined;
        setAll?(cookiesToSet: { name: string; value: string; options?: any }[]): void;
      };
    }
  ): any;
}
