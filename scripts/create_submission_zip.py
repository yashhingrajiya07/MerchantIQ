import os
import sys
import zipfile

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_ZIP = os.path.join(REPO_ROOT, 'merchantiq-submission.zip')

FORBIDDEN_DIRS = {'node_modules', 'dist', 'coverage', '.git', '.vite', '_staging_submission'}
FORBIDDEN_EXTS = {'.db', '.zip', '.log', '.tmp', '.webm', '.mp4'}

def should_exclude(rel_path):
    parts = rel_path.replace('\\', '/').split('/')
    for part in parts:
        if part in FORBIDDEN_DIRS:
            return True
    filename = parts[-1]
    if filename == '.env':
        return True
    if '.db' in filename:
        return True
    for ext in FORBIDDEN_EXTS:
        if filename.endswith(ext):
            return True
    return False

def create_archive():
    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)
        print(f"Removed existing archive: {OUTPUT_ZIP}")

    files_to_pack = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # Prune forbidden directories from walk in-place
        dirs[:] = [d for d in dirs if d not in FORBIDDEN_DIRS]
        
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, REPO_ROOT)
            
            if should_exclude(rel_path):
                continue
                
            # STRICT REQUIREMENT: ZIP entries must use forward slash '/'
            forward_slash_arcname = rel_path.replace('\\', '/')
            files_to_pack.append((full_path, forward_slash_arcname))

    files_to_pack.sort(key=lambda x: x[1])

    print(f"Packing {len(files_to_pack)} clean source files into {OUTPUT_ZIP}...")
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for full_path, arcname in files_to_pack:
            # zipfile writes arcname exactly as provided; forward slashes are strictly preserved
            zf.write(full_path, arcname)

    print(f"Archive successfully created: {OUTPUT_ZIP}")

    # Programmatic verification
    print("\n--- PROGRAMMATIC ARCHIVE INSPECTION ---")
    with zipfile.ZipFile(OUTPUT_ZIP, 'r') as zf:
        infolist = zf.infolist()
        print(f"Total entries in ZIP: {len(infolist)}")
        
        backslash_entries = [i.filename for i in infolist if '\\' in i.filename]
        if backslash_entries:
            print(f"ERROR: Found entries with backslashes: {backslash_entries}")
            sys.exit(1)
        else:
            print("SUCCESS: 100% of entries use forward-slash '/' path separator!")

        forbidden_found = []
        for i in infolist:
            fn = i.filename
            if 'node_modules' in fn or 'dist/' in fn or fn == '.env' or fn.endswith('.db') or fn.endswith('.zip') or 'coverage' in fn:
                forbidden_found.append(fn)

        if forbidden_found:
            print(f"ERROR: Forbidden files found: {forbidden_found}")
            sys.exit(1)
        else:
            print("SUCCESS: Zero forbidden files (node_modules, dist, .env, db, zip, coverage) found!")

        filenames = [i.filename for i in infolist]
        required = [
            'package.json',
            'package-lock.json',
            '.env.example',
            'README.md',
            'tsconfig.json',
            'apps/api/src/server.ts',
            'apps/web/src/App.tsx',
            'packages/simulator/src/engine.ts',
            'tests/e2e.test.ts',
            'scripts/seed_demo_data.ts'
        ]
        for req in required:
            if req in filenames:
                print(f"Verified required file: {req}")
            else:
                print(f"ERROR: Missing required file: {req}")
                sys.exit(1)

    print("\nALL ARCHIVE CRITERIA VERIFIED SUCCESSFULLY.")

if __name__ == '__main__':
    create_archive()
