# -*- coding: utf-8 -*-
"""Render a docs/*.md file to an A4 PDF (headings, lists, tables, bold) with headless Chromium.

    python scripts/md_to_pdf.py docs/BOX_LEAGUE_HOW_IT_WORKS_07Sep2026.md docs/W7_Box_League_How_It_Works_v1.0_07Sep2026.pdf
"""
import asyncio, html, os, re, sys

def md_to_html(md):
    out, state = [], {"ul": False, "ol": False, "tbl": False}
    def close():
        for k, tag in (("ul", "</ul>"), ("ol", "</ol>"), ("tbl", "</table>")):
            if state[k]:
                out.append(tag); state[k] = False
    def inl(t):
        t = html.escape(t)
        return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    lines = md.splitlines(); i = 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("# "):
            close(); out.append(f"<h1>{inl(l[2:])}</h1>")
        elif l.startswith("## "):
            close(); out.append(f"<h2>{inl(l[3:])}</h2>")
        elif l.startswith("|"):
            if l.startswith("|---"):
                i += 1; continue
            cells = [c.strip() for c in l.strip("|").split("|")]
            if not state["tbl"]:
                close(); out.append("<table>"); state["tbl"] = True
                out.append("<tr>" + "".join(f"<th>{inl(c)}</th>" for c in cells) + "</tr>")
            else:
                out.append("<tr>" + "".join(f"<td>{inl(c)}</td>" for c in cells) + "</tr>")
        elif re.match(r"^\d+\. ", l):
            if not state["ol"]:
                close(); out.append("<ol>"); state["ol"] = True
            item = re.sub(r"^\d+\. ", "", l)
            while i + 1 < len(lines) and lines[i + 1].startswith("   "):
                i += 1; item += " " + lines[i].strip()
            out.append(f"<li>{inl(item)}</li>")
        elif l.startswith("- "):
            if not state["ul"]:
                close(); out.append("<ul>"); state["ul"] = True
            item = l[2:]
            while i + 1 < len(lines) and lines[i + 1].startswith("  ") and not lines[i + 1].startswith("- "):
                i += 1; item += " " + lines[i].strip()
            out.append(f"<li>{inl(item)}</li>")
        elif l.strip() == "":
            close()
        else:
            para = l
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r"^(#|\||- |\d+\. )", lines[i + 1]):
                i += 1; para += " " + lines[i].strip()
            close(); out.append(f"<p>{inl(para)}</p>")
        i += 1
    close()
    css = ("body{font-family:Georgia,serif;font-size:11.5pt;line-height:1.5;color:#16212B;max-width:720px;margin:0 auto}"
           "h1{font-family:Arial,sans-serif;font-size:20pt;border-bottom:2px solid #16212B;padding-bottom:6px}"
           "h2{font-family:Arial,sans-serif;font-size:13pt;color:#1C567F;margin-top:22px;text-transform:uppercase;letter-spacing:.04em}"
           "table{border-collapse:collapse;font-size:10.5pt;margin:8px 0}th,td{border:1px solid #C6CFD6;padding:4px 8px;text-align:left}"
           "th{background:#ECEFF2}li{margin:3px 0}")
    return f'<html><head><meta charset="utf-8"><style>{css}</style></head><body>' + "\n".join(out) + "</body></html>"

async def render(src, dst):
    from playwright.async_api import async_playwright
    tmp = os.path.splitext(dst)[0] + ".tmp.html"
    open(tmp, "w", encoding="utf-8").write(md_to_html(open(src, encoding="utf-8").read()))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto("file:///" + os.path.abspath(tmp).replace(os.sep, "/"))
        await pg.pdf(path=dst, format="A4", print_background=True,
                     margin={"top": "16mm", "bottom": "16mm", "left": "16mm", "right": "16mm"})
        await b.close()
    os.remove(tmp)

if __name__ == "__main__":
    asyncio.run(render(sys.argv[1], sys.argv[2]))
    print(sys.argv[2], os.path.getsize(sys.argv[2]), "bytes")
