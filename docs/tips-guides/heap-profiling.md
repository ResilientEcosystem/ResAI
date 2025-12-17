# Heap Profiling for Memory Leak Detection

This guide explains how to record and analyze heap profiles to identify memory leaks in your Next.js application.

## Recording a Heap Profile

### Option 1: Using npm scripts (Recommended)

#### For Build Process:
```bash
pnpm heap-profile:build
```

#### For Dev Server:
```bash
pnpm heap-profile:dev
```

### Option 2: Manual Command

#### For Build:
```bash
node --heap-prof node_modules/next/dist/bin/next build
```

#### For Dev Server:
```bash
node --heap-prof node_modules/next/dist/bin/next dev --turbopack
```

## How It Works

When you run the command with `--heap-prof` flag:
1. Node.js will start recording heap snapshots
2. The profile file will be created when the process exits
3. The file will be named `isolate-<thread_id>-<pid>-v8.log` (or `.heapprofile` in newer Node versions)

## Analyzing the Heap Profile

### Step 1: Stop the Process

For dev server, press `Ctrl+C` to stop it. This will generate the heap profile file.

For build, it will automatically complete and generate the profile.

### Step 2: Locate the Profile File

The heap profile file will be created in the current directory (project root). Look for files like:
- `isolate-*.heapprofile`
- `isolate-*-v8.log`

### Step 3: Open in Chrome DevTools

1. Open Chrome and navigate to `chrome://inspect`
2. Click "Open dedicated DevTools for Node"
3. Go to the **Memory** tab
4. Click **"Load"** button
5. Select your `.heapprofile` file
6. The heap profile will be visualized showing:
   - Memory usage by objects
   - Retainers (what's keeping objects in memory)
   - Allocation sites

### Step 4: Analyze the Results

Look for:
- **Large objects** that shouldn't be retained
- **Objects that should have been garbage collected** but are still referenced
- **Growing memory usage** in specific areas
- **Common patterns** like:
  - Event listeners not cleaned up
  - Closures holding references
  - Module-level caches growing unbounded

## Tips

1. **Take multiple snapshots** at different times to see memory growth
2. **Compare snapshots** to identify what's growing
3. **Look for your code** in the retainers to find the source of leaks
4. **Focus on large objects** - they're usually the main culprits

## Example: Finding a Memory Leak

If you see:
- `Set` or `Map` objects growing unbounded → Check for module-level caches
- Event listeners accumulating → Check for missing cleanup in `useEffect`
- WebGL contexts not released → Check for proper cleanup in canvas/WebGL code

## Cleanup

After analysis, you can delete the heap profile files:
```bash
rm isolate-*.heapprofile
rm isolate-*-v8.log
```

