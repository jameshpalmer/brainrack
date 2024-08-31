/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_REPLICACHE_LICENSE_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
