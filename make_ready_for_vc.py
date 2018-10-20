import os

files = os.listdir(os.getcwd())
files = [f for f in files if f.endswith('.html')]
bla = True
for f in files:
    text = ""
    with open(f, 'rw') as data:
        text = "\n".join(data.readlines())
        text = text.replace(".", ".\n")
    with open(f, 'w') as data:    
        data.write(text)
