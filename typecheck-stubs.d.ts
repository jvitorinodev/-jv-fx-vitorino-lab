declare const process: { env: Record<string, string | undefined> };
declare namespace React {
  type ReactNode = any;
  type FormEvent<T = any> = any;
  type ChangeEvent<T = any> = any;
}
declare module "react" {
  export type ReactNode = any;
  export type FormEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  export function useTransition(): [boolean, (callback: () => void | Promise<void>) => void];
}
declare module "lucide-react";
declare module "next" { export type Metadata = any; }
declare module "next/cache" { export function revalidatePath(path: string): void; }
declare module "next/headers";
declare module "next/link" { const Link: any; export default Link; }
declare module "next/navigation" { export function redirect(path: string): never; export function notFound(): never; export function usePathname(): string; export function useRouter(): { refresh(): void; push(path: string): void; replace(path: string): void }; }
declare module "next/server" { export type NextRequest = any; export const NextResponse: any; }
declare module "@supabase/ssr";
declare module "server-only";
declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
  interface ElementChildrenAttribute { children: {}; }
  interface IntrinsicAttributes { key?: any; }
}
