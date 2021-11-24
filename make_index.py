import os

ls = [f for f in os.listdir(os.getcwd()) if f.endswith('.html')]
ls = sorted(ls)

with open("index_raw", 'r') as f:
    text = f.read()

names = [filename.replace('_', ' ').replace('.html', '').title() for filename in ls]
links = [f'<li><a href="{n[0]}">{n[1]}</a></li>' for n in zip(ls, names)]
new_line = '\n'

with open("index.html", 'w') as f:
    f.write(text.replace("</body>", f"<ul>{new_line.join(links)}</ul></body>"))
