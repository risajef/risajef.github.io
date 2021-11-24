import os
import subprocess as sub

ls = os.listdir(os.getcwd())
htmlfiles = [f for f in ls if f.endswith(".html") and f != "404.html" and f != "total.html"]
filenames = [f[:-5] for f in htmlfiles]

out_text = "digraph Dependencies {\n"
structure_text = out_text

for htmlfile in htmlfiles:
    filename = htmlfile[:-5]
    print(filename, htmlfile)
    dependencies = sub.run(["grep", "-rl", "class=\\\"dependency\\\".*" + filename], stdout=sub.PIPE).stdout.decode('utf_8').split("\n")
    print(dependencies)
    dependencies = [f for f in dependencies if f.endswith(".html") and not f.startswith(".") and not f == "404.html" and not f == "total.html"]
    print(dependencies)
    dependencies = ["einleitung.html" if f == "index_raw" else f for f in dependencies]
    print(dependencies)
    continues = sub.run(["grep", "-rl", "class=\\\"continue\\\".*" + filename], stdout=sub.PIPE).stdout.decode('utf_8').split("\n")
    continues = [f for f in continues if f.endswith(".html") and not f.startswith(".") and not f == "404.html"]
    continues = ["einleitung.html" if f == "index_raw" else f for f in continues]

    if filename == "index":
        filename = "einleitung"

    if len(continues) == 0 and len(dependencies) == 0:
        print(filename)
        out_text += "\t\"" + filename + "\";\n"

    for dependency in dependencies:
        out_text += "\t\"" + filename + "\" -> \"" + dependency[:-5] + "\";\n"
        structure_text += "\t\"" + filename + "\" -> \"" + dependency[:-5] + "\";\n"

    for cont in continues:
        out_text += "\t\"" + cont[:-5] + "\" -> \"" + filename + "\";\n"
        structure_text += "\t\"" + filename + "\" -> \"" + cont[:-5] + "\";\n"

out_text += "}"
structure_text += "}"

graph = open("graph.dot", 'w')
graph.write(out_text)
graph.close()

sub.run(["dot", "-Tpng", "-O", "graph.dot"])

graph = open("structure.dot", 'w')
graph.write(structure_text)
graph.close()

sub.run(["dot", "-Tpng", "-O", "structure.dot"])




