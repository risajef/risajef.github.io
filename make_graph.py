import os
import subprocess as sub

ls = os.listdir(os.getcwd())
htmlfiles = [f for f in ls if f.endswith(".html") and f != "404.html"]
filenames = [f[:-5] for f in htmlfiles]

out_text = "digraph Dependencies {\n"

for htmlfile in htmlfiles:
    filename = htmlfile[:-5]
    dependencies = sub.run(["grep", "-rl", "class=\\\"dependency\\\".*" + htmlfile], stdout=sub.PIPE).stdout.decode('utf_8').split("\n")
    dependencies = [f for f in dependencies if f.endswith(".html") and not f.startswith(".") and not f == "404.html"]
    dependencies = ["einleitung.html" if f == "index.html" else f for f in dependencies]

    continues = sub.run(["grep", "-rl", "class=\\\"continue\\\".*" + htmlfile], stdout=sub.PIPE).stdout.decode('utf_8').split("\n")
    continues = [f for f in continues if f.endswith(".html") and not f.startswith(".") and not f == "404.html"]
    continues = ["einleitung.html" if f == "index.html" else f for f in continues]

    if filename == "index":
        filename = "einleitung"

    if len(continues) == 0 and len(dependencies) == 0:
        print(filename)
        out_text += "\t\"" + filename + "\";\n"

    for dependency in dependencies:
        out_text += "\t\"" + filename + "\" -> \"" + dependency[:-5] + "\";\n"

    for cont in continues:
        out_text += "\t\"" + cont[:-5] + "\" -> \"" + filename + "\";\n"

out_text += "}"

graph = open("graph.dot", 'w')
graph.write(out_text)
graph.close()

sub.run(["dot", "-Tpng", "-O", "graph.dot"])
