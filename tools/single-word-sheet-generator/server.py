#!/usr/bin/env python3
"""
Serves the single-word sheet UI and looks up word pictures under word-images/
(same stem matching as tools/gather_word_images.py).
"""

from __future__ import annotations

import errno
import io
import json
import mimetypes
import os
import re
import subprocess
import sys
import threading
from collections import defaultdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_WORD_IMAGES = _REPO_ROOT / "word-images"
LIBRARY_FOLDER = "_library"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def stem_key(raw: str) -> str:
    """Normalize a word or filename to the same stem key used for image lookup."""
    s = raw.strip()
    return re.sub(r"\.(png|jpe?g|webp|gif)$", "", s, flags=re.I).lower()


def is_under(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def index_images(root: Path) -> dict[str, list[Path]]:
    by_stem: dict[str, list[Path]] = defaultdict(list)
    root = root.resolve()
    if not root.is_dir():
        return {}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        stem = p.stem.lower()
        by_stem[stem].append(p)
    return by_stem


def pick_match(paths: list[Path]) -> Path:
    if len(paths) == 1:
        return paths[0]
    return sorted(paths, key=lambda x: (len(str(x)), str(x)))[0]


def list_picture_subfolders(root: Path) -> list[str]:
    """Immediate child folders of word-images (minimal pair sets, etc.)."""
    root = root.resolve()
    if not root.is_dir():
        return []
    names: list[str] = []
    for p in root.iterdir():
        if p.is_dir() and not p.name.startswith("."):
            names.append(p.name)
    names.sort(key=lambda s: s.lower())
    return names


def resolve_scope_folder(root: Path, scope: str | None) -> Path | None:
    """
    scope empty / None → entire word-images tree.
    Otherwise scope must be the exact name of a direct child folder of root.
    """
    root = root.resolve()
    if not scope or not str(scope).strip():
        return root
    sub = (root / str(scope).strip()).resolve()
    if not sub.is_dir():
        return None
    if sub.parent.resolve() != root:
        return None
    return sub


def paths_in_scope(paths: list[Path], scope_root: Path) -> list[Path]:
    return [p for p in paths if is_under(p, scope_root)]


def scope_stats(by_stem: dict[str, list[Path]], scope_root: Path) -> tuple[int, int]:
    file_count = 0
    stem_count = 0
    for paths in by_stem.values():
        scoped = paths_in_scope(paths, scope_root)
        if scoped:
            stem_count += 1
            file_count += len(scoped)
    return file_count, stem_count


def library_folder(root: Path) -> Path | None:
    lib = (root / LIBRARY_FOLDER).resolve()
    return lib if lib.is_dir() else None


def find_image_matches(
    by_stem: dict[str, list[Path]],
    key: str,
    search_root: Path,
    root_resolved: Path,
) -> tuple[list[Path], bool]:
    """Match paths for a word stem under search_root; fall back to _library when needed."""
    all_matches = [p for p in by_stem.get(key, []) if p.is_file() and is_under(p, root_resolved)]
    matches = paths_in_scope(all_matches, search_root)
    if matches:
        return matches, False
    if search_root.resolve() == root_resolved.resolve():
        return [], False
    lib = library_folder(root_resolved)
    if lib is None or search_root.resolve() == lib.resolve():
        return [], False
    lib_matches = paths_in_scope(all_matches, lib)
    if lib_matches:
        return lib_matches, True
    return [], False


def make_handler(word_images_root: Path):
    root_resolved = word_images_root.resolve()
    index_lock = threading.Lock()
    by_stem: dict[str, list[Path]] = index_images(root_resolved)

    resize_cache: dict[tuple[str, float, int], tuple[bytes, str]] = {}
    resize_cache_lock = threading.Lock()

    def refresh_index() -> None:
        nonlocal by_stem
        new_index = index_images(root_resolved)
        with index_lock:
            by_stem = new_index

    def resize_image_bytes(file_path: Path, max_w: int) -> tuple[bytes, str] | None:
        """Return (bytes, content_type) resized so max(width, height) <= max_w.

        Caches results in memory keyed by (path, mtime, max_w). Returns None if
        Pillow is unavailable or the file can't be opened as an image; callers
        should fall back to serving the original bytes.
        """
        if not PIL_OK:
            return None
        try:
            mtime = file_path.stat().st_mtime
        except OSError:
            return None
        cache_key = (str(file_path), mtime, max_w)
        with resize_cache_lock:
            cached = resize_cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            with Image.open(file_path) as im:
                im.load()
                fmt = (im.format or "").upper()
                # Preserve transparency for PNG; convert palette images so resize is clean.
                if fmt == "PNG":
                    if im.mode not in ("RGBA", "LA"):
                        im = im.convert("RGBA")
                    out_format = "PNG"
                    out_ctype = "image/png"
                    save_kwargs: dict = {"optimize": True}
                elif fmt in ("JPEG", "JPG"):
                    if im.mode != "RGB":
                        im = im.convert("RGB")
                    out_format = "JPEG"
                    out_ctype = "image/jpeg"
                    save_kwargs = {"quality": 85, "optimize": True, "progressive": True}
                elif fmt == "WEBP":
                    out_format = "WEBP"
                    out_ctype = "image/webp"
                    save_kwargs = {"quality": 85, "method": 6}
                elif fmt == "GIF":
                    out_format = "GIF"
                    out_ctype = "image/gif"
                    save_kwargs = {}
                else:
                    if im.mode not in ("RGB", "RGBA"):
                        im = im.convert("RGBA")
                    out_format = "PNG"
                    out_ctype = "image/png"
                    save_kwargs = {"optimize": True}
                # thumbnail() preserves aspect ratio and never upscales smaller sources.
                im.thumbnail((max_w, max_w), Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, format=out_format, **save_kwargs)
                data = buf.getvalue()
        except (OSError, ValueError, Image.UnidentifiedImageError):
            return None
        with resize_cache_lock:
            resize_cache[cache_key] = (data, out_ctype)
        return data, out_ctype

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, fmt: str, *args) -> None:
            sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            if path == "/" or path == "/index.html":
                self._serve_file(Path(__file__).parent / "index.html", "text/html; charset=utf-8")
                return

            if path == "/api/refresh":
                refresh_index()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"{}")
                return

            if path == "/api/folders":
                names = list_picture_subfolders(root_resolved)
                body = json.dumps({"root": str(root_resolved), "folders": names}, ensure_ascii=False).encode(
                    "utf-8"
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if path == "/api/status":
                scope = (query.get("scope") or [""])[0]
                scope_root = resolve_scope_folder(root_resolved, scope)
                with index_lock:
                    if scope_root is None:
                        n, stems = 0, 0
                        bad_scope = True
                    elif scope_root == root_resolved:
                        n = sum(len(v) for v in by_stem.values())
                        stems = len(by_stem)
                        bad_scope = False
                    else:
                        n, stems = scope_stats(by_stem, scope_root)
                        bad_scope = False
                body = json.dumps(
                    {
                        "root": str(root_resolved),
                        "indexed_files": n,
                        "unique_stems": stems,
                        "scope": scope.strip() if scope else "",
                        "scope_ok": not bad_scope,
                    },
                    ensure_ascii=False,
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if path == "/api/where":
                name = (query.get("name") or [""])[0]
                scope = (query.get("scope") or [""])[0]
                key = stem_key(name)
                scope_root = resolve_scope_folder(root_resolved, scope)
                search_as_root = scope_root if scope_root is not None else root_resolved
                scope_stale = bool(scope and str(scope).strip() and scope_root is None)
                with index_lock:
                    all_paths = [
                        p
                        for p in by_stem.get(key, [])
                        if p.is_file() and is_under(p, root_resolved)
                    ]
                folders = sorted({p.parent.name for p in all_paths})
                if not all_paths:
                    payload = {"word": key, "nowhere": True}
                elif scope_stale:
                    payload = {
                        "word": key,
                        "nowhere": False,
                        "folders": folders,
                        "in_selected_folder": True,
                        "stale_scope": scope.strip(),
                    }
                elif search_as_root == root_resolved:
                    payload = {"word": key, "nowhere": False, "folders": folders, "in_selected_folder": True}
                else:
                    in_scope = paths_in_scope(all_paths, search_as_root)
                    payload = {
                        "word": key,
                        "nowhere": False,
                        "folders": folders,
                        "in_selected_folder": bool(in_scope),
                        "selected_scope": scope.strip() if scope else "",
                    }
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if path.startswith("/image/"):
                raw = path[len("/image/") :]
                word = unquote(raw).strip()
                scope = (query.get("scope") or [""])[0]
                scope_root = resolve_scope_folder(root_resolved, scope)
                # Unknown scope (e.g. stale browser menu choice) → search whole library.
                search_root = scope_root if scope_root is not None else root_resolved
                key = stem_key(word)
                with index_lock:
                    matches, _from_library = find_image_matches(
                        by_stem, key, search_root, root_resolved
                    )
                if not matches:
                    self.send_error(404, f"No picture for {key!r}")
                    return
                file_path = pick_match(matches)
                if not file_path.is_file() or not is_under(file_path, root_resolved):
                    self.send_error(404, "Not found")
                    return
                ctype, _ = mimetypes.guess_type(str(file_path))
                if not ctype:
                    ctype = "application/octet-stream"
                # Optional ?w=<max-dimension> shrinks the served image so the
                # browser embeds a small copy when saving as PDF.
                data: bytes | None = None
                raw_w = (query.get("w") or [""])[0]
                try:
                    max_w = int(raw_w)
                except (TypeError, ValueError):
                    max_w = 0
                if max_w >= 50:
                    resized = resize_image_bytes(file_path, max_w)
                    if resized is not None:
                        data, ctype = resized
                if data is None:
                    data = file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "private, max-age=60")
                self.end_headers()
                self.wfile.write(data)
                return

            self.send_error(404, "Not found")

        def _serve_file(self, file_path: Path, content_type: str) -> None:
            if not file_path.is_file():
                self.send_error(404, "Not found")
                return
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    return Handler


def main() -> int:
    raw = os.environ.get("WORD_IMAGES_ROOT", str(DEFAULT_WORD_IMAGES))
    word_root = Path(raw).expanduser().resolve()
    if not word_root.is_dir():
        print(f"error: word-images folder not found:\n  {word_root}", file=sys.stderr)
        print("Set WORD_IMAGES_ROOT to your word-images path and try again.", file=sys.stderr)
        return 1

    host = os.environ.get("SINGLE_WORD_SHEET_HOST", "127.0.0.1")
    preferred = int(os.environ.get("SINGLE_WORD_SHEET_PORT", "8775"))

    handler = make_handler(word_root)
    httpd = None
    port = preferred
    for candidate in range(preferred, preferred + 40):
        try:
            httpd = ThreadingHTTPServer((host, candidate), handler)
            port = candidate
            break
        except OSError as e:
            if e.errno != errno.EADDRINUSE:
                raise
    if httpd is None:
        print(
            f"error: could not bind to a port ({preferred}–{preferred + 39} are all in use). "
            "Quit other Single-Word Sheet Generator windows or run: lsof -i TCP:{preferred}",
            file=sys.stderr,
        )
        return 1

    url = f"http://{host}:{port}/"
    print("Single-word sheet generator")
    print(f"  Pictures: {word_root}")
    if port != preferred:
        print(f"  Note:     port {preferred} was busy; using {port} instead")
    print(f"  Open:     {url}")
    print("  Press Ctrl+C to stop.")

    def open_browser() -> None:
        if os.environ.get("SINGLE_WORD_SHEET_NO_OPEN") == "1":
            return
        try:
            if sys.platform == "darwin":
                subprocess.Popen(["open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                import webbrowser

                webbrowser.open(url)
        except OSError:
            pass

    threading.Timer(0.35, open_browser).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
