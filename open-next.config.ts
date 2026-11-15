import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No ISR/`revalidate` is used in this app (all data routes are force-dynamic),
// so no incremental cache is configured. Add r2IncrementalCache here if that changes.
export default defineCloudflareConfig({});
