# CRITICAL: File Saving Protocol

## After EVERY code change, Claude Code MUST:

1. **Save all files** - Use file creation/editing commands to write actual files
2. **Verify files exist** - Run `ls` to confirm files were created
3. **Show file contents** - Run `cat filename` to prove code was written
4. **Commit immediately**:
```bash
git add .
git commit -m "Descriptive message of what was added"
```
5. **Push to GitHub**:
```bash
git push origin main
```
6. **Verify on GitHub** - Confirm files appear in the repository

## Never Say "Done" Without:
- ✅ Files physically created and visible in `ls` output
- ✅ Git commit completed
- ✅ Push to GitHub successful
- ✅ File contents verified with `cat` or shown to user

## End Every Session With:
```bash
git status  # Show what's uncommitted
git add .
git commit -m "Session end: [summary]"
git push origin main
```
