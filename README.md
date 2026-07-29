# Brave Domain Manager

A Windows desktop app for managing Brave browser's domain blocklist policy in the
Windows registry — add, remove, search, undo/redo, and back up/restore blocked
domains without hand-editing `regedit`.

Built with Electron, React, and TypeScript. (An earlier PyQt5/PowerShell version
existed prior to this rewrite; it's no longer part of this repo, but still
available in the git history if needed.)

Documentation site: https://cbgithub7.github.io/Brave-Domain-Manager/

## Download

Grab the latest installer from the
[Releases page](https://github.com/cbgithub7/Brave-Domain-Manager/releases/latest):

- **`brave-domain-manager-<version>-setup.exe`** — Windows installer (64-bit)

No release published yet, or want the latest unreleased changes? See
[Building from source](#building-from-source) below.

## Install

1. Run the downloaded `.exe`.
2. **Windows SmartScreen may warn that the app is unrecognized** — the build isn't
   code-signed (no publisher certificate). Click **More info → Run anyway** to
   proceed. If you'd rather verify the code yourself first, build from source
   instead.
3. Follow the installer prompts. You can choose the install directory; a shortcut
   is added to the Start Menu.
4. Launch **Brave Domain Manager** from the Start Menu.

You do **not** need to run the app as Administrator. It starts normally; Windows
will only prompt for elevation (UAC) at the moment you actually add or remove a
domain, since that's the only operation that needs admin rights to write to the
registry.

### Requirements

- Windows 10 or 11 (64-bit)
- [Brave browser](https://brave.com/) installed (the app manages Brave's policy
  settings; it doesn't require Brave to be running)

## Usage

### Domain Management

- **Add a domain** — type into the input field at the top and click **Add
  domain** (or press Enter). A UAC prompt appears once; approve it to write the
  domain to the registry.
- **Add domains from a file** — click **Browse…** under "Add from file" and pick
  a `.txt` (one domain per line), `.csv` (one domain per row), or `.json` (array
  of domain strings) file. Each entry is validated and shown in a staged list
  before you commit — invalid or already-blocked entries are flagged with a
  reason and skipped automatically. Click **Add N valid domain(s)** to commit.
- **Remove domains** — click **Remove** on a single row, or check multiple boxes
  and click **Delete selected**.
- **Search** — the "Search blocked domains…" field does fuzzy matching against
  the current list, so minor typos or partial names still find the right entry.

### Undo / Redo

Every add or remove is undoable. Use the **Undo**/**Redo** buttons in the
toolbar, or the keyboard shortcuts **Ctrl+Z** / **Ctrl+Y** (Ctrl+Shift+Z also
works for redo). Shortcuts are ignored while a text field has focus, so they
won't interfere with normal text editing. Undo/redo history is per-session (it
resets when you close the app) — for permanent snapshots, use Backup & Restore.

### Backup & Restore

Under "Backup & restore":

- **Export to file…** saves the current blocklist to a JSON file you choose —
  a deliberate snapshot you can keep long-term, independent of Undo/Redo.
- **Restore from file…** loads a previously exported (or hand-written) JSON
  snapshot, in one of two modes:
  - **Merge** — adds the snapshot's domains to your current list (duplicates
    are skipped).
  - **Replace** — clears your current list first, then restores exactly what's
    in the snapshot.

### Settings

- **Theme** — Light, Dark, or Follow system.
- **Font scale** — 70%–140%, applied live.
- **Logging** — disabled by default. Turn it on and pick which categories to
  record (registry access, user activity, audit, security, etc.). Logs are
  written to your user data folder and rotate daily. A small indicator next to
  the tabs always shows whether logging is currently on.

### Documentation tab

Embeds the [documentation site](https://cbgithub7.github.io/Brave-Domain-Manager/)
directly in the app. If it can't load (no internet connection), you'll see a
retry option and a link to open it in your regular browser instead.

## Building from source

Requires [Node.js](https://nodejs.org/) 20+ and npm.

```bash
git clone https://github.com/cbgithub7/Brave-Domain-Manager.git
cd Brave-Domain-Manager
npm install
```

**Run in development** (hot-reloading, unpackaged):

```bash
npm run dev
```

**Build an installer** (produces `release/brave-domain-manager-<version>-setup.exe`):

```bash
npm run build:win
```

**Other useful scripts:**

| Command | What it does |
|---|---|
| `npm run typecheck` | Type-check main, preload, and renderer |
| `npm run test` | Run the unit test suite (Vitest) |
| `npm run test:e2e` | Run the end-to-end suite (Playwright) — builds first, no admin rights needed |
| `npm run lint` | Lint the codebase |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
