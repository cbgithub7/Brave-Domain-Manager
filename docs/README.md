# Brave Domain Manager Documentation

- [1. Introduction](#1-introduction)
- [2. Installation](#2-installation)
- [3. Getting Started](#3-getting-started)
- [4. Managing Domain Entries](#4-managing-domain-entries)
- [5. Undo & Redo](#5-undo--redo)
- [6. Backup & Restore](#6-backup--restore)
- [7. Settings](#7-settings)
- [8. Troubleshooting](#8-troubleshooting)
- [9. License](#9-license)
- [10. Additional Resources](#10-additional-resources)

## 1. Introduction

**Brave Domain Manager** is a Windows desktop app for managing Brave browser's
domain blocklist policy directly in the Windows registry, without hand-editing
`regedit`. It's built with Electron, React, and TypeScript.

### Purpose

Brave supports blocking specific domains via a machine-wide policy stored in
the registry (`HKLM\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist`), but
Brave itself doesn't provide a UI for managing that list. This app fills that
gap: add, remove, search, undo/redo, and back up/restore blocked domains
through a normal desktop interface.

### Why manage domains this way

- **Content filtering** — block specific sites at the browser-policy level,
  independent of any single profile or extension.
- **Bulk management** — import or export whole lists of domains at once
  instead of one at a time.
- **Safety net** — every change is undoable, and you can export a snapshot of
  your blocklist to restore later if something goes wrong.

## 2. Installation

### Download

Get the latest installer from the
[Releases page](https://github.com/cbgithub7/Brave-Domain-Manager/releases/latest):
`brave-domain-manager-<version>-setup.exe` (Windows, 64-bit).

### Install

1. Run the downloaded `.exe`.
2. Windows SmartScreen may warn that the app is unrecognized, since the build
   isn't code-signed (no publisher certificate). Choose **More info → Run
   anyway** to proceed.
3. Follow the installer prompts — you can choose the install directory, and a
   shortcut is added to the Start Menu.

### Prerequisites

- Windows 10 or 11 (64-bit)
- [Brave browser](https://brave.com/) installed (the app manages Brave's
  policy settings; Brave doesn't need to be running)

### Building from source

Developers can build the app directly instead of using a pre-built installer.
See the [main repository README](https://github.com/cbgithub7/Brave-Domain-Manager#building-from-source)
for build instructions.

## 3. Getting Started

Launch **Brave Domain Manager** from the Start Menu. The app opens directly to
the **Domain Management** tab, showing your currently blocked domains.

You do not need to run the app as Administrator. It starts normally as a
regular user; Windows will only prompt for elevation (UAC) at the moment you
actually add or remove a domain, since writing to the registry is the only
operation that needs admin rights. Just reading the current list, searching,
or browsing Settings never requires elevation.

## 4. Managing Domain Entries

### Adding a single domain

1. Type a domain into the input field at the top of the Domain Management tab
   (format: `[subdomain.]domain.tld`, e.g. `example.com` or `sub.example.com`).
2. Click **Add domain** (or press Enter).
3. Approve the UAC prompt. The domain is written to the registry and appears
   in the list.

### Adding domains from a file

1. Under "Add from file," click **Browse…**.
2. Choose a `.txt` (one domain per line), `.csv` (one domain per row, first
   column used), or `.json` file (a JSON array of domain strings).
3. Each entry is validated and shown in a staged list before anything is
   written — invalid entries and domains already on your blocklist are
   flagged with a reason and automatically skipped.
4. Click **Add N valid domain(s)** to commit the batch. This triggers exactly
   one UAC prompt for the whole batch, not one per domain.

### Removing domains

- Click **Remove** on a single row, or
- Check multiple boxes and click **Delete selected** to remove several at once.

### Searching

The "Search blocked domains…" field does fuzzy matching, so minor typos or
partial names still find the right entry without needing an exact match.

## 5. Undo & Redo

Every add or remove is undoable:

- Use the **Undo**/**Redo** buttons in the toolbar, which show what action
  they'd affect.
- Or use the keyboard shortcuts **Ctrl+Z** / **Ctrl+Y** (**Ctrl+Shift+Z** also
  works for redo). These are ignored while a text field has focus, so they
  never interfere with normal text editing.

Undo/redo history is per-session — it resets when you close the app. If the
registry changes outside the app between an action and its undo (for
example, another instance of the app, or a manual `regedit` edit touching the
same entry), the app detects the conflict and refuses to overwrite it rather
than silently clobbering the unrelated change.

For anything you want to keep permanently, use Backup & Restore instead.

## 6. Backup & Restore

Located under "Backup & restore" on the Domain Management tab — a deliberate,
long-term snapshot mechanism, independent of Undo/Redo:

- **Export to file…** saves your current blocklist to a JSON file you choose.
- **Restore from file…** loads a previously exported (or hand-written) JSON
  snapshot in one of two modes:
  - **Merge** — adds the snapshot's domains to your current list; anything
    already blocked is skipped.
  - **Replace** — clears your current list first, then restores exactly what's
    in the snapshot.

## 7. Settings

- **Theme** — Light, Dark, or Follow system. Applies immediately.
- **Font scale** — 70%–140%, applied immediately across the whole app.
- **Logging** — disabled by default. When enabled, you choose which
  categories to record (registry access, user activity, configuration
  changes, audit, security, performance, startup/shutdown, success/error).
  Logs are written to your user data folder and rotate daily. A small
  indicator next to the tabs always shows whether logging is currently on.

## 8. Troubleshooting

#### "Windows protected your PC" (SmartScreen)

This is expected for an unsigned build — there's no publisher certificate.
Choose **More info → Run anyway**. If you'd rather verify the source first,
see [Building from source](#building-from-source) above.

#### A UAC prompt appears when I add or remove a domain

This is expected and by design — writing to the registry requires
administrator rights, so the app requests elevation only for that specific
action, not for the whole app. Declining the prompt cancels just that one
add/remove; nothing else in the app is affected.

#### My domain was rejected as invalid

Domains must match `[subdomain.]domain.tld` — for example `example.com` or
`mail.example.co.uk`. Leading `http://`, `https://`, and `www.` are stripped
automatically, and anything after a `/` (a path) is ignored, so pasting a full
URL still works as long as the underlying domain is valid.

#### Undo/redo says it can't complete an action

This means the registry changed outside the app since that action was
recorded (see [Undo & Redo](#5-undo--redo)) — the app is refusing to overwrite
data it didn't create, rather than failing silently. Check the current state
of the entry in question and adjust manually if needed.

#### The Documentation tab won't load

If you're offline, the embedded copy of this site can't load. The app shows a
retry option and a link to open this page in your regular browser instead.

## 9. License

Brave Domain Manager is licensed under the
[MIT License](https://github.com/cbgithub7/Brave-Domain-Manager/blob/main/LICENSE).

## 10. Additional Resources

- **GitHub Repository:** https://github.com/cbgithub7/Brave-Domain-Manager
- **Releases:** https://github.com/cbgithub7/Brave-Domain-Manager/releases
- **Issue Tracker:** https://github.com/cbgithub7/Brave-Domain-Manager/issues
