from pathlib import Path

ROOTS = (Path('resources/js'), Path('.agents/skills'))
MARKERS = ('Ã', 'Â', 'Ä', 'Å', 'Æ', 'á»', 'áº', 'â€')


def reverse_once(text: str) -> str:
    raw = bytearray()
    for char in text:
        codepoint = ord(char)
        if codepoint <= 0xFF:
            raw.append(codepoint)
        else:
            try:
                raw.extend(char.encode('cp1252'))
            except UnicodeEncodeError:
                raw.extend(char.encode('utf-8'))
    return raw.decode('utf-8', errors='replace')


def repair(text: str) -> str:
    for _ in range(5):
        if not any(marker in text for marker in MARKERS):
            break
        candidate = reverse_once(text)
        if candidate == text:
            break
        text = candidate
    return text


for root in ROOTS:
    for path in root.rglob('*'):
        if path.suffix.lower() not in {'.ts', '.tsx', '.jsx', '.md', '.yaml', '.yml'}:
            continue
        original = path.read_text(encoding='utf-8-sig')
        updated = repair(original)
        if updated != original or path.read_bytes().startswith(b'\xef\xbb\xbf'):
            path.write_text(updated, encoding='utf-8', newline='\n')
